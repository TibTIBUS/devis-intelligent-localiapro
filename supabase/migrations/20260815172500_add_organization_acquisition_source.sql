alter table public.organizations
  add column if not exists acquisition_source text
  check (acquisition_source is null or char_length(btrim(acquisition_source)) between 1 and 80);

create or replace function public.create_initial_organization(
  organization_name text,
  organization_trade text,
  organization_acquisition_source text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_organization_id uuid;
  new_organization_id uuid := gen_random_uuid();
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));

  select organization_id
  into existing_organization_id
  from public.organization_members
  where user_id = (select auth.uid())
  order by created_at asc
  limit 1;

  if existing_organization_id is not null then
    return existing_organization_id;
  end if;

  insert into public.organizations (id, name, trade, acquisition_source, created_by)
  values (
    new_organization_id,
    btrim(organization_name),
    nullif(btrim(organization_trade), ''),
    nullif(btrim(organization_acquisition_source), ''),
    (select auth.uid())
  );

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, (select auth.uid()), 'owner');

  return new_organization_id;
end;
$$;

revoke all on function public.create_initial_organization(text, text, text) from public;
revoke all on function public.create_initial_organization(text, text, text) from anon;
grant execute on function public.create_initial_organization(text, text, text) to authenticated;
