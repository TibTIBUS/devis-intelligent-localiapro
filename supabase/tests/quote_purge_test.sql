begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_function('public', 'purge_quote', array['uuid', 'uuid'], 'the administrator purge function should exist');
select ok(not has_function_privilege('anon', 'public.purge_quote(uuid,uuid)', 'EXECUTE'), 'anonymous users should not purge quotes');
select ok(has_function_privilege('authenticated', 'public.purge_quote(uuid,uuid)', 'EXECUTE'), 'signed-in users may call the purge, which checks administrator rights itself');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000091', 'authenticated', 'authenticated', 'quote-purge-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000092', 'authenticated', 'authenticated', 'quote-purge-member@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.app_admins (user_id) values ('00000000-0000-0000-0000-000000000091');

insert into public.organizations (id, name, trade, created_by)
values ('10000000-0000-0000-0000-000000000091', 'Purge devis', 'Plomberie', '00000000-0000-0000-0000-000000000091');
insert into public.organization_members (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000091', 'owner'),
  ('10000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000092', 'member');

insert into public.customers (id, organization_id, display_name)
values ('21000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', 'Client purge');
insert into public.customer_addresses (id, organization_id, customer_id, label, address_line_1, postal_code, city, is_primary)
values ('22000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '21000000-0000-0000-0000-000000000091', 'Chantier', '4 rue du Chantier', '75004', 'Paris', true);

-- Deux devis : le premier sera purgé, le second sert à vérifier que
-- l'immuabilité reste intacte pour les comptes non administrateurs.
insert into public.quotes (id, organization_id, customer_id, valid_until, is_quote_free, travel_fee_applicable, work_address_id) values
  ('31000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '21000000-0000-0000-0000-000000000091', current_date + 30, true, false, '22000000-0000-0000-0000-000000000091'),
  ('31000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000091', '21000000-0000-0000-0000-000000000091', current_date + 30, true, false, '22000000-0000-0000-0000-000000000091');

insert into public.quote_sections (id, organization_id, quote_id, title)
values ('32000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', 'Travaux');
insert into public.quote_lines (id, organization_id, quote_id, section_id, label, unit, quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points)
values ('33000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', '32000000-0000-0000-0000-000000000091', 'Pose', 'unite', 1000, 10000, 2000);

insert into public.quote_versions (id, organization_id, quote_id, version_number, quote_number, issued_on, snapshot) values
  ('34000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', 1, 'D-2099-00091', current_date, jsonb_build_object('quote', jsonb_build_object('validUntil', (current_date + 30)::text))),
  ('34000000-0000-0000-0000-000000000092', '10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000092', 1, 'D-2099-00092', current_date, jsonb_build_object('quote', jsonb_build_object('validUntil', (current_date + 30)::text)));

insert into public.quote_acceptances (organization_id, quote_id, quote_version_id, accepted_on, signatory_name, evidence_type, recorded_by)
values ('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', '34000000-0000-0000-0000-000000000091', current_date, 'Client purge', 'signed_quote', '00000000-0000-0000-0000-000000000091');

insert into public.documents (id, organization_id, quote_id, quote_version_id, kind, storage_path, file_name, mime_type, file_size_bytes, checksum_sha256)
values ('35000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', '34000000-0000-0000-0000-000000000091', 'quote_pdf', '10000000-0000-0000-0000-000000000091/D-2099-00091.pdf', 'D-2099-00091.pdf', 'application/pdf', 1024, repeat('a', 64));

insert into public.quote_document_emails (organization_id, quote_id, document_id, recipient_email, resend_message_id)
values ('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091', '35000000-0000-0000-0000-000000000091', 'client@example.test', 'msg_00091');

update public.quotes set status = 'finalized' where id in ('31000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000092');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000092', true);
select throws_ok(
  $$ select * from public.purge_quote('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091') $$,
  '42501',
  'Quote purge is reserved to administrators.',
  'a plain organization member should not purge an accepted quote'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);
select is(
  (select count(*) from public.purge_quote('10000000-0000-0000-0000-000000000091', '31000000-0000-0000-0000-000000000091')),
  1::bigint,
  'the purge should report the stored PDF so the caller can empty the bucket'
);

reset role;
select is((select count(*) from public.quotes where id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'the accepted quote should be gone');
select is((select count(*) from public.quote_versions where quote_id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'its frozen versions should be gone');
select is((select count(*) from public.quote_acceptances where quote_id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'its acceptance record should be gone');
select is((select count(*) from public.documents where quote_id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'its PDF metadata should be gone');
select is((select count(*) from public.quote_document_emails where quote_id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'its email log should be gone');
select is((select count(*) from public.quote_lines where quote_id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'its lines should cascade away');
select is((select count(*) from public.quote_sections where quote_id = '31000000-0000-0000-0000-000000000091'), 0::bigint, 'its sections should cascade away');
select is((select count(*) from public.quotes where id = '31000000-0000-0000-0000-000000000092'), 1::bigint, 'the other quote should be untouched');

-- L'exception ne doit ouvrir aucune autre porte : hors purge, un devis
-- finalisé reste strictement immuable.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);
select throws_ok(
  $$ delete from public.quotes where id = '31000000-0000-0000-0000-000000000092' $$,
  '55000',
  'A finalized quote is immutable.',
  'a finalized quote should still resist a direct delete, even for an administrator'
);
select throws_ok(
  $$ update public.quotes set discount_rate_basis_points = 100 where id = '31000000-0000-0000-0000-000000000092' $$,
  '55000',
  'A finalized quote is immutable.',
  'a finalized quote should still reject changes'
);

select * from finish();
rollback;
