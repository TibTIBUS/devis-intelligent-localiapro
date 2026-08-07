begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

select has_table('public', 'customers', 'customers should exist');
select has_table('public', 'customer_contacts', 'customer contacts should exist');
select has_table('public', 'customer_addresses', 'customer addresses should exist');
select col_is_pk('public', 'customers', 'id', 'customer id should be the primary key');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.customer_contacts'::regclass
      and conname = 'customer_contacts_customer_organization_fkey'
      and contype = 'f'
  ),
  'customer contacts should enforce their composite customer foreign key'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.customer_addresses'::regclass
      and conname = 'customer_addresses_customer_organization_fkey'
      and contype = 'f'
  ),
  'customer addresses should enforce their composite customer foreign key'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.customers'::regclass),
  'customers should have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.customer_contacts'::regclass),
  'customer contacts should have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.customer_addresses'::regclass),
  'customer addresses should have RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.customers', 'select'),
  'anonymous users should not read customers'
);
select ok(
  not has_table_privilege('anon', 'public.customer_contacts', 'select'),
  'anonymous users should not read customer contacts'
);
select ok(
  not has_table_privilege('anon', 'public.customer_addresses', 'select'),
  'anonymous users should not read customer addresses'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000041',
    'authenticated', 'authenticated', 'customer-owner-a@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000042',
    'authenticated', 'authenticated', 'customer-owner-b@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.organizations (id, name, trade, created_by)
values
  (
    '10000000-0000-0000-0000-000000000041', 'Clients A', 'Plomberie',
    '00000000-0000-0000-0000-000000000041'
  ),
  (
    '20000000-0000-0000-0000-000000000042', 'Clients B', 'Electricite',
    '00000000-0000-0000-0000-000000000042'
  );

insert into public.organization_members (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000041', 'owner'
  ),
  (
    '20000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000042', 'owner'
  );

insert into public.customers (id, organization_id, display_name)
values (
  '21000000-0000-0000-0000-000000000042',
  '20000000-0000-0000-0000-000000000042',
  'Client B'
);

insert into public.customer_contacts (
  id, organization_id, customer_id, name, email, is_primary
)
values (
  '22000000-0000-0000-0000-000000000042',
  '20000000-0000-0000-0000-000000000042',
  '21000000-0000-0000-0000-000000000042',
  'Contact B', 'contact-b@example.test', true
);

insert into public.customer_addresses (
  id, organization_id, customer_id, label, address_line_1,
  postal_code, city, is_primary
)
values (
  '23000000-0000-0000-0000-000000000042',
  '20000000-0000-0000-0000-000000000042',
  '21000000-0000-0000-0000-000000000042',
  'Principale', '2 rue Client B', '69001', 'Lyon', true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);

select lives_ok(
  $$
    insert into public.customers (id, organization_id, display_name)
    values (
      '11000000-0000-0000-0000-000000000041',
      '10000000-0000-0000-0000-000000000041',
      'Jean Dupont'
    )
  $$,
  'an owner should create a customer for their organization'
);

select lives_ok(
  $$
    insert into public.customer_contacts (
      id, organization_id, customer_id, name, email, phone, is_primary
    ) values (
      '12000000-0000-0000-0000-000000000041',
      '10000000-0000-0000-0000-000000000041',
      '11000000-0000-0000-0000-000000000041',
      'Jean Dupont', 'jean@example.test', '0102030405', true
    )
  $$,
  'an owner should create a contact for their customer'
);

select lives_ok(
  $$
    insert into public.customer_addresses (
      id, organization_id, customer_id, label, address_line_1,
      postal_code, city, is_primary
    ) values (
      '13000000-0000-0000-0000-000000000041',
      '10000000-0000-0000-0000-000000000041',
      '11000000-0000-0000-0000-000000000041',
      'Principale', '1 rue des Clients', '75001', 'Paris', true
    )
  $$,
  'an owner should create an address for their customer'
);

select throws_ok(
  $$
    insert into public.customer_contacts (organization_id, customer_id)
    values (
      '10000000-0000-0000-0000-000000000041',
      '11000000-0000-0000-0000-000000000041'
    )
  $$,
  '23514', null,
  'an empty customer contact should be rejected'
);

select throws_ok(
  $$
    insert into public.customers (organization_id, display_name)
    values ('20000000-0000-0000-0000-000000000042', 'Interdit')
  $$,
  '42501', null,
  'an owner should not create a customer for another organization'
);

select throws_ok(
  $$
    insert into public.customer_contacts (
      organization_id, customer_id, email
    ) values (
      '20000000-0000-0000-0000-000000000042',
      '21000000-0000-0000-0000-000000000042',
      'interdit@example.test'
    )
  $$,
  '42501', null,
  'an owner should not create a contact for another organization'
);

select throws_ok(
  $$
    insert into public.customer_contacts (
      organization_id, customer_id, email
    ) values (
      '10000000-0000-0000-0000-000000000041',
      '21000000-0000-0000-0000-000000000042',
      'rattachement@example.test'
    )
  $$,
  '23503', null,
  'a contact should not reference another organization customer'
);

select throws_ok(
  $$
    insert into public.customer_addresses (
      organization_id, customer_id, address_line_1, postal_code, city
    ) values (
      '20000000-0000-0000-0000-000000000042',
      '21000000-0000-0000-0000-000000000042',
      'Adresse interdite', '69001', 'Lyon'
    )
  $$,
  '42501', null,
  'an owner should not create an address for another organization'
);

select results_eq(
  $$ select display_name from public.customers order by display_name $$,
  array['Jean Dupont'::text],
  'an owner should only read their customers'
);

select results_eq(
  $$ select email from public.customer_contacts order by email $$,
  array['jean@example.test'::text],
  'an owner should only read their customer contacts'
);

select results_eq(
  $$ select city from public.customer_addresses order by city $$,
  array['Paris'::text],
  'an owner should only read their customer addresses'
);

select results_eq(
  $$
    update public.customers
    set display_name = 'Jean Dupont mis a jour'
    where id = '11000000-0000-0000-0000-000000000041'
    returning display_name
  $$,
  array['Jean Dupont mis a jour'::text],
  'an owner should update their customer'
);

select results_eq(
  $$
    update public.customers
    set display_name = 'Tentative interdite'
    where id = '21000000-0000-0000-0000-000000000042'
    returning id
  $$,
  array[]::uuid[],
  'an owner should not update another organization customer'
);

select throws_ok(
  $$
    insert into public.customer_contacts (
      organization_id, customer_id, name, is_primary
    ) values (
      '10000000-0000-0000-0000-000000000041',
      '11000000-0000-0000-0000-000000000041',
      'Second contact', true
    )
  $$,
  '23505', null,
  'a customer should have at most one primary contact'
);

select throws_ok(
  $$
    insert into public.customer_addresses (
      organization_id, customer_id, address_line_1, postal_code, city, is_primary
    ) values (
      '10000000-0000-0000-0000-000000000041',
      '11000000-0000-0000-0000-000000000041',
      'Deuxieme adresse', '75002', 'Paris', true
    )
  $$,
  '23505', null,
  'a customer should have at most one primary address'
);

select results_eq(
  $$
    delete from public.customers
    where id = '21000000-0000-0000-0000-000000000042'
    returning id
  $$,
  array[]::uuid[],
  'an owner should not delete another organization customer'
);

select results_eq(
  $$
    delete from public.customers
    where id = '11000000-0000-0000-0000-000000000041'
    returning id
  $$,
  array['11000000-0000-0000-0000-000000000041'::uuid],
  'an owner should delete their customer'
);

select is_empty(
  $$
    select id from public.customer_contacts
    where customer_id = '11000000-0000-0000-0000-000000000041'
  $$,
  'deleting a customer should delete their contacts'
);

select is_empty(
  $$
    select id from public.customer_addresses
    where customer_id = '11000000-0000-0000-0000-000000000041'
  $$,
  'deleting a customer should delete their addresses'
);

select * from finish();
rollback;
