begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'quote_ai_actions', 'AI quote actions should exist');
select ok((select relrowsecurity from pg_class where oid = 'public.quote_ai_actions'::regclass), 'AI quote actions should have RLS enabled');
select ok(not has_table_privilege('anon', 'public.quote_ai_actions', 'select'), 'anonymous users should not read AI actions');
select ok(not has_table_privilege('authenticated', 'public.quote_ai_actions', 'delete'), 'authenticated users should not delete the audit trail');
select has_function('public', 'add_catalog_quote_line', array['uuid', 'uuid', 'uuid', 'bigint', 'text', 'integer'], 'the controlled add function should exist');
select has_function('public', 'undo_last_ai_quote_action', array['uuid', 'uuid'], 'the undo function should exist');
select ok(not has_function_privilege('anon', 'public.add_catalog_quote_line(uuid,uuid,uuid,bigint,text,integer)', 'EXECUTE'), 'anonymous users should not add quote lines');
select ok(not has_function_privilege('anon', 'public.undo_last_ai_quote_action(uuid,uuid)', 'EXECUTE'), 'anonymous users should not undo quote actions');
select ok(has_function_privilege('authenticated', 'public.add_catalog_quote_line(uuid,uuid,uuid,bigint,text,integer)', 'EXECUTE'), 'authenticated users may use the controlled add function');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000091', 'authenticated', 'authenticated', 'ai-owner-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000092', 'authenticated', 'authenticated', 'ai-owner-b@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.organizations (id, name, trade, created_by) values
  ('10000000-0000-0000-0000-000000000091', 'IA devis A', 'Plomberie', '00000000-0000-0000-0000-000000000091'),
  ('10000000-0000-0000-0000-000000000092', 'IA devis B', 'Electricite', '00000000-0000-0000-0000-000000000092');
insert into public.organization_members (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000091', 'owner'),
  ('10000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000092', 'owner');
insert into public.customers (id, organization_id, display_name) values
  ('21000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'Client IA A'),
  ('21000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000092', 'Client IA B');
insert into public.quotes (id, organization_id, customer_id) values
  ('31000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '21000000-0000-0000-0000-000000000091'),
  ('31000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000092', '21000000-0000-0000-0000-000000000092');
insert into public.catalog_items (id, organization_id, name, unit, unit_price_ht_cents) values
  ('13000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'Main oeuvre plomberie', 'heure', 5500),
  ('13100000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'Tarif manquant', 'forfait', null),
  ('13000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000092', 'Prestation B', 'heure', 9000);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);

select lives_ok(
  $$ select * from public.add_catalog_quote_line('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', '13000000-0000-0000-0000-000000000091', 4000, 'labor', 1000) $$,
  'an owner should confirm a catalog line for their draft quote'
);
select is((select count(*) from public.quote_lines where quote_id = '31000000-0000-0000-0000-000000000091'), 1::bigint, 'confirmation should create one quote line');
select is((select unit_price_ht_cents from public.quote_lines where quote_id = '31000000-0000-0000-0000-000000000091'), 5500::bigint, 'the quote line should copy the catalog price');
select is((select quantity_milliunits from public.quote_lines where quote_id = '31000000-0000-0000-0000-000000000091'), 4000::bigint, 'the server should preserve the confirmed quantity');
select is((select vat_rate_basis_points from public.quote_lines where quote_id = '31000000-0000-0000-0000-000000000091'), 1000, 'the server should preserve the confirmed VAT rate');
select is((select count(*) from public.quote_ai_actions), 1::bigint, 'confirmation should create one actor-scoped audit entry');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000092', true);
select is((select count(*) from public.quote_ai_actions), 0::bigint, 'another actor should not read the audit entry');
select throws_ok(
  $$ select * from public.undo_last_ai_quote_action('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091') $$,
  'P0002', null, 'another actor should not undo the addition'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);

select throws_ok(
  $$ select * from public.add_catalog_quote_line('10000000-0000-0000-0000-000000000092', '31000000-0000-0000-0000-000000000092', '13000000-0000-0000-0000-000000000092', 1000, 'service', 2000) $$,
  'P0002', null, 'an owner should not add a line from another organization'
);
select throws_ok(
  $$ select * from public.add_catalog_quote_line('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', '13100000-0000-0000-0000-000000000091', 1000, 'service', 2000) $$,
  '22023', null, 'a catalog item without a price should be rejected'
);
select lives_ok(
  $$ select * from public.undo_last_ai_quote_action('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091') $$,
  'the actor should undo their latest AI addition'
);
select is((select count(*) from public.quote_lines where quote_id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'undo should remove the added line');
select is((select count(*) from public.quote_ai_actions where undone_at is not null), 1::bigint, 'undo should retain and mark the audit entry');

select * from finish();
rollback;
