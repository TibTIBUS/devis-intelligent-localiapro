create or replace function public.create_quote_revision(
  p_quote_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_quote public.quotes%rowtype;
  root_quote_id uuid;
  new_quote_id uuid;
  next_revision integer;
  section_record record;
  new_section_id uuid;
begin
  if p_actor_user_id is null or p_organization_id is null then
    raise exception using errcode = '42501', message = 'Actor and organization are required.';
  end if;
  if not exists (
    select 1 from public.organization_members membership
    where membership.organization_id = p_organization_id and membership.user_id = p_actor_user_id
  ) then
    raise exception using errcode = '42501', message = 'Organization membership required.';
  end if;

  select q.* into source_quote
  from public.quotes q
  where q.id = p_quote_id and q.organization_id = p_organization_id and q.status = 'finalized';
  if not found then raise exception using errcode = 'P0002', message = 'Finalized quote not found.'; end if;

  root_quote_id := coalesce(source_quote.revision_of_quote_id, source_quote.id);
  select coalesce(max(q.revision_number), 0) + 1 into next_revision
  from public.quotes q
  where q.organization_id = p_organization_id
    and (q.id = root_quote_id or q.revision_of_quote_id = root_quote_id);

  insert into public.quotes (
    organization_id, customer_id, discount_rate_basis_points, deposit_rate_basis_points,
    valid_until, is_quote_free, work_address_id, preparation_fee_ht_cents,
    preparation_fee_vat_rate_basis_points, travel_fee_applicable, payment_terms, note,
    execution_start_date, execution_duration, revision_of_quote_id, revision_number
  ) values (
    p_organization_id, source_quote.customer_id, source_quote.discount_rate_basis_points, source_quote.deposit_rate_basis_points,
    source_quote.valid_until, source_quote.is_quote_free, source_quote.work_address_id, source_quote.preparation_fee_ht_cents,
    source_quote.preparation_fee_vat_rate_basis_points, source_quote.travel_fee_applicable, source_quote.payment_terms, source_quote.note,
    source_quote.execution_start_date, source_quote.execution_duration, root_quote_id, next_revision
  ) returning id into new_quote_id;

  for section_record in
    select s.id, s.title, s.position
    from public.quote_sections s
    where s.organization_id = p_organization_id and s.quote_id = source_quote.id
    order by s.position, s.id
  loop
    insert into public.quote_sections (organization_id, quote_id, title, position)
    values (p_organization_id, new_quote_id, section_record.title, section_record.position)
    returning id into new_section_id;

    insert into public.quote_lines (
      organization_id, quote_id, section_id, catalog_item_id, label, description, unit,
      quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points, position, line_kind
    )
    select p_organization_id, new_quote_id, new_section_id, l.catalog_item_id, l.label, l.description, l.unit,
      l.quantity_milliunits, l.unit_price_ht_cents, l.vat_rate_basis_points, l.position, l.line_kind
    from public.quote_lines l
    where l.organization_id = p_organization_id and l.quote_id = source_quote.id and l.section_id = section_record.id;
  end loop;

  insert into public.quote_lines (
    organization_id, quote_id, section_id, catalog_item_id, label, description, unit,
    quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points, position, line_kind
  )
  select p_organization_id, new_quote_id, null, l.catalog_item_id, l.label, l.description, l.unit,
    l.quantity_milliunits, l.unit_price_ht_cents, l.vat_rate_basis_points, l.position, l.line_kind
  from public.quote_lines l
  where l.organization_id = p_organization_id and l.quote_id = source_quote.id and l.section_id is null;

  return new_quote_id;
end;
$$;

revoke all on function public.create_quote_revision(uuid, uuid, uuid) from public;
revoke all on function public.create_quote_revision(uuid, uuid, uuid) from anon;
revoke all on function public.create_quote_revision(uuid, uuid, uuid) from authenticated;
grant execute on function public.create_quote_revision(uuid, uuid, uuid) to service_role;
