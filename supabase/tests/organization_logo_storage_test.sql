begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select results_eq(
  $$ select id from storage.buckets where id = 'organization-assets' $$,
  array['organization-assets'::text],
  'the organization assets bucket should exist'
);

select is(
  (select public from storage.buckets where id = 'organization-assets'),
  false,
  'the organization assets bucket should be private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'organization-assets'),
  2097152::bigint,
  'the organization assets bucket should limit files to 2 MB'
);

select ok(
  (
    select allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
      and cardinality(allowed_mime_types) = 3
    from storage.buckets
    where id = 'organization-assets'
  ),
  'the bucket should only allow JPEG, PNG, and WebP images'
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
    '40000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'logo-owner-a@example.test',
    'not-used-in-tests',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '40000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'logo-owner-b@example.test',
    'not-used-in-tests',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.organizations (id, name, created_by)
values
  (
    '41000000-0000-0000-0000-000000000001',
    'Entreprise logo A',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    'Entreprise logo B',
    '40000000-0000-0000-0000-000000000002'
  );

insert into public.organization_members (organization_id, user_id, role)
values
  (
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'owner'
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    'owner'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'organization-assets',
      'organizations/41000000-0000-0000-0000-000000000001/logo/logo',
      '40000000-0000-0000-0000-000000000001'
    )
  $$,
  'an owner can insert their organization logo'
);

select results_eq(
  $$
    select count(*)::bigint
    from storage.objects
    where bucket_id = 'organization-assets'
  $$,
  array[1::bigint],
  'an owner can read their organization logo'
);

select lives_ok(
  $$
    update storage.objects
    set metadata = '{"mimetype":"image/png"}'::jsonb
    where bucket_id = 'organization-assets'
  $$,
  'an owner can replace their organization logo'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'organization-assets',
      'organizations/42000000-0000-0000-0000-000000000002/logo/logo',
      '40000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an owner cannot insert a logo for another organization'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'organization-assets',
      'organizations/41000000-0000-0000-0000-000000000001/quotes/logo',
      '40000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an owner cannot write outside the logo path'
);

select set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000002',
  true
);

select is_empty(
  $$
    select id
    from storage.objects
    where bucket_id = 'organization-assets'
  $$,
  'another organization cannot read the stored logo'
);

select * from finish();
rollback;
