create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  trade text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create index organization_members_user_id_organization_id_idx
  on public.organization_members (user_id, organization_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
  );
$$;

create function private.is_organization_creator(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations
    where id = target_organization_id
      and created_by = (select auth.uid())
  );
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

grant usage on schema private to authenticated;

revoke all on function private.handle_new_user() from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.is_organization_member(uuid) from public;
revoke all on function private.is_organization_creator(uuid) from public;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.is_organization_creator(uuid) to authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert on public.organization_members to authenticated;

create policy "profiles_select_own"
on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "organizations_select_member"
on public.organizations
for select to authenticated
using ((select private.is_organization_member(id)));

create policy "organizations_insert_creator"
on public.organizations
for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "organizations_update_creator"
on public.organizations
for update to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "organization_members_select_member"
on public.organization_members
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "organization_members_insert_initial_owner"
on public.organization_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and (select private.is_organization_creator(organization_id))
);
