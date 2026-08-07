begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table('public', 'profiles', 'profiles should exist');
select has_table('public', 'organizations', 'organizations should exist');
select has_table(
  'public',
  'organization_members',
  'organization_members should exist'
);

select col_is_pk('public', 'profiles', 'id', 'profiles.id should be the primary key');
select col_type_is(
  'public',
  'organizations',
  'id',
  'uuid',
  'organizations.id should be a UUID'
);
select col_is_fk(
  'public',
  'organization_members',
  'organization_id',
  'organization_members.organization_id should be a foreign key'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles should have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.organizations'::regclass),
  'organizations should have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.organization_members'::regclass),
  'organization_members should have RLS enabled'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'owner-a@example.test',
    'not-used-in-tests',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'owner-b@example.test',
    'not-used-in-tests',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'owner-c@example.test',
    'not-used-in-tests',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

select results_eq(
  $$ select count(*)::bigint from public.profiles $$,
  array[3::bigint],
  'creating auth users should create profiles'
);

insert into public.organizations (id, name, trade, created_by)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'Entreprise A',
    'Plomberie',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Entreprise B',
    'Électricité',
    '00000000-0000-0000-0000-000000000002'
  );

insert into public.organization_members (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'owner'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'owner'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);

select results_eq(
  $$ select id from public.organizations order by id $$,
  array['10000000-0000-0000-0000-000000000001'::uuid],
  'an owner should only see their organization'
);
select results_eq(
  $$ select id from public.profiles order by id $$,
  array['00000000-0000-0000-0000-000000000001'::uuid],
  'a user should only see their profile'
);
select results_eq(
  $$
    update public.organizations
    set name = 'Entreprise A mise à jour'
    where id = '10000000-0000-0000-0000-000000000001'
    returning id
  $$,
  array['10000000-0000-0000-0000-000000000001'::uuid],
  'an owner should update their organization'
);
select results_eq(
  $$
    update public.organizations
    set name = 'Tentative interdite'
    where id = '20000000-0000-0000-0000-000000000002'
    returning id
  $$,
  array[]::uuid[],
  'an owner should not update another organization'
);

reset role;

select has_function(
  'public',
  'create_initial_organization',
  array['text', 'text'],
  'the initial organization function should exist'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_initial_organization(text, text)',
    'execute'
  ),
  'anonymous users should not execute the initial organization function'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000003',
  true
);

select lives_ok(
  $$ select public.create_initial_organization('Entreprise C', 'MaÃ§onnerie') $$,
  'an authenticated user can create an initial organization atomically'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.organization_members
    where user_id = '00000000-0000-0000-0000-000000000003'
      and role = 'owner'
  $$,
  array[1::bigint],
  'creating an initial organization also creates its owner membership'
);

select results_eq(
  $$
    select created_by
    from public.organizations
    where id = (
      select organization_id
      from public.organization_members
      where user_id = '00000000-0000-0000-0000-000000000003'
    )
  $$,
  array['00000000-0000-0000-0000-000000000003'::uuid],
  'the organization is owned by the authenticated creator'
);

select is(
  public.create_initial_organization('Tentative de doublon', 'MaÃ§onnerie'),
  (
    select organization_id
    from public.organization_members
    where user_id = '00000000-0000-0000-0000-000000000003'
  ),
  'repeating onboarding returns the existing organization'
);

reset role;

select is_empty(
  $$
    select routine_name
    from information_schema.routine_privileges
    where specific_schema = 'private'
      and grantee = 'PUBLIC'
  $$,
  'private functions should not be executable by PUBLIC'
);

select * from finish();
rollback;
