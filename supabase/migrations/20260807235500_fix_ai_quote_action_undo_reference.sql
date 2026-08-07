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
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  perform 1 from public.quotes quote
  where quote.organization_id = p_organization_id
    and quote.id = p_quote_id
    and quote.status = 'draft';
  if not found then
    raise exception using errcode = 'P0002', message = 'Draft quote not found';
  end if;

  select action.* into v_action
  from public.quote_ai_actions action
  where action.organization_id = p_organization_id
    and action.quote_id = p_quote_id
    and action.actor_user_id = auth.uid()
    and action.undone_at is null
  order by action.created_at desc, action.id desc
  limit 1
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'No action to undo';
  end if;

  if v_action.action_type = 'add_quote_line' then
    select line.* into v_line from public.quote_lines line
    where line.organization_id = p_organization_id
      and line.quote_id = p_quote_id
      and line.id = v_action.line_id
    for update;
    if not found
      or v_line.catalog_item_id is distinct from (v_action.payload ->> 'catalogItemId')::uuid
      or v_line.quantity_milliunits is distinct from (v_action.payload ->> 'quantityMilliunits')::bigint
      or v_line.unit_price_ht_cents is distinct from (v_action.payload ->> 'unitPriceHtCents')::bigint
      or v_line.vat_rate_basis_points is distinct from (v_action.payload ->> 'vatRateBasisPoints')::integer then
      raise exception using errcode = '40001', message = 'Quote line changed after AI action';
    end if;
    delete from public.quote_lines line where line.id = v_action.line_id
    returning line.id into v_affected_line_id;

  elsif v_action.action_type = 'update_quote_line' then
    select line.* into v_line from public.quote_lines line
    where line.organization_id = p_organization_id
      and line.quote_id = p_quote_id
      and line.id = v_action.line_id
    for update;
    if not found
      or v_line.quantity_milliunits is distinct from (v_action.payload #>> '{after,quantityMilliunits}')::bigint
      or v_line.line_kind is distinct from (v_action.payload #>> '{after,lineKind}') then
      raise exception using errcode = '40001', message = 'Quote line changed after AI action';
    end if;
    update public.quote_lines line
    set quantity_milliunits = (v_action.payload #>> '{before,quantityMilliunits}')::bigint,
        line_kind = (v_action.payload #>> '{before,lineKind}')
    where line.id = v_action.line_id
    returning line.id into v_affected_line_id;

  elsif v_action.action_type = 'delete_quote_line' then
    v_snapshot := v_action.payload -> 'before';
    if v_snapshot is null or jsonb_typeof(v_snapshot) <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid action snapshot';
    end if;
    insert into public.quote_lines (
      id, organization_id, quote_id, section_id, created_at, updated_at,
      catalog_item_id, label, description, line_kind, unit,
      quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points, position
    ) values (
      (v_snapshot ->> 'id')::uuid,
      p_organization_id,
      p_quote_id,
      (v_snapshot ->> 'section_id')::uuid,
      (v_snapshot ->> 'created_at')::timestamptz,
      (v_snapshot ->> 'updated_at')::timestamptz,
      (v_snapshot ->> 'catalog_item_id')::uuid,
      v_snapshot ->> 'label',
      v_snapshot ->> 'description',
      v_snapshot ->> 'line_kind',
      v_snapshot ->> 'unit',
      (v_snapshot ->> 'quantity_milliunits')::bigint,
      (v_snapshot ->> 'unit_price_ht_cents')::bigint,
      (v_snapshot ->> 'vat_rate_basis_points')::integer,
      (v_snapshot ->> 'position')::bigint
    ) returning id into v_affected_line_id;
  else
    raise exception using errcode = '22023', message = 'Unsupported action type';
  end if;

  update public.quote_ai_actions action
  set undone_at = timezone('utc', now()),
      line_id = case
        when v_action.action_type = 'add_quote_line' then null
        else v_affected_line_id
      end
  where action.id = v_action.id;

  return query select v_action.id, v_action.action_type, v_affected_line_id;
end;
$$;

revoke all on function public.undo_last_ai_quote_action(uuid, uuid) from public, anon;
grant execute on function public.undo_last_ai_quote_action(uuid, uuid) to authenticated;
