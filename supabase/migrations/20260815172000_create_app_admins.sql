create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.app_admins enable row level security;

revoke all on public.app_admins from anon;
grant select on public.app_admins to authenticated;

create policy "app_admins_select_self"
on public.app_admins
for select to authenticated
using (user_id = (select auth.uid()));

insert into public.app_admins (user_id)
select id
from auth.users
where lower(email) = 'gestion.localia@gmail.com'
on conflict (user_id) do nothing;
