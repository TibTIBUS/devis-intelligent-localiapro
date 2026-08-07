create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_organization_id_id_key unique (organization_id, id)
);

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  name text check (name is null or char_length(btrim(name)) > 0),
  email text check (email is null or char_length(btrim(email)) > 0),
  phone text check (phone is null or char_length(btrim(phone)) > 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_contacts_customer_organization_fkey
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete cascade,
  constraint customer_contacts_has_information_check check (
    coalesce(char_length(btrim(name)), 0) > 0
    or coalesce(char_length(btrim(email)), 0) > 0
    or coalesce(char_length(btrim(phone)), 0) > 0
  )
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  label text check (label is null or char_length(btrim(label)) > 0),
  address_line_1 text not null check (char_length(btrim(address_line_1)) > 0),
  address_line_2 text check (
    address_line_2 is null or char_length(btrim(address_line_2)) > 0
  ),
  postal_code text not null check (char_length(btrim(postal_code)) > 0),
  city text not null check (char_length(btrim(city)) > 0),
  country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_addresses_customer_organization_fkey
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete cascade
);

create index customers_organization_display_name_idx
  on public.customers (organization_id, display_name, id);

create index customer_contacts_organization_customer_idx
  on public.customer_contacts (organization_id, customer_id, id);

create unique index customer_contacts_one_primary_idx
  on public.customer_contacts (organization_id, customer_id)
  where is_primary;

create index customer_addresses_organization_customer_idx
  on public.customer_addresses (organization_id, customer_id, id);

create unique index customer_addresses_one_primary_idx
  on public.customer_addresses (organization_id, customer_id)
  where is_primary;

create trigger customers_set_updated_at
before update on public.customers
for each row execute function private.set_updated_at();

create trigger customer_contacts_set_updated_at
before update on public.customer_contacts
for each row execute function private.set_updated_at();

create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row execute function private.set_updated_at();

alter table public.customers enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.customer_addresses enable row level security;

revoke all on public.customers from anon;
revoke all on public.customer_contacts from anon;
revoke all on public.customer_addresses from anon;

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customer_contacts to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;

create policy "customers_select_member"
on public.customers
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "customers_insert_member"
on public.customers
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "customers_update_member"
on public.customers
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "customers_delete_member"
on public.customers
for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "customer_contacts_select_member"
on public.customer_contacts
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "customer_contacts_insert_member"
on public.customer_contacts
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "customer_contacts_update_member"
on public.customer_contacts
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "customer_contacts_delete_member"
on public.customer_contacts
for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "customer_addresses_select_member"
on public.customer_addresses
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "customer_addresses_insert_member"
on public.customer_addresses
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "customer_addresses_update_member"
on public.customer_addresses
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "customer_addresses_delete_member"
on public.customer_addresses
for delete to authenticated
using ((select private.is_organization_member(organization_id)));
