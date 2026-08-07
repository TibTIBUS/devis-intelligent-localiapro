begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select has_table('public', 'company_legal_information', 'company legal information should exist');
select has_table('public', 'company_insurances', 'company insurances should exist');
select col_is_pk(
  'public', 'company_legal_information', 'organization_id',
  'legal information should have one row per organization'
);
select col_is_fk(
  'public', 'company_insurances', 'organization_id',
  'insurance organization should be a foreign key'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.company_legal_information'::regclass),
  'company legal information should have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class
    where oid = 'public.company_insurances'::regclass),
  'company insurances should have RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.company_legal_information', 'select'),
  'anonymous users should not read legal information'
);
select ok(
  not has_table_privilege('anon', 'public.company_insurances', 'select'),
  'anonymous users should not read insurance information'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000011',
    'authenticated', 'authenticated', 'company-owner-a@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000012',
    'authenticated', 'authenticated', 'company-owner-b@example.test',
    'not-used-in-tests', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.organizations (id, name, trade, created_by)
values
  (
    '10000000-0000-0000-0000-000000000011', 'Entreprise A', 'Plomberie',
    '00000000-0000-0000-0000-000000000011'
  ),
  (
    '20000000-0000-0000-0000-000000000012', 'Entreprise B', 'Electricite',
    '00000000-0000-0000-0000-000000000012'
  );

insert into public.organization_members (organization_id, user_id, role)
values
  (
    '10000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000011', 'owner'
  ),
  (
    '20000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000012', 'owner'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select lives_ok(
  $$
    insert into public.company_legal_information (
      organization_id, legal_name, legal_form, share_capital_cents, siren, siret,
      vat_number, registration_city, address_line_1, postal_code, city
    ) values (
      '10000000-0000-0000-0000-000000000011', 'Plomberie A', 'SARL', 100000,
      '123456789', '12345678900011', 'FR12123456789', 'Paris',
      '1 rue des Artisans', '75001', 'Paris'
    )
  $$,
  'an owner should insert legal information for their organization'
);

select throws_ok(
  $$
    insert into public.company_legal_information (
      organization_id, legal_name, siren, siret, address_line_1, postal_code, city
    ) values (
      '10000000-0000-0000-0000-000000000011', 'Identifiants incoherents',
      '123456789', '98765432100011', '1 rue Test', '75001', 'Paris'
    )
  $$,
  '23514', null,
  'SIRET should start with SIREN'
);

select throws_ok(
  $$
    insert into public.company_legal_information (
      organization_id, legal_name, siren, siret, address_line_1, postal_code, city
    ) values (
      '20000000-0000-0000-0000-000000000012', 'Entreprise B',
      '987654321', '98765432100012', '2 rue Test', '69001', 'Lyon'
    )
  $$,
  '42501', null,
  'an owner should not insert legal information for another organization'
);

reset role;

insert into public.company_legal_information (
  organization_id, legal_name, siren, siret, address_line_1, postal_code, city
) values (
  '20000000-0000-0000-0000-000000000012', 'Entreprise B',
  '987654321', '98765432100012', '2 rue Test', '69001', 'Lyon'
);

insert into public.company_insurances (
  id, organization_id, insurance_type, insurer_name, insurer_contact_details,
  policy_number, geographic_coverage
) values (
  '30000000-0000-0000-0000-000000000012',
  '20000000-0000-0000-0000-000000000012',
  'Responsabilite civile professionnelle', 'Assureur B',
  '20 avenue des Assurances, 69001 Lyon', 'POLICE-B-EXISTANTE', 'France'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select results_eq(
  $$ select legal_name from public.company_legal_information $$,
  array['Plomberie A'::text],
  'an owner should only read their legal information'
);

select results_eq(
  $$
    update public.company_legal_information
    set address_line_1 = '3 rue Mise a jour'
    where organization_id = '10000000-0000-0000-0000-000000000011'
    returning address_line_1
  $$,
  array['3 rue Mise a jour'::text],
  'an owner should update their legal information'
);

select results_eq(
  $$
    update public.company_legal_information
    set address_line_1 = 'Tentative interdite'
    where organization_id = '20000000-0000-0000-0000-000000000012'
    returning organization_id
  $$,
  array[]::uuid[],
  'an owner should not update another organization legal information'
);

select lives_ok(
  $$
    insert into public.company_insurances (
      id, organization_id, insurance_type, insurer_name,
      insurer_contact_details, policy_number, geographic_coverage,
      activities_covered, valid_from, valid_until
    ) values (
      '30000000-0000-0000-0000-000000000011',
      '10000000-0000-0000-0000-000000000011',
      'Responsabilite civile decennale', 'Assureur A',
      '10 avenue des Assurances, 75001 Paris', 'POLICE-A-001',
      'France metropolitaine', 'Plomberie sanitaire',
      date '2026-01-01', date '2026-12-31'
    )
  $$,
  'an owner should insert insurance for their organization'
);

select throws_ok(
  $$
    insert into public.company_insurances (
      organization_id, insurance_type, insurer_name, insurer_contact_details,
      policy_number, geographic_coverage
    ) values (
      '20000000-0000-0000-0000-000000000012',
      'Responsabilite civile professionnelle', 'Assureur B',
      '20 avenue des Assurances, 69001 Lyon', 'POLICE-B-001', 'France'
    )
  $$,
  '42501', null,
  'an owner should not insert insurance for another organization'
);

select results_eq(
  $$ select policy_number from public.company_insurances $$,
  array['POLICE-A-001'::text],
  'an owner should only read their insurance information'
);

select results_eq(
  $$
    delete from public.company_insurances
    where id = '30000000-0000-0000-0000-000000000011'
    returning id
  $$,
  array['30000000-0000-0000-0000-000000000011'::uuid],
  'an owner should delete their insurance information'
);

select results_eq(
  $$
    delete from public.company_insurances
    where id = '30000000-0000-0000-0000-000000000012'
    returning id
  $$,
  array[]::uuid[],
  'an owner should not delete another organization insurance information'
);

reset role;

select throws_ok(
  $$
    insert into public.company_insurances (
      organization_id, insurance_type, insurer_name, insurer_contact_details,
      policy_number, geographic_coverage, valid_from, valid_until
    ) values (
      '10000000-0000-0000-0000-000000000011', 'Test', 'Assureur', 'Adresse',
      'INVALID-DATES', 'France', date '2026-12-31', date '2026-01-01'
    )
  $$,
  '23514', null,
  'insurance end date should not precede its start date'
);

select * from finish();
rollback;
