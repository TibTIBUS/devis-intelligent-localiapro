begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table(
  'public',
  'catalog_price_history',
  'catalog price history should exist'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.catalog_price_history'::regclass
      and conname = 'catalog_price_history_item_organization_fkey'
      and contype = 'f'
  ),
  'catalog price history should enforce its composite item foreign key'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.catalog_price_history'::regclass),
  'catalog price history should have RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.catalog_price_history', 'select'),
  'anonymous users should not read price history'
);
select ok(
  has_table_privilege('authenticated', 'public.catalog_price_history', 'select'),
  'authenticated users should receive read access to price history'
);
select ok(
  not has_table_privilege('authenticated', 'public.catalog_price_history', 'insert'),
  'authenticated users should not insert price history directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.catalog_price_history', 'update'),
  'authenticated users should not update price history directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.catalog_price_history', 'delete'),
  'authenticated users should not delete price history directly'
);
select is_empty(
  $$
    select routine_name
    from information_schema.routine_privileges
    where routine_schema = 'private'
      and routine_name = 'record_catalog_price_history'
      and grantee = 'PUBLIC'
  $$,
  'the private history trigger should not be executable by PUBLIC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000031',
    'authenticated', 'authenticated', 'history-owner-a@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000032',
    'authenticated', 'authenticated', 'history-owner-b@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.organizations (id, name, trade, created_by)
values
  (
    '10000000-0000-0000-0000-000000000031', 'Historique A', 'Plomberie',
    '00000000-0000-0000-0000-000000000031'
  ),
  (
    '20000000-0000-0000-0000-000000000032', 'Historique B', 'Electricite',
    '00000000-0000-0000-0000-000000000032'
  );

insert into public.organization_members (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000031', 'owner'
  ),
  (
    '20000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000032', 'owner'
  );

insert into public.catalog_categories (id, organization_id, name)
values
  (
    '12000000-0000-0000-0000-000000000031',
    '10000000-0000-0000-0000-000000000031',
    'Plomberie'
  ),
  (
    '22000000-0000-0000-0000-000000000032',
    '20000000-0000-0000-0000-000000000032',
    'Electricite'
  );

insert into public.catalog_items (
  id, organization_id, category_id, name, unit, unit_price_ht_cents
)
values (
  '23000000-0000-0000-0000-000000000032',
  '20000000-0000-0000-0000-000000000032',
  '22000000-0000-0000-0000-000000000032',
  'Pose prise', 'unite', 6500
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000031', true);

select lives_ok(
  $$
    insert into public.catalog_items (
      id, organization_id, category_id, name, unit, unit_price_ht_cents
    ) values (
      '13000000-0000-0000-0000-000000000031',
      '10000000-0000-0000-0000-000000000031',
      '12000000-0000-0000-0000-000000000031',
      'Main-d''oeuvre plomberie', 'heure', null
    )
  $$,
  'creating a catalog item should record its initial price state'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.catalog_price_history
    where catalog_item_id = '13000000-0000-0000-0000-000000000031'
  $$,
  array[1::bigint],
  'a new catalog item should have one history entry'
);

select is(
  (
    select unit_price_ht_cents
    from public.catalog_price_history
    where catalog_item_id = '13000000-0000-0000-0000-000000000031'
  ),
  null::bigint,
  'an unknown initial price should be recorded as null'
);

select results_eq(
  $$
    update public.catalog_items
    set unit_price_ht_cents = 5590
    where id = '13000000-0000-0000-0000-000000000031'
    returning unit_price_ht_cents
  $$,
  array[5590::bigint],
  'updating a catalog price should succeed'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.catalog_price_history
    where catalog_item_id = '13000000-0000-0000-0000-000000000031'
      and unit_price_ht_cents = 5590
  $$,
  array[1::bigint],
  'a known price should be appended to history'
);

select lives_ok(
  $$
    update public.catalog_items
    set unit_price_ht_cents = 5590
    where id = '13000000-0000-0000-0000-000000000031'
  $$,
  'saving an unchanged price should succeed'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.catalog_price_history
    where catalog_item_id = '13000000-0000-0000-0000-000000000031'
  $$,
  array[2::bigint],
  'saving an unchanged price should not duplicate history'
);

select lives_ok(
  $$
    update public.catalog_items
    set unit_price_ht_cents = null
    where id = '13000000-0000-0000-0000-000000000031'
  $$,
  'returning a catalog price to unknown should succeed'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.catalog_price_history
    where catalog_item_id = '13000000-0000-0000-0000-000000000031'
  $$,
  array[3::bigint],
  'returning a price to unknown should append history'
);

select results_eq(
  $$
    select distinct catalog_item_id
    from public.catalog_price_history
    order by catalog_item_id
  $$,
  array['13000000-0000-0000-0000-000000000031'::uuid],
  'an owner should only read their organization price history'
);

select results_eq(
  $$
    delete from public.catalog_items
    where id = '13000000-0000-0000-0000-000000000031'
    returning id
  $$,
  array['13000000-0000-0000-0000-000000000031'::uuid],
  'an owner should still delete their catalog item'
);

select is_empty(
  $$
    select id
    from public.catalog_price_history
    where catalog_item_id = '13000000-0000-0000-0000-000000000031'
  $$,
  'deleting a catalog item should remove its price history'
);

select * from finish();
rollback;
