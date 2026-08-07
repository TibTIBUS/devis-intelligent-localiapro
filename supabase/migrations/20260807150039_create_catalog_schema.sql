create table public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  description text check (
    description is null or char_length(btrim(description)) > 0
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_categories_organization_id_id_key
    unique (organization_id, id)
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(btrim(name)) > 0),
  description text check (
    description is null or char_length(btrim(description)) > 0
  ),
  unit text not null check (char_length(btrim(unit)) > 0),
  unit_price_ht_cents bigint check (
    unit_price_ht_cents is null or unit_price_ht_cents >= 0
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_items_category_organization_fkey
    foreign key (organization_id, category_id)
    references public.catalog_categories (organization_id, id)
    on delete restrict
);

create index catalog_categories_organization_name_idx
  on public.catalog_categories (organization_id, name, id);

create index catalog_items_organization_category_name_idx
  on public.catalog_items (organization_id, category_id, name, id);

create index catalog_items_organization_name_idx
  on public.catalog_items (organization_id, name, id);

create trigger catalog_categories_set_updated_at
before update on public.catalog_categories
for each row execute function private.set_updated_at();

create trigger catalog_items_set_updated_at
before update on public.catalog_items
for each row execute function private.set_updated_at();

alter table public.catalog_categories enable row level security;
alter table public.catalog_items enable row level security;

revoke all on public.catalog_categories from anon;
revoke all on public.catalog_items from anon;

grant select, insert, update, delete on public.catalog_categories to authenticated;
grant select, insert, update, delete on public.catalog_items to authenticated;

create policy "catalog_categories_select_member"
on public.catalog_categories
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "catalog_categories_insert_member"
on public.catalog_categories
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "catalog_categories_update_member"
on public.catalog_categories
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "catalog_categories_delete_member"
on public.catalog_categories
for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "catalog_items_select_member"
on public.catalog_items
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "catalog_items_insert_member"
on public.catalog_items
for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "catalog_items_update_member"
on public.catalog_items
for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "catalog_items_delete_member"
on public.catalog_items
for delete to authenticated
using ((select private.is_organization_member(organization_id)));
