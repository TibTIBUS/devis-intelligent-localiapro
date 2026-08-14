alter table public.quote_lines
alter column vat_rate_basis_points set default 2000;

update public.quote_lines line
set vat_rate_basis_points = 2000
from public.quotes quote
where quote.id = line.quote_id
  and quote.organization_id = line.organization_id
  and quote.status = 'draft'
  and line.vat_rate_basis_points is null;

drop function if exists public.update_ai_quote_line(uuid, uuid, uuid, bigint, text);

create function public.update_ai_quote_line(
  p_organization_id uuid,
  p_quote_id uuid,
  p_line_id uuid,
  p_quantity_milliunits bigint,
  p_line_kind text,
  p_vat_rate_basis_points integer
)
returns table (action_id uuid, line_id uuid, label text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_before public.quote_lines%rowtype;
  v_action_id uuid;
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_quantity_milliunits <= 0 then
    raise exception using errcode = '22023', message = 'Quantity must be positive';
  end if;
  if p_line_kind not in ('labor', 'material', 'travel', 'service', 'other') then
    raise exception using errcode = '22023', message = 'Invalid line kind';
  end if;
  if p_vat_rate_basis_points < 0 or p_vat_rate_basis_points > 10000 then
    raise exception using errcode = '22023', message = 'Invalid VAT rate';
  end if;

  perform 1 from public.quotes quote
  where quote.organization_id = p_organization_id
    and quote.id = p_quote_id
    and quote.status = 'draft';
  if not found then
    raise exception using errcode = 'P0002', message = 'Draft quote not found';
  end if;

  select line.* into v_before
  from public.quote_lines line
  where line.organization_id = p_organization_id
    and line.quote_id = p_quote_id
    and line.id = p_line_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Quote line not found';
  end if;

  update public.quote_lines line
  set quantity_milliunits = p_quantity_milliunits,
      line_kind = p_line_kind,
      vat_rate_basis_points = p_vat_rate_basis_points
  where line.organization_id = p_organization_id
    and line.quote_id = p_quote_id
    and line.id = p_line_id;

  insert into public.quote_ai_actions (
    organization_id, quote_id, actor_user_id, action_type, line_id, payload
  ) values (
    p_organization_id, p_quote_id, v_actor_user_id, 'update_quote_line', p_line_id,
    jsonb_build_object(
      'before', jsonb_build_object(
        'quantityMilliunits', v_before.quantity_milliunits,
        'lineKind', v_before.line_kind,
        'vatRateBasisPoints', v_before.vat_rate_basis_points
      ),
      'after', jsonb_build_object(
        'quantityMilliunits', p_quantity_milliunits,
        'lineKind', p_line_kind,
        'vatRateBasisPoints', p_vat_rate_basis_points
      )
    )
  ) returning id into v_action_id;

  return query select v_action_id, p_line_id, v_before.label;
end;
$$;

create or replace function public.undo_last_ai_quote_action(
  p_organization_id uuid,
  p_quote_id uuid
)
returns table (action_id uuid, action_type text, affected_line_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
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
      or (
        (v_action.payload -> 'after') ? 'vatRateBasisPoints'
        and v_line.vat_rate_basis_points is distinct from (v_action.payload #>> '{after,vatRateBasisPoints}')::integer
      )
    then raise exception using errcode = '40001', message = 'Quote line changed after AI action'; end if;
    update public.quote_lines
    set quantity_milliunits = (v_action.payload #>> '{before,quantityMilliunits}')::bigint,
      line_kind = (v_action.payload #>> '{before,lineKind}'),
      vat_rate_basis_points = case
        when (v_action.payload -> 'before') ? 'vatRateBasisPoints'
          then (v_action.payload #>> '{before,vatRateBasisPoints}')::integer
        else vat_rate_basis_points
      end
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
end;
$$;

revoke all on function public.update_ai_quote_line(uuid, uuid, uuid, bigint, text, integer) from public, anon;
grant execute on function public.update_ai_quote_line(uuid, uuid, uuid, bigint, text, integer) to authenticated;
