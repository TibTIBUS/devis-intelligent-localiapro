alter table public.quote_ai_actions drop constraint quote_ai_actions_action_type_check;
alter table public.quote_ai_actions add constraint quote_ai_actions_action_type_check
check (action_type in (
  'add_quote_line', 'update_quote_line', 'delete_quote_line',
  'set_discount', 'set_deposit', 'set_payment_terms', 'set_validity',
  'set_worksite_address', 'update_quote_note'
));

create function public.set_ai_quote_discount(
  p_organization_id uuid, p_quote_id uuid, p_discount_rate_basis_points integer
) returns table (action_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare v_before integer; v_action_id uuid;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_discount_rate_basis_points not between 0 and 10000 then raise exception using errcode = '22023', message = 'Invalid discount rate'; end if;
  select discount_rate_basis_points into v_before from public.quotes
  where organization_id = p_organization_id and id = p_quote_id and status = 'draft' for update;
  if not found then raise exception using errcode = 'P0002', message = 'Draft quote not found'; end if;
  update public.quotes set discount_rate_basis_points = p_discount_rate_basis_points
  where organization_id = p_organization_id and id = p_quote_id;
  insert into public.quote_ai_actions (organization_id, quote_id, action_type, payload)
  values (p_organization_id, p_quote_id, 'set_discount', jsonb_build_object('before', v_before, 'after', p_discount_rate_basis_points))
  returning id into v_action_id;
  return query select v_action_id;
end; $$;

create function public.set_ai_quote_deposit(
  p_organization_id uuid, p_quote_id uuid, p_deposit_rate_basis_points integer
) returns table (action_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare v_before integer; v_action_id uuid;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_deposit_rate_basis_points not between 0 and 10000 then raise exception using errcode = '22023', message = 'Invalid deposit rate'; end if;
  select deposit_rate_basis_points into v_before from public.quotes
  where organization_id = p_organization_id and id = p_quote_id and status = 'draft' for update;
  if not found then raise exception using errcode = 'P0002', message = 'Draft quote not found'; end if;
  update public.quotes set deposit_rate_basis_points = p_deposit_rate_basis_points
  where organization_id = p_organization_id and id = p_quote_id;
  insert into public.quote_ai_actions (organization_id, quote_id, action_type, payload)
  values (p_organization_id, p_quote_id, 'set_deposit', jsonb_build_object('before', v_before, 'after', p_deposit_rate_basis_points))
  returning id into v_action_id;
  return query select v_action_id;
end; $$;

revoke all on function public.set_ai_quote_discount(uuid, uuid, integer) from public, anon;
revoke all on function public.set_ai_quote_deposit(uuid, uuid, integer) from public, anon;
grant execute on function public.set_ai_quote_discount(uuid, uuid, integer) to authenticated;
grant execute on function public.set_ai_quote_deposit(uuid, uuid, integer) to authenticated;

create or replace function public.undo_last_ai_quote_action(p_organization_id uuid, p_quote_id uuid)
returns table (action_id uuid, action_type text, affected_line_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare
  v_action public.quote_ai_actions%rowtype;
  v_line public.quote_lines%rowtype;
  v_affected_line_id uuid;
  v_snapshot jsonb;
  v_current_text text;
  v_current_date date;
  v_current_uuid uuid;
  v_current_integer integer;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  perform 1 from public.quotes quote where quote.organization_id = p_organization_id and quote.id = p_quote_id and quote.status = 'draft' for update;
  if not found then raise exception using errcode = 'P0002', message = 'Draft quote not found'; end if;
  select action.* into v_action from public.quote_ai_actions action
  where action.organization_id = p_organization_id and action.quote_id = p_quote_id
    and action.actor_user_id = auth.uid() and action.undone_at is null
  order by action.created_at desc, action.id desc limit 1 for update;
  if not found then raise exception using errcode = 'P0002', message = 'No action to undo'; end if;

  if v_action.action_type = 'add_quote_line' then
    select line.* into v_line from public.quote_lines line
    where line.organization_id = p_organization_id and line.quote_id = p_quote_id and line.id = v_action.line_id for update;
    if not found
      or v_line.catalog_item_id is distinct from (v_action.payload ->> 'catalogItemId')::uuid
      or v_line.quantity_milliunits is distinct from (v_action.payload ->> 'quantityMilliunits')::bigint
      or v_line.unit_price_ht_cents is distinct from (v_action.payload ->> 'unitPriceHtCents')::bigint
      or v_line.vat_rate_basis_points is distinct from (v_action.payload ->> 'vatRateBasisPoints')::integer
    then raise exception using errcode = '40001', message = 'Quote line changed after AI action'; end if;
    delete from public.quote_lines line where line.id = v_action.line_id returning line.id into v_affected_line_id;
  elsif v_action.action_type = 'update_quote_line' then
    select line.* into v_line from public.quote_lines line
    where line.organization_id = p_organization_id and line.quote_id = p_quote_id and line.id = v_action.line_id for update;
    if not found
      or v_line.quantity_milliunits is distinct from (v_action.payload #>> '{after,quantityMilliunits}')::bigint
      or v_line.line_kind is distinct from (v_action.payload #>> '{after,lineKind}')
    then raise exception using errcode = '40001', message = 'Quote line changed after AI action'; end if;
    update public.quote_lines set quantity_milliunits = (v_action.payload #>> '{before,quantityMilliunits}')::bigint,
      line_kind = (v_action.payload #>> '{before,lineKind}')
    where id = v_action.line_id returning id into v_affected_line_id;
  elsif v_action.action_type = 'delete_quote_line' then
    v_snapshot := v_action.payload -> 'before';
    if v_snapshot is null or jsonb_typeof(v_snapshot) <> 'object' then raise exception using errcode = '22023', message = 'Invalid action snapshot'; end if;
    insert into public.quote_lines (id, organization_id, quote_id, section_id, created_at, updated_at, catalog_item_id, label, description, line_kind, unit, quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points, position)
    values ((v_snapshot ->> 'id')::uuid, p_organization_id, p_quote_id, (v_snapshot ->> 'section_id')::uuid, (v_snapshot ->> 'created_at')::timestamptz, (v_snapshot ->> 'updated_at')::timestamptz, (v_snapshot ->> 'catalog_item_id')::uuid, v_snapshot ->> 'label', v_snapshot ->> 'description', v_snapshot ->> 'line_kind', v_snapshot ->> 'unit', (v_snapshot ->> 'quantity_milliunits')::bigint, (v_snapshot ->> 'unit_price_ht_cents')::bigint, (v_snapshot ->> 'vat_rate_basis_points')::integer, (v_snapshot ->> 'position')::bigint)
    returning id into v_affected_line_id;
  elsif v_action.action_type = 'set_discount' then
    select discount_rate_basis_points into v_current_integer from public.quotes where organization_id = p_organization_id and id = p_quote_id;
    if v_current_integer is distinct from (v_action.payload ->> 'after')::integer then raise exception using errcode = '40001', message = 'Quote changed after AI action'; end if;
    update public.quotes set discount_rate_basis_points = (v_action.payload ->> 'before')::integer where organization_id = p_organization_id and id = p_quote_id;
  elsif v_action.action_type = 'set_deposit' then
    select deposit_rate_basis_points into v_current_integer from public.quotes where organization_id = p_organization_id and id = p_quote_id;
    if v_current_integer is distinct from (v_action.payload ->> 'after')::integer then raise exception using errcode = '40001', message = 'Quote changed after AI action'; end if;
    update public.quotes set deposit_rate_basis_points = (v_action.payload ->> 'before')::integer where organization_id = p_organization_id and id = p_quote_id;
  elsif v_action.action_type = 'set_payment_terms' then
    select payment_terms into v_current_text from public.quotes where organization_id = p_organization_id and id = p_quote_id;
    if v_current_text is distinct from (v_action.payload ->> 'after') then raise exception using errcode = '40001', message = 'Quote changed after AI action'; end if;
    update public.quotes set payment_terms = v_action.payload ->> 'before' where organization_id = p_organization_id and id = p_quote_id;
  elsif v_action.action_type = 'update_quote_note' then
    select note into v_current_text from public.quotes where organization_id = p_organization_id and id = p_quote_id;
    if v_current_text is distinct from (v_action.payload ->> 'after') then raise exception using errcode = '40001', message = 'Quote changed after AI action'; end if;
    update public.quotes set note = v_action.payload ->> 'before' where organization_id = p_organization_id and id = p_quote_id;
  elsif v_action.action_type = 'set_validity' then
    select valid_until into v_current_date from public.quotes where organization_id = p_organization_id and id = p_quote_id;
    if v_current_date is distinct from (v_action.payload ->> 'after')::date then raise exception using errcode = '40001', message = 'Quote changed after AI action'; end if;
    update public.quotes set valid_until = (v_action.payload ->> 'before')::date where organization_id = p_organization_id and id = p_quote_id;
  elsif v_action.action_type = 'set_worksite_address' then
    select work_address_id into v_current_uuid from public.quotes where organization_id = p_organization_id and id = p_quote_id;
    if v_current_uuid is distinct from (v_action.payload ->> 'after')::uuid then raise exception using errcode = '40001', message = 'Quote changed after AI action'; end if;
    update public.quotes set work_address_id = (v_action.payload ->> 'before')::uuid where organization_id = p_organization_id and id = p_quote_id;
  else
    raise exception using errcode = '22023', message = 'Unsupported action type';
  end if;

  update public.quote_ai_actions set undone_at = timezone('utc', now()),
    line_id = case when v_action.action_type = 'add_quote_line' then null else v_affected_line_id end
  where id = v_action.id;
  return query select v_action.id, v_action.action_type, v_affected_line_id;
end; $$;

revoke all on function public.undo_last_ai_quote_action(uuid, uuid) from public, anon;
grant execute on function public.undo_last_ai_quote_action(uuid, uuid) to authenticated;
