alter table public.customer_addresses
add constraint customer_addresses_organization_customer_id_key
unique (organization_id, customer_id, id);

alter table public.quotes
add column status text not null default 'draft',
add column quote_number text,
add column sequence_year integer,
add column sequence_number integer,
add column issued_on date,
add column valid_until date,
add column is_quote_free boolean,
add column work_address_id uuid,
add column finalized_at timestamptz,
add constraint quotes_status_check check (status in ('draft', 'finalized')),
add constraint quotes_sequence_year_check check (sequence_year is null or sequence_year between 2000 and 9999),
add constraint quotes_sequence_number_check check (sequence_number is null or sequence_number > 0),
add constraint quotes_number_format_check check (quote_number is null or quote_number ~ '^D-[0-9]{4}-[0-9]{5,}$'),
add constraint quotes_validity_check check (valid_until is null or issued_on is null or valid_until >= issued_on),
add constraint quotes_lifecycle_consistency_check check (
  (
    status = 'draft'
    and quote_number is null
    and sequence_year is null
    and sequence_number is null
    and issued_on is null
    and finalized_at is null
  )
  or
  (
    status = 'finalized'
    and quote_number is not null
    and sequence_year is not null
    and sequence_number is not null
    and issued_on is not null
    and valid_until is not null
    and is_quote_free is not null
    and work_address_id is not null
    and finalized_at is not null
  )
),
add constraint quotes_work_address_customer_fkey
  foreign key (organization_id, customer_id, work_address_id)
  references public.customer_addresses (organization_id, customer_id, id)
  on delete restrict,
add constraint quotes_organization_number_key unique (organization_id, quote_number),
add constraint quotes_organization_sequence_key unique (organization_id, sequence_year, sequence_number);

create index quotes_organization_status_updated_at_idx
  on public.quotes (organization_id, status, updated_at desc, id);

create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null,
  version_number integer not null check (version_number > 0),
  quote_number text not null check (quote_number ~ '^D-[0-9]{4}-[0-9]{5,}$'),
  issued_on date not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint quote_versions_quote_organization_fkey
    foreign key (organization_id, quote_id)
    references public.quotes (organization_id, id)
    on delete restrict,
  constraint quote_versions_organization_quote_version_key
    unique (organization_id, quote_id, version_number),
  constraint quote_versions_organization_number_key
    unique (organization_id, quote_number)
);

create index quote_versions_organization_created_at_idx
  on public.quote_versions (organization_id, created_at desc, id);

alter table public.quote_versions enable row level security;

revoke all on public.quote_versions from anon;
revoke all on public.quote_versions from authenticated;
grant select on public.quote_versions to authenticated;

create policy "quote_versions_select_member"
on public.quote_versions for select to authenticated
using ((select private.is_organization_member(organization_id)));

revoke update on public.quotes from authenticated;
grant update (
  discount_rate_basis_points,
  deposit_rate_basis_points,
  valid_until,
  is_quote_free,
  work_address_id,
  updated_at
) on public.quotes to authenticated;

create function private.protect_finalized_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'finalized' then
    raise exception using
      errcode = '55000',
      message = 'A finalized quote is immutable.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function private.ensure_quote_is_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_organization_id uuid := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  target_quote_id uuid := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;
begin
  if not exists (
    select 1
    from public.quotes
    where id = target_quote_id
      and organization_id = target_organization_id
      and status = 'draft'
  ) then
    raise exception using
      errcode = '55000',
      message = 'A finalized quote is immutable.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function private.prevent_quote_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'A quote version is immutable.';
end;
$$;

create trigger quotes_protect_finalized
before update or delete on public.quotes
for each row execute function private.protect_finalized_quote();

create trigger quote_sections_require_draft
before insert or update or delete on public.quote_sections
for each row execute function private.ensure_quote_is_draft();

create trigger quote_lines_require_draft
before insert or update or delete on public.quote_lines
for each row execute function private.ensure_quote_is_draft();

create trigger quote_versions_prevent_mutation
before update or delete on public.quote_versions
for each row execute function private.prevent_quote_version_mutation();

revoke all on function private.protect_finalized_quote() from public;
revoke all on function private.ensure_quote_is_draft() from public;
revoke all on function private.prevent_quote_version_mutation() from public;

create function public.finalize_quote(p_quote_id uuid)
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
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select q.* into current_quote
  from public.quotes q
  where q.id = p_quote_id
    and (select private.is_organization_member(q.organization_id))
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

revoke all on function public.finalize_quote(uuid) from public;
revoke all on function public.finalize_quote(uuid) from anon;
grant execute on function public.finalize_quote(uuid) to authenticated;
