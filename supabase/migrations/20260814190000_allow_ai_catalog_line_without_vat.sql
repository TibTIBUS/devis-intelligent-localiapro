create or replace function public.add_catalog_quote_line(
  p_organization_id uuid,
  p_quote_id uuid,
  p_catalog_item_id uuid,
  p_quantity_milliunits bigint,
  p_line_kind text,
  p_vat_rate_basis_points integer
)
returns table(
  action_id uuid,
  line_id uuid,
  label text,
  unit text,
  unit_price_ht_cents bigint
)
language plpgsql
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_catalog_item public.catalog_items%rowtype;
  v_line_id uuid;
  v_action_id uuid;
  v_position bigint;
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

  if p_vat_rate_basis_points is not null
    and (p_vat_rate_basis_points < 0 or p_vat_rate_basis_points > 10000) then
    raise exception using errcode = '22023', message = 'Invalid VAT rate';
  end if;

  select item.*
  into v_catalog_item
  from public.catalog_items item
  where item.organization_id = p_organization_id
    and item.id = p_catalog_item_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Catalog item not found';
  end if;

  if v_catalog_item.unit_price_ht_cents is null then
    raise exception using errcode = '22023', message = 'Catalog price is required';
  end if;

  perform 1
  from public.quotes quote
  where quote.organization_id = p_organization_id
    and quote.id = p_quote_id
    and quote.status = 'draft';

  if not found then
    raise exception using errcode = 'P0002', message = 'Draft quote not found';
  end if;

  select coalesce(max(line.position), -1) + 1
  into v_position
  from public.quote_lines line
  where line.organization_id = p_organization_id
    and line.quote_id = p_quote_id;

  insert into public.quote_lines (
    organization_id,
    quote_id,
    catalog_item_id,
    label,
    description,
    line_kind,
    unit,
    quantity_milliunits,
    unit_price_ht_cents,
    vat_rate_basis_points,
    position
  ) values (
    p_organization_id,
    p_quote_id,
    p_catalog_item_id,
    v_catalog_item.name,
    v_catalog_item.description,
    p_line_kind,
    v_catalog_item.unit,
    p_quantity_milliunits,
    v_catalog_item.unit_price_ht_cents,
    p_vat_rate_basis_points,
    v_position
  )
  returning id into v_line_id;

  insert into public.quote_ai_actions (
    organization_id,
    quote_id,
    actor_user_id,
    action_type,
    line_id,
    payload
  ) values (
    p_organization_id,
    p_quote_id,
    v_actor_user_id,
    'add_quote_line',
    v_line_id,
    jsonb_build_object(
      'catalogItemId', p_catalog_item_id,
      'quantityMilliunits', p_quantity_milliunits,
      'unitPriceHtCents', v_catalog_item.unit_price_ht_cents,
      'vatRateBasisPoints', p_vat_rate_basis_points
    )
  )
  returning id into v_action_id;

  return query
  select
    v_action_id,
    v_line_id,
    v_catalog_item.name,
    v_catalog_item.unit,
    v_catalog_item.unit_price_ht_cents;
end;
$$;