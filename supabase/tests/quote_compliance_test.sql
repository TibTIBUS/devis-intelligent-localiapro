begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select has_table('public', 'legal_rules_versions', 'legal rules versions should exist');
select has_column('public', 'company_legal_information', 'professional_insurance_required', 'company should declare insurance applicability');
select has_column('public', 'quotes', 'preparation_fee_ht_cents', 'quotes should store a paid preparation fee');
select has_column('public', 'quotes', 'travel_fee_applicable', 'quotes should declare travel fee applicability');
select has_column('public', 'quote_lines', 'line_kind', 'quote lines should identify their nature');
select has_column('public', 'quote_versions', 'legal_rules_version_id', 'quote versions should reference their legal rules');
select has_column('public', 'quote_versions', 'compliance_snapshot', 'quote versions should preserve compliance data');
select has_function('public', 'validate_quote_compliance', array['uuid'], 'the compliance validation RPC should exist');
select ok((select relrowsecurity from pg_class where oid = 'public.legal_rules_versions'::regclass), 'legal rules versions should have RLS enabled');
select ok(not has_table_privilege('anon', 'public.legal_rules_versions', 'select'), 'anonymous users should not read legal rules');
select ok(not has_function_privilege('anon', 'public.validate_quote_compliance(uuid)', 'EXECUTE'), 'anonymous users should not validate quotes');
select ok(has_function_privilege('authenticated', 'public.validate_quote_compliance(uuid)', 'EXECUTE'), 'authenticated users should validate their quotes');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000081', 'authenticated', 'authenticated', 'compliance-a@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000082', 'authenticated', 'authenticated', 'compliance-b@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.organizations (id, name, trade, created_by) values
  ('10000000-0000-0000-0000-000000000081', 'Conformite A', 'Plomberie', '00000000-0000-0000-0000-000000000081'),
  ('10000000-0000-0000-0000-000000000082', 'Conformite B', 'Electricite', '00000000-0000-0000-0000-000000000082');
insert into public.organization_members (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081', 'owner'),
  ('10000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000082', 'owner');
insert into public.company_legal_information (organization_id, legal_name, legal_form, share_capital_cents, professional_insurance_required, siren, siret, vat_number, registration_city, address_line_1, postal_code, city) values
  ('10000000-0000-0000-0000-000000000081', 'Conformite A SARL', 'SARL', 100000, true, '123456789', '12345678900081', 'FR12123456789', 'Paris', '1 rue Test', '75001', 'Paris'),
  ('10000000-0000-0000-0000-000000000082', 'Conformite B SARL', 'SARL', 100000, false, '987654321', '98765432100082', 'FR12987654321', 'Lyon', '2 rue Test', '69001', 'Lyon');
insert into public.company_insurances (organization_id, insurance_type, insurer_name, insurer_contact_details, policy_number, geographic_coverage, valid_from, valid_until) values
  ('10000000-0000-0000-0000-000000000081', 'Responsabilite civile professionnelle', 'Assureur A', '10 rue Assurance', 'POLICE-A', 'France', current_date - 30, current_date + 30);
insert into public.customers (id, organization_id, display_name) values
  ('21000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', 'Client A'),
  ('21000000-0000-0000-0000-000000000082', '10000000-0000-0000-0000-000000000082', 'Client B');
insert into public.customer_addresses (id, organization_id, customer_id, address_line_1, postal_code, city) values
  ('22000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', '21000000-0000-0000-0000-000000000081', '3 rue Chantier', '75002', 'Paris'),
  ('22000000-0000-0000-0000-000000000082', '10000000-0000-0000-0000-000000000082', '21000000-0000-0000-0000-000000000082', '4 rue Chantier', '69002', 'Lyon');
insert into public.quotes (id, organization_id, customer_id, valid_until, is_quote_free, travel_fee_applicable, work_address_id) values
  ('31000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', '21000000-0000-0000-0000-000000000081', timezone('Europe/Paris', now())::date + 30, true, false, '22000000-0000-0000-0000-000000000081'),
  ('31100000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', '21000000-0000-0000-0000-000000000081', timezone('Europe/Paris', now())::date + 30, true, null, '22000000-0000-0000-0000-000000000081'),
  ('31000000-0000-0000-0000-000000000082', '10000000-0000-0000-0000-000000000082', '21000000-0000-0000-0000-000000000082', timezone('Europe/Paris', now())::date + 30, true, false, '22000000-0000-0000-0000-000000000082');
insert into public.quote_lines (organization_id, quote_id, label, line_kind, unit, quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points) values
  ('10000000-0000-0000-0000-000000000081', '31000000-0000-0000-0000-000000000081', 'Main oeuvre plomberie', 'labor', 'heure', 2000, 5000, 2000),
  ('10000000-0000-0000-0000-000000000081', '31100000-0000-0000-0000-000000000081', 'Intervention', 'service', 'forfait', 1000, 9000, 2000),
  ('10000000-0000-0000-0000-000000000082', '31000000-0000-0000-0000-000000000082', 'Intervention', 'service', 'forfait', 1000, 8000, 2000);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000081', true);

select is((select code from public.legal_rules_versions where id = 'a1000000-0000-4000-8000-000000000001'), 'FR-BUILDING-QUOTE-2017-01', 'authenticated users should read the active legal rules version');
select is((public.validate_quote_compliance('31000000-0000-0000-0000-000000000081') ->> 'valid')::boolean, true, 'a complete quote should be compliant');
select is(jsonb_array_length(public.validate_quote_compliance('31000000-0000-0000-0000-000000000081') -> 'errors'), 0, 'a complete quote should have no blocking error');
update public.company_legal_information set share_capital_cents = null where organization_id = '10000000-0000-0000-0000-000000000081';
select is((public.validate_quote_compliance('31000000-0000-0000-0000-000000000081') ->> 'valid')::boolean, false, 'a capital company without capital should be blocked');
select is(public.validate_quote_compliance('31000000-0000-0000-0000-000000000081') #>> '{errors,0,code}', 'MISSING_SHARE_CAPITAL', 'corporate compliance should return a stable capital error');
update public.company_legal_information set share_capital_cents = 100000 where organization_id = '10000000-0000-0000-0000-000000000081';
select is((public.validate_quote_compliance('31100000-0000-0000-0000-000000000081') ->> 'valid')::boolean, false, 'a missing travel declaration should block compliance');
select is(public.validate_quote_compliance('31100000-0000-0000-0000-000000000081') #>> '{errors,0,code}', 'MISSING_TRAVEL_FEE_DECLARATION', 'compliance should return a stable error code');
select throws_ok($$ select public.validate_quote_compliance('31000000-0000-0000-0000-000000000082') $$, 'P0002', 'Quote not found.', 'RLS should hide another organization quote');
select throws_ok($$ insert into public.legal_rules_versions (code, jurisdiction, domain, effective_from, source_references) values ('FORGED', 'FR', 'test', current_date, '[]') $$, '42501', null, 'authenticated users should not forge legal rules');
set local role service_role;
select lives_ok($$ select * from public.finalize_quote('31000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081') $$, 'the server should finalize a compliant quote');
select is((select legal_rules_version_id from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000081'), 'a1000000-0000-4000-8000-000000000001'::uuid, 'the finalized version should reference the legal rules');
select is((select compliance_snapshot ->> 'professionalInsuranceRequired' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000081'), 'true', 'the snapshot should preserve insurance applicability');
select is((select compliance_snapshot #>> '{insurances,0,policy_number}' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000081'), 'POLICE-A', 'the snapshot should preserve the active insurance');
select is((select snapshot #>> '{lines,0,lineKind}' from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000081'), 'labor', 'the snapshot should preserve the line nature');
select throws_ok($$ select * from public.finalize_quote('31100000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081') $$, '23514', 'Quote compliance validation failed.', 'database finalization should enforce compliance');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000081', true);
select throws_ok($$ update public.quote_versions set compliance_snapshot = '{}' where quote_id = '31000000-0000-0000-0000-000000000081' $$, '42501', null, 'authenticated users should not mutate compliance snapshots');
select is((select count(*) from public.quote_versions), 1::bigint, 'RLS should expose only the current organization version');
select is((select count(*) from public.legal_rules_versions), 1::bigint, 'the active ruleset should be unique in this test');

select * from finish();
rollback;
