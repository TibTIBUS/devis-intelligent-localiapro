begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

select has_table('public', 'quote_versions', 'quote versions should exist');
select has_column('public', 'quotes', 'status', 'quotes should store their lifecycle status');
select has_column('public', 'quotes', 'quote_number', 'quotes should store a commercial number');
select has_column('public', 'quotes', 'sequence_year', 'quotes should store their sequence year');
select has_column('public', 'quotes', 'sequence_number', 'quotes should store their sequence number');
select has_column('public', 'quotes', 'issued_on', 'quotes should store their issue date');
select has_column('public', 'quotes', 'valid_until', 'quotes should store their validity date');
select has_column('public', 'quotes', 'is_quote_free', 'quotes should state whether they are free');
select has_column('public', 'quotes', 'work_address_id', 'quotes should reference their work address');
select has_column('public', 'quotes', 'finalized_at', 'quotes should store their finalization instant');
select ok((select relrowsecurity from pg_class where oid = 'public.quote_versions'::regclass), 'quote versions should have RLS enabled');
select has_function('public', 'finalize_quote', array['uuid', 'uuid', 'uuid'], 'the server-only finalization function should exist');
select ok(not has_function_privilege('anon', 'public.finalize_quote(uuid,uuid,uuid)', 'EXECUTE'), 'anonymous users should not finalize quotes');
select ok(not has_function_privilege('authenticated', 'public.finalize_quote(uuid,uuid,uuid)', 'EXECUTE'), 'authenticated users should not directly finalize quotes');
select ok(has_function_privilege('service_role', 'public.finalize_quote(uuid,uuid,uuid)', 'EXECUTE'), 'the server role should finalize quotes');
select ok(not has_column_privilege('authenticated', 'public.quotes', 'status', 'UPDATE'), 'authenticated users should not forge a status');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000071', 'authenticated', 'authenticated', 'quote-lifecycle-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000072', 'authenticated', 'authenticated', 'quote-lifecycle-b@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.organizations (id, name, trade, created_by) values
  ('10000000-0000-0000-0000-000000000071', 'Cycle devis A', 'Plomberie', '00000000-0000-0000-0000-000000000071'),
  ('10000000-0000-0000-0000-000000000072', 'Cycle devis B', 'Electricite', '00000000-0000-0000-0000-000000000072');
insert into public.organization_members (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000071', 'owner'),
  ('10000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000072', 'owner');
insert into public.company_legal_information (organization_id, legal_name, legal_form, share_capital_cents, registration_city, professional_insurance_required, siren, siret, address_line_1, postal_code, city)
values ('10000000-0000-0000-0000-000000000071', 'Cycle devis A SARL', 'SARL', 100000, 'Paris', false, '123456789', '12345678900012', '1 rue des Tests', '75001', 'Paris');
insert into public.customers (id, organization_id, display_name) values
  ('21000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', 'Client A'),
  ('21000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000072', 'Client B');
insert into public.customer_addresses (id, organization_id, customer_id, label, address_line_1, postal_code, city, is_primary) values
  ('22000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', '21000000-0000-0000-0000-000000000071', 'Chantier', '2 rue du Chantier', '75002', 'Paris', true),
  ('22000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000072', '21000000-0000-0000-0000-000000000072', 'Chantier', '3 rue du Chantier', '69001', 'Lyon', true);
insert into public.quotes (id, organization_id, customer_id, valid_until, is_quote_free, preparation_fee_ht_cents, preparation_fee_vat_rate_basis_points, travel_fee_applicable, work_address_id, payment_terms, note) values
  ('31000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', '21000000-0000-0000-0000-000000000071', timezone('Europe/Paris', now())::date + 30, true, null, null, false, '22000000-0000-0000-0000-000000000071', 'Paiement à réception', 'Protéger le parquet'),
  ('31100000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', '21000000-0000-0000-0000-000000000071', timezone('Europe/Paris', now())::date + 30, false, 2500, 2000, false, '22000000-0000-0000-0000-000000000071', null, null),
  ('31000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000072', '21000000-0000-0000-0000-000000000072', timezone('Europe/Paris', now())::date + 30, true, null, null, false, '22000000-0000-0000-0000-000000000072', null, null);
insert into public.quote_sections (id, organization_id, quote_id, title)
values ('32000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', '31000000-0000-0000-0000-000000000071', 'Travaux');
insert into public.quote_lines (id, organization_id, quote_id, section_id, label, unit, quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points) values
  ('33000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', '31000000-0000-0000-0000-000000000071', '32000000-0000-0000-0000-000000000071', 'Main oeuvre', 'heure', 2000, 5000, 2000),
  ('33100000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071', '31100000-0000-0000-0000-000000000071', null, 'Deplacement', 'forfait', 1000, 2500, 1000),
  ('33000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000072', '31000000-0000-0000-0000-000000000072', null, 'Intervention', 'forfait', 1000, 8000, 2000);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000071', true);

select lives_ok($$ update public.quotes set valid_until = valid_until + 1 where id = '31000000-0000-0000-0000-000000000071' $$, 'a draft quote should remain editable');
select throws_ok($$ select * from public.finalize_quote('31000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071') $$, '42501', null, 'authenticated users should not call finalization directly');

set local role service_role;
select throws_ok($$ select * from public.finalize_quote('31000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000072', '10000000-0000-0000-0000-000000000071') $$, '42501', 'Organization membership required.', 'the server should reject an actor outside the organization');
select lives_ok($$ select * from public.finalize_quote('31000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071') $$, 'the server should finalize for an organization member');
select is((select status from public.quotes where id = '31000000-0000-0000-0000-000000000071'), 'finalized', 'the quote should become finalized');
select matches((select quote_number from public.quotes where id = '31000000-0000-0000-0000-000000000071'), '^D-[0-9]{4}-00001$', 'the first annual number should be formatted');
select is((select issued_on from public.quotes where id = '31000000-0000-0000-0000-000000000071'), timezone('Europe/Paris', now())::date, 'the issue date should use the French calendar date');
select is((select count(*) from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), 1::bigint, 'finalization should create one version');
select is((select snapshot #>> '{lines,0,label}' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), 'Main oeuvre', 'the snapshot should preserve line content');
select is((select snapshot #>> '{customer,workAddress,address_line_1}' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), '2 rue du Chantier', 'the snapshot should preserve the work address');
select is((select snapshot #>> '{quote,paymentTerms}' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), 'Paiement à réception', 'the snapshot should preserve payment terms');
select is((select snapshot #>> '{quote,note}' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), 'Protéger le parquet', 'the snapshot should preserve the quote note');
select is((select compliance_snapshot ->> 'rulesVersion' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), 'FR-BUILDING-QUOTE-2017-01', 'the snapshot should preserve the compliance rules version');
select is((select snapshot #>> '{lines,0,lineKind}' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), 'service', 'the snapshot should preserve the line kind');
select lives_ok($$ select * from public.finalize_quote('31000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071') $$, 'repeating finalization should be idempotent');
select is((select count(*) from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000071'), 1::bigint, 'idempotence should not create another version');
select lives_ok($$ select * from public.finalize_quote('31100000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071') $$, 'a second complete quote should finalize');
select matches((select quote_number from public.quotes where id = '31100000-0000-0000-0000-000000000071'), '^D-[0-9]{4}-00002$', 'the annual sequence should increment');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000071', true);
select throws_ok($$ update public.quotes set discount_rate_basis_points = 100 where id = '31000000-0000-0000-0000-000000000071' $$, '55000', null, 'a finalized quote should reject financial changes');
select throws_ok($$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits) values ('10000000-0000-0000-0000-000000000071', '31000000-0000-0000-0000-000000000071', 'Interdite', 'unite', 1000) $$, '55000', null, 'a finalized quote should reject new lines');
select throws_ok($$ update public.quote_lines set label = 'Interdite' where id = '33000000-0000-0000-0000-000000000071' $$, '55000', null, 'a finalized quote should reject line changes');
select throws_ok($$ delete from public.quote_lines where id = '33000000-0000-0000-0000-000000000071' $$, '55000', null, 'a finalized quote should reject line deletion');
select throws_ok($$ insert into public.quote_sections (organization_id, quote_id, title) values ('10000000-0000-0000-0000-000000000071', '31000000-0000-0000-0000-000000000071', 'Interdite') $$, '55000', null, 'a finalized quote should reject new sections');
select throws_ok($$ delete from public.quotes where id = '31000000-0000-0000-0000-000000000071' $$, '55000', null, 'a finalized quote should not be deletable');
select throws_ok($$ update public.quotes set status = 'draft' where id = '31000000-0000-0000-0000-000000000071' $$, '42501', null, 'authenticated users should not directly change lifecycle status');
select throws_ok($$ insert into public.quote_versions (organization_id, quote_id, version_number, quote_number, issued_on, snapshot) values ('10000000-0000-0000-0000-000000000071', '31000000-0000-0000-0000-000000000071', 2, 'D-2099-99999', current_date, '{}') $$, '42501', null, 'authenticated users should not forge quote versions');
set local role service_role;
select throws_ok($$ select * from public.finalize_quote('31000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000071', '10000000-0000-0000-0000-000000000071') $$, 'P0002', null, 'the server should reject a quote outside the validated organization');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000071', true);
select is((select count(*) from public.quote_versions), 2::bigint, 'RLS should expose only the current organization versions');

select * from finish();
rollback;
