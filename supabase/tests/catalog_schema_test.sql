begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_table('public', 'catalog_categories', 'catalog categories should exist');
select has_table('public', 'catalog_items', 'catalog items should exist');
select col_is_pk('public', 'catalog_categories', 'id', 'catalog category id should be the primary key');
select col_is_pk('public', 'catalog_items', 'id', 'catalog item id should be the primary key');
select col_is_fk(
  'public', 'catalog_items', 'organization_id',
  'catalog item organization should be a foreign key'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.catalog_categories'::regclass),
  'catalog categories should have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.catalog_items'::regclass),
  'catalog items should have RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.catalog_items', 'select'),
  'anonymous users should not read catalog items'
);
select ok(
  not has_table_privilege('anon', 'public.catalog_categories', 'select'),
  'anonymous users should not read catalog categories'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000021',
    'authenticated', 'authenticated', 'catalog-owner-a@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000022',
    'authenticated', 'authenticated', 'catalog-owner-b@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.organizations (id, name, trade, created_by)
values
  (
    '10000000-0000-0000-0000-000000000021', 'Entreprise catalogue A', 'Plomberie',
    '00000000-0000-0000-0000-000000000021'
  ),
  (
    '20000000-0000-0000-0000-000000000022', 'Entreprise catalogue B', 'Electricite',
    '00000000-0000-0000-0000-000000000022'
  );

insert into public.organization_members (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000021', 'owner'
  ),
  (
    '20000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000022', 'owner'
  );

insert into public.catalog_categories (id, organization_id, name)
values (
  '22000000-0000-0000-0000-000000000022',
  '20000000-0000-0000-0000-000000000022',
  'Electricite'
);

insert into public.catalog_items (
  id, organization_id, category_id, name, unit, unit_price_ht_cents
)
values (
  '23000000-0000-0000-0000-000000000022',
  '20000000-0000-0000-0000-000000000022',
  '22000000-0000-0000-0000-000000000022',
  'Pose prise', 'unite', 6500
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', true);

select lives_ok(
  $$
    insert into public.catalog_categories (id, organization_id, name)
    values (
      '12000000-0000-0000-0000-000000000021',
      '10000000-0000-0000-0000-000000000021',
      'Plomberie'
    )
  $$,
  'an owner should create a category for their organization'
);

select lives_ok(
  $$
    insert into public.catalog_items (
      id, organization_id, category_id, name, unit, unit_price_ht_cents
    ) values (
      '13000000-0000-0000-0000-000000000021',
      '10000000-0000-0000-0000-000000000021',
      '12000000-0000-0000-0000-000000000021',
      'Main-d''oeuvre plomberie', 'heure', null
    )
  $$,
  'an owner should create a catalog item without inventing a price'
);

select is(
  (
    select unit_price_ht_cents
    from public.catalog_items
    where id = '13000000-0000-0000-0000-000000000021'
  ),
  null::bigint,
  'a catalog price may remain unknown'
);

select throws_ok(
  $$
    insert into public.catalog_items (
      organization_id, category_id, name, unit, unit_price_ht_cents
    ) values (
      '10000000-0000-0000-0000-000000000021',
      '12000000-0000-0000-0000-000000000021',
      'Prix invalide', 'forfait', -1
    )
  $$,
  '23514', null,
  'a catalog price should not be negative'
);

select throws_ok(
  $$
    insert into public.catalog_categories (organization_id, name)
    values ('20000000-0000-0000-0000-000000000022', 'Interdit')
  $$,
  '42501', null,
  'an owner should not create a category for another organization'
);

select throws_ok(
  $$
    insert into public.catalog_items (organization_id, name, unit)
    values ('20000000-0000-0000-0000-000000000022', 'Interdit', 'unite')
  $$,
  '42501', null,
  'an owner should not create an item for another organization'
);

select throws_ok(
  $$
    insert into public.catalog_items (
      organization_id, category_id, name, unit
    ) values (
      '10000000-0000-0000-0000-000000000021',
      '22000000-0000-0000-0000-000000000022',
      'Rattachement interdit', 'unite'
    )
  $$,
  '23503', null,
  'an item should not reference another organization category'
);

select results_eq(
  $$ select name from public.catalog_categories order by name $$,
  array['Plomberie'::text],
  'an owner should only read their categories'
);

select results_eq(
  $$ select name from public.catalog_items order by name $$,
  array['Main-d''oeuvre plomberie'::text],
  'an owner should only read their catalog items'
);

select results_eq(
  $$
    update public.catalog_items
    set unit_price_ht_cents = 5590
    where id = '13000000-0000-0000-0000-000000000021'
    returning unit_price_ht_cents
  $$,
  array[5590::bigint],
  'an owner should update their catalog item price'
);

select results_eq(
  $$
    update public.catalog_items
    set unit_price_ht_cents = 1
    where id = '23000000-0000-0000-0000-000000000022'
    returning id
  $$,
  array[]::uuid[],
  'an owner should not update another organization item'
);

select throws_ok(
  $$
    delete from public.catalog_categories
    where id = '12000000-0000-0000-0000-000000000021'
  $$,
  '23503', null,
  'a category containing items should not be deleted'
);

select results_eq(
  $$
    delete from public.catalog_items
    where id = '23000000-0000-0000-0000-000000000022'
    returning id
  $$,
  array[]::uuid[],
  'an owner should not delete another organization item'
);

select results_eq(
  $$
    delete from public.catalog_items
    where id = '13000000-0000-0000-0000-000000000021'
    returning id
  $$,
  array['13000000-0000-0000-0000-000000000021'::uuid],
  'an owner should delete their catalog item'
);

select results_eq(
  $$
    delete from public.catalog_categories
    where id = '12000000-0000-0000-0000-000000000021'
    returning id
  $$,
  array['12000000-0000-0000-0000-000000000021'::uuid],
  'an owner should delete their empty category'
);

select * from finish();
rollback;
