begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

select has_table('public', 'quotes', 'quotes should exist');
select has_table('public', 'quote_sections', 'quote sections should exist');
select has_table('public', 'quote_lines', 'quote lines should exist');
select col_is_pk('public', 'quotes', 'id', 'quote id should be the primary key');
select col_is_pk('public', 'quote_sections', 'id', 'quote section id should be the primary key');
select col_is_pk('public', 'quote_lines', 'id', 'quote line id should be the primary key');
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.quotes'::regclass and conname = 'quotes_customer_organization_fkey' and contype = 'f'),
  'quotes should enforce their composite customer foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.quote_sections'::regclass and conname = 'quote_sections_quote_organization_fkey' and contype = 'f'),
  'quote sections should enforce their composite quote foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.quote_lines'::regclass and conname = 'quote_lines_quote_organization_fkey' and contype = 'f'),
  'quote lines should enforce their composite quote foreign key'
);
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.quote_lines'::regclass and conname = 'quote_lines_section_quote_organization_fkey' and contype = 'f'),
  'quote lines should enforce their composite section foreign key'
);
select ok((select relrowsecurity from pg_class where oid = 'public.quotes'::regclass), 'quotes should have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.quote_sections'::regclass), 'quote sections should have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.quote_lines'::regclass), 'quote lines should have RLS enabled');
select ok(not has_table_privilege('anon', 'public.quotes', 'select'), 'anonymous users should not read quotes');
select ok(not has_table_privilege('anon', 'public.quote_sections', 'select'), 'anonymous users should not read quote sections');
select ok(not has_table_privilege('anon', 'public.quote_lines', 'select'), 'anonymous users should not read quote lines');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000051', 'authenticated', 'authenticated', 'quote-owner-a@example.test', 'not-used-in-tests', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000052', 'authenticated', 'authenticated', 'quote-owner-b@example.test', 'not-used-in-tests', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, trade, created_by)
values
  ('10000000-0000-0000-0000-000000000051', 'Devis A', 'Plomberie', '00000000-0000-0000-0000-000000000051'),
  ('20000000-0000-0000-0000-000000000052', 'Devis B', 'Electricite', '00000000-0000-0000-0000-000000000052');

insert into public.organization_members (organization_id, user_id, role)
values
  ('10000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000051', 'owner'),
  ('20000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000052', 'owner');

insert into public.customers (id, organization_id, display_name)
values
  ('21000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', 'Client A'),
  ('21000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000052', 'Client B');

insert into public.quotes (id, organization_id, customer_id)
values ('31000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000052', '21000000-0000-0000-0000-000000000052');
insert into public.quote_sections (id, organization_id, quote_id, title)
values ('32000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000052', '31000000-0000-0000-0000-000000000052', 'Section B');
insert into public.quote_lines (id, organization_id, quote_id, section_id, label, unit, quantity_milliunits)
values ('33000000-0000-0000-0000-000000000052', '20000000-0000-0000-0000-000000000052', '31000000-0000-0000-0000-000000000052', '32000000-0000-0000-0000-000000000052', 'Ligne B', 'unite', 1000);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000051', true);

select lives_ok(
  $$ insert into public.quotes (id, organization_id, customer_id) values ('31000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', '21000000-0000-0000-0000-000000000051') $$,
  'an owner should create a quote for their customer'
);
select lives_ok(
  $$ insert into public.quote_sections (id, organization_id, quote_id, title) values ('32000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', '31000000-0000-0000-0000-000000000051', 'Section A') $$,
  'an owner should create a section for their quote'
);
select lives_ok(
  $$ insert into public.quote_lines (id, organization_id, quote_id, section_id, label, unit, quantity_milliunits) values ('33000000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', '31000000-0000-0000-0000-000000000051', '32000000-0000-0000-0000-000000000051', 'Ligne A', 'heure', 1000) $$,
  'an owner should create a line inside a section'
);
select lives_ok(
  $$ insert into public.quote_lines (id, organization_id, quote_id, label, unit, quantity_milliunits) values ('33100000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', '31000000-0000-0000-0000-000000000051', 'Ligne libre', 'forfait', 1000) $$,
  'a quote line may remain outside a section'
);
select throws_ok(
  $$ insert into public.quotes (organization_id, customer_id) values ('20000000-0000-0000-0000-000000000052', '21000000-0000-0000-0000-000000000052') $$,
  '42501', null, 'an owner should not create a quote for another organization'
);
select throws_ok(
  $$ insert into public.quotes (organization_id, customer_id) values ('10000000-0000-0000-0000-000000000051', '21000000-0000-0000-0000-000000000052') $$,
  '23503', null, 'a quote should not reference another organization customer'
);
select throws_ok(
  $$ insert into public.quote_sections (organization_id, quote_id, title) values ('20000000-0000-0000-0000-000000000052', '31000000-0000-0000-0000-000000000052', 'Interdite') $$,
  '42501', null, 'an owner should not create a section for another organization'
);
select throws_ok(
  $$ insert into public.quote_sections (organization_id, quote_id, title) values ('10000000-0000-0000-0000-000000000051', '31000000-0000-0000-0000-000000000052', 'Interdite') $$,
  '23503', null, 'a section should not reference another organization quote'
);
select throws_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits) values ('20000000-0000-0000-0000-000000000052', '31000000-0000-0000-0000-000000000052', 'Interdite', 'unite', 1000) $$,
  '42501', null, 'an owner should not create a line for another organization'
);
select throws_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits) values ('10000000-0000-0000-0000-000000000051', '31000000-0000-0000-0000-000000000052', 'Interdite', 'unite', 1000) $$,
  '23503', null, 'a line should not reference another organization quote'
);

insert into public.quotes (id, organization_id, customer_id)
values ('31100000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', '21000000-0000-0000-0000-000000000051');
insert into public.quote_sections (id, organization_id, quote_id, title)
values ('32100000-0000-0000-0000-000000000051', '10000000-0000-0000-0000-000000000051', '31100000-0000-0000-0000-000000000051', 'Autre section');

select throws_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, section_id, label, unit, quantity_milliunits) values ('10000000-0000-0000-0000-000000000051', '31000000-0000-0000-0000-000000000051', '32100000-0000-0000-0000-000000000051', 'Interdite', 'unite', 1000) $$,
  '23503', null, 'a line should not reference a section from another quote'
);
select is((select count(*) from public.quotes), 2::bigint, 'an owner should only read their quotes');
select is((select count(*) from public.quote_sections), 2::bigint, 'an owner should only read their quote sections');
select is((select count(*) from public.quote_lines), 2::bigint, 'an owner should only read their quote lines');
select results_eq(
  $$ update public.quotes set updated_at = now() where id = '31000000-0000-0000-0000-000000000051' returning id $$,
  array['31000000-0000-0000-0000-000000000051'::uuid], 'an owner should update their quote'
);
select results_eq(
  $$ update public.quotes set updated_at = now() where id = '31000000-0000-0000-0000-000000000052' returning id $$,
  array[]::uuid[], 'an owner should not update another organization quote'
);
select results_eq(
  $$ delete from public.quotes where id = '31000000-0000-0000-0000-000000000052' returning id $$,
  array[]::uuid[], 'an owner should not delete another organization quote'
);
select throws_ok(
  $$ delete from public.customers where id = '21000000-0000-0000-0000-000000000051' $$,
  '23503', null, 'a customer referenced by a quote should not be deleted'
);
select throws_ok(
  $$ delete from public.quote_sections where id = '32000000-0000-0000-0000-000000000051' $$,
  '23503', null, 'a section containing lines should not be deleted directly'
);
select results_eq(
  $$ delete from public.quotes where id = '31000000-0000-0000-0000-000000000051' returning id $$,
  array['31000000-0000-0000-0000-000000000051'::uuid], 'an owner should delete their quote'
);
select is_empty(
  $$ select id from public.quote_sections where quote_id = '31000000-0000-0000-0000-000000000051' $$,
  'deleting a quote should delete its sections'
);
select is_empty(
  $$ select id from public.quote_lines where quote_id = '31000000-0000-0000-0000-000000000051' $$,
  'deleting a quote should delete its lines'
);

select * from finish();
rollback;
