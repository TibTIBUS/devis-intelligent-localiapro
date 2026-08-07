alter table public.catalog_items
add constraint catalog_items_organization_id_id_key
unique (organization_id, id);

create table public.catalog_price_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  catalog_item_id uuid not null,
  unit_price_ht_cents bigint check (
    unit_price_ht_cents is null or unit_price_ht_cents >= 0
  ),
  recorded_at timestamptz not null default timezone('utc', now()),
  constraint catalog_price_history_item_organization_fkey
    foreign key (organization_id, catalog_item_id)
    references public.catalog_items (organization_id, id)
    on delete cascade
);

create index catalog_price_history_organization_item_recorded_idx
  on public.catalog_price_history (
    organization_id,
    catalog_item_id,
    recorded_at desc,
    id
  );

insert into public.catalog_price_history (
  organization_id,
  catalog_item_id,
  unit_price_ht_cents,
  recorded_at
)
select
  organization_id,
  id,
  unit_price_ht_cents,
  updated_at
from public.catalog_items;

create function private.record_catalog_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  should_record boolean := tg_op = 'INSERT';
begin
  if caller_user_id is not null and not exists (
    select 1
    from public.organization_members
    where organization_id = new.organization_id
      and user_id = caller_user_id
  ) then
    raise exception 'User is not a member of the catalog organization'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    should_record := new.unit_price_ht_cents is distinct from old.unit_price_ht_cents;
  end if;

  if should_record then
    insert into public.catalog_price_history (
      organization_id,
      catalog_item_id,
      unit_price_ht_cents
    )
    values (
      new.organization_id,
      new.id,
      new.unit_price_ht_cents
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_catalog_price_history()
from public, anon, authenticated, service_role;

create trigger catalog_items_record_price_history
after insert or update of unit_price_ht_cents on public.catalog_items
for each row execute function private.record_catalog_price_history();

alter table public.catalog_price_history enable row level security;

revoke all on public.catalog_price_history from anon, authenticated;
grant select on public.catalog_price_history to authenticated;

create policy "catalog_price_history_select_member"
on public.catalog_price_history
for select to authenticated
using ((select private.is_organization_member(organization_id)));
