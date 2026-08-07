create table public.company_legal_information (
  organization_id uuid primary key
    references public.organizations (id) on delete cascade,
  legal_name text not null check (char_length(btrim(legal_name)) > 0),
  legal_form text check (
    legal_form is null or char_length(btrim(legal_form)) > 0
  ),
  share_capital_cents bigint check (
    share_capital_cents is null or share_capital_cents >= 0
  ),
  siren text not null check (siren ~ '^[0-9]{9}$'),
  siret text not null check (
    siret ~ '^[0-9]{14}$'
    and left(siret, 9) = siren
  ),
  vat_number text check (
    vat_number is null
    or vat_number ~ '^[A-Z]{2}[A-Z0-9]{2,13}$'
  ),
  registration_city text check (
    registration_city is null
    or char_length(btrim(registration_city)) > 0
  ),
  address_line_1 text not null check (char_length(btrim(address_line_1)) > 0),
  address_line_2 text check (
    address_line_2 is null or char_length(btrim(address_line_2)) > 0
  ),
  postal_code text not null check (char_length(btrim(postal_code)) > 0),
  city text not null check (char_length(btrim(city)) > 0),
  country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.company_insurances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  insurance_type text not null
    check (char_length(btrim(insurance_type)) > 0),
  insurer_name text not null check (char_length(btrim(insurer_name)) > 0),
  insurer_contact_details text not null
    check (char_length(btrim(insurer_contact_details)) > 0),
  policy_number text not null check (char_length(btrim(policy_number)) > 0),
  geographic_coverage text not null
    check (char_length(btrim(geographic_coverage)) > 0),
  activities_covered text check (
    activities_covered is null
    or char_length(btrim(activities_covered)) > 0
  ),
  valid_from date,
  valid_until date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, insurance_type, policy_number),
  check (
    valid_from is null
    or valid_until is null
    or valid_until >= valid_from
  )
);

create index company_insurances_organization_id_idx
  on public.company_insurances (organization_id);

create trigger company_legal_information_set_updated_at
before update on public.company_legal_information
for each row execute function private.set_updated_at();

create trigger company_insurances_set_updated_at
before update on public.company_insurances
for each row execute function private.set_updated_at();

alter table public.company_legal_information enable row level security;
alter table public.company_insurances enable row level security;

revoke all on public.company_legal_information from anon;
revoke all on public.company_insurances from anon;

grant select, insert, update on public.company_legal_information to authenticated;
grant select, insert, update, delete on public.company_insurances to authenticated;

create policy "company_legal_information_select_member"
on public.company_legal_information
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "company_legal_information_insert_member"
on public.company_legal_information
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "company_legal_information_update_member"
on public.company_legal_information
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "company_insurances_select_member"
on public.company_insurances
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "company_insurances_insert_member"
on public.company_insurances
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "company_insurances_update_member"
on public.company_insurances
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "company_insurances_delete_member"
on public.company_insurances
for delete to authenticated
using ((select private.is_organization_member(organization_id)));
