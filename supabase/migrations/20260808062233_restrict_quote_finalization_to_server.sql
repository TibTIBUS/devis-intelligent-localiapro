revoke all on function public.finalize_quote(uuid) from public;
revoke all on function public.finalize_quote(uuid) from anon;
revoke all on function public.finalize_quote(uuid) from authenticated;
drop function public.finalize_quote(uuid);

create function public.finalize_quote(
  p_quote_id uuid,
  p_actor_user_id uuid,
  p_organization_id uuid
)
returns table (quote_id uuid, quote_number text, quote_version_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_quote public.quotes%rowtype;
  current_issue_date date := timezone('Europe/Paris', now())::date;
  next_sequence_number integer;
  generated_quote_number text;
  generated_version_id uuid;
  quote_snapshot jsonb;
begin
  if p_actor_user_id is null or p_organization_id is null then
    raise exception using errcode = '42501', message = 'Actor and organization are required.';
  end if;

  if not exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = p_organization_id
      and membership.user_id = p_actor_user_id
  ) then
    raise exception using errcode = '42501', message = 'Organization membership required.';
  end if;

  select q.* into current_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Quote not found.';
  end if;

  if current_quote.status = 'finalized' then
    return query
    select current_quote.id, current_quote.quote_number, v.id
    from public.quote_versions v
    where v.organization_id = current_quote.organization_id
      and v.quote_id = current_quote.id
      and v.version_number = 1;
    return;
  end if;

  if current_quote.valid_until is null or current_quote.valid_until < current_issue_date then
    raise exception using errcode = 'P0001', message = 'A current validity date is required.';
  end if;
  if current_quote.is_quote_free is null then
    raise exception using errcode = 'P0001', message = 'The quote fee status is required.';
  end if;
  if current_quote.work_address_id is null then
    raise exception using errcode = 'P0001', message = 'A work address is required.';
  end if;
  if not exists (
    select 1 from public.company_legal_information
    where organization_id = current_quote.organization_id
  ) then
    raise exception using errcode = 'P0001', message = 'Company legal information is required.';
  end if;
  if not exists (
    select 1 from public.quote_lines quote_line
    where quote_line.organization_id = current_quote.organization_id
      and quote_line.quote_id = current_quote.id
  ) then
    raise exception using errcode = 'P0001', message = 'At least one quote line is required.';
  end if;
  if exists (
    select 1 from public.quote_lines quote_line
    where quote_line.organization_id = current_quote.organization_id
      and quote_line.quote_id = current_quote.id
      and (quote_line.unit_price_ht_cents is null or quote_line.vat_rate_basis_points is null)
  ) then
    raise exception using errcode = 'P0001', message = 'Every quote line needs a price and VAT rate.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_quote.organization_id::text || ':' || extract(year from current_issue_date)::integer::text,
      0
    )
  );

  select coalesce(max(q.sequence_number), 0) + 1 into next_sequence_number
  from public.quotes q
  where q.organization_id = current_quote.organization_id
    and q.sequence_year = extract(year from current_issue_date)::integer;

  generated_quote_number := 'D-'
    || extract(year from current_issue_date)::integer::text
    || '-'
    || case
      when next_sequence_number < 100000 then lpad(next_sequence_number::text, 5, '0')
      else next_sequence_number::text
    end;

  quote_snapshot := jsonb_build_object(
    'schemaVersion', 1,
    'quote', jsonb_build_object(
      'id', current_quote.id,
      'number', generated_quote_number,
      'issuedOn', current_issue_date,
      'validUntil', current_quote.valid_until,
      'isFree', current_quote.is_quote_free,
      'discountRateBasisPoints', current_quote.discount_rate_basis_points,
      'depositRateBasisPoints', current_quote.deposit_rate_basis_points
    ),
    'company', (
      select to_jsonb(company) - 'created_at' - 'updated_at'
      from public.company_legal_information company
      where company.organization_id = current_quote.organization_id
    ),
    'customer', (
      select jsonb_build_object(
        'id', customer.id,
        'displayName', customer.display_name,
        'workAddress', to_jsonb(address) - 'created_at' - 'updated_at',
        'contacts', coalesce((
          select jsonb_agg(to_jsonb(contact) - 'created_at' - 'updated_at' order by contact.is_primary desc, contact.id)
          from public.customer_contacts contact
          where contact.organization_id = current_quote.organization_id
            and contact.customer_id = customer.id
        ), '[]'::jsonb)
      )
      from public.customers customer
      join public.customer_addresses address
        on address.organization_id = customer.organization_id
        and address.customer_id = customer.id
        and address.id = current_quote.work_address_id
      where customer.organization_id = current_quote.organization_id
        and customer.id = current_quote.customer_id
    ),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', section.id,
        'title', section.title,
        'position', section.position
      ) order by section.position, section.id)
      from public.quote_sections section
      where section.organization_id = current_quote.organization_id
        and section.quote_id = current_quote.id
    ), '[]'::jsonb),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', line.id,
        'sectionId', line.section_id,
        'label', line.label,
        'description', line.description,
        'unit', line.unit,
        'quantityMilliunits', line.quantity_milliunits,
        'unitPriceHtCents', line.unit_price_ht_cents,
        'vatRateBasisPoints', line.vat_rate_basis_points,
        'position', line.position
      ) order by line.position, line.id)
      from public.quote_lines line
      where line.organization_id = current_quote.organization_id
        and line.quote_id = current_quote.id
    ), '[]'::jsonb)
  );

  update public.quotes
  set status = 'finalized',
      quote_number = generated_quote_number,
      sequence_year = extract(year from current_issue_date)::integer,
      sequence_number = next_sequence_number,
      issued_on = current_issue_date,
      finalized_at = timezone('utc', now())
  where id = current_quote.id;

  insert into public.quote_versions (
    organization_id,
    quote_id,
    version_number,
    quote_number,
    issued_on,
    snapshot
  ) values (
    current_quote.organization_id,
    current_quote.id,
    1,
    generated_quote_number,
    current_issue_date,
    quote_snapshot
  ) returning id into generated_version_id;

  return query select current_quote.id, generated_quote_number, generated_version_id;
end;
$$;

revoke all on function public.finalize_quote(uuid, uuid, uuid) from public;
revoke all on function public.finalize_quote(uuid, uuid, uuid) from anon;
revoke all on function public.finalize_quote(uuid, uuid, uuid) from authenticated;
grant execute on function public.finalize_quote(uuid, uuid, uuid) to service_role;
