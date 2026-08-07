begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

select has_column('public', 'quotes', 'discount_rate_basis_points', 'quotes should store their discount rate');
select has_column('public', 'quotes', 'deposit_rate_basis_points', 'quotes should store their deposit rate');
select has_column('public', 'quote_sections', 'title', 'quote sections should store a title');
select has_column('public', 'quote_sections', 'position', 'quote sections should store their position');
select has_column('public', 'quote_lines', 'catalog_item_id', 'quote lines may reference a catalog item');
select has_column('public', 'quote_lines', 'label', 'quote lines should store a label');
select has_column('public', 'quote_lines', 'description', 'quote lines should store an optional description');
select has_column('public', 'quote_lines', 'unit', 'quote lines should store a unit');
select has_column('public', 'quote_lines', 'quantity_milliunits', 'quote lines should store an integer quantity');
select has_column('public', 'quote_lines', 'unit_price_ht_cents', 'quote lines should store an integer unit price');
select has_column('public', 'quote_lines', 'vat_rate_basis_points', 'quote lines should store an integer VAT rate');
select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.quote_lines'::regclass and conname = 'quote_lines_catalog_item_organization_fkey' and contype = 'f'),
  'quote lines should enforce their composite catalog item foreign key'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000061',
  'authenticated', 'authenticated', 'quote-finance@example.test',
  'not-used-in-tests', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.organizations (id, name, trade, created_by)
values ('10000000-0000-0000-0000-000000000061', 'Finance devis', 'Plomberie', '00000000-0000-0000-0000-000000000061');
insert into public.organization_members (organization_id, user_id, role)
values ('10000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000061', 'owner');
insert into public.customers (id, organization_id, display_name)
values ('21000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', 'Client finance');
insert into public.catalog_items (id, organization_id, name, unit, unit_price_ht_cents)
values ('22000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', 'Main oeuvre', 'heure', 5590);
insert into public.quotes (id, organization_id, customer_id, discount_rate_basis_points, deposit_rate_basis_points)
values ('31000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', '21000000-0000-0000-0000-000000000061', 1000, 3000);
insert into public.quote_sections (id, organization_id, quote_id, title, position)
values ('32000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', 'Travaux', 0);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000061', true);

select lives_ok(
  $$ insert into public.quote_lines (id, organization_id, quote_id, section_id, catalog_item_id, label, unit, quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points) values ('33000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', '32000000-0000-0000-0000-000000000061', '22000000-0000-0000-0000-000000000061', 'Main oeuvre', 'heure', 2500, 5590, 2000) $$,
  'an owner should create a financially complete quote line'
);
select lives_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits, unit_price_ht_cents, vat_rate_basis_points) values ('10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', 'Prix a definir', 'forfait', 1000, null, null) $$,
  'a draft line may keep its price and VAT rate unknown'
);
select throws_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits, unit_price_ht_cents) values ('10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', 'Prix invalide', 'unite', 1000, -1) $$,
  '23514', null, 'a unit price should not be negative'
);
select throws_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits) values ('10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', 'Quantite invalide', 'unite', 0) $$,
  '23514', null, 'a quantity should be greater than zero'
);
select throws_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits, vat_rate_basis_points) values ('10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', 'TVA invalide', 'unite', 1000, 10001) $$,
  '23514', null, 'a VAT rate should not exceed one hundred percent'
);
select throws_ok(
  $$ update public.quotes set discount_rate_basis_points = 10001 where id = '31000000-0000-0000-0000-000000000061' $$,
  '23514', null, 'a discount rate should not exceed one hundred percent'
);
select throws_ok(
  $$ update public.quotes set deposit_rate_basis_points = -1 where id = '31000000-0000-0000-0000-000000000061' $$,
  '23514', null, 'a deposit rate should not be negative'
);
select throws_ok(
  $$ insert into public.quote_sections (organization_id, quote_id, title) values ('10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', ' ') $$,
  '23514', null, 'a section title should not be blank'
);
select throws_ok(
  $$ insert into public.quote_lines (organization_id, quote_id, label, unit, quantity_milliunits) values ('10000000-0000-0000-0000-000000000061', '31000000-0000-0000-0000-000000000061', ' ', 'unite', 1000) $$,
  '23514', null, 'a quote line label should not be blank'
);
select lives_ok(
  $$ delete from public.catalog_items where id = '22000000-0000-0000-0000-000000000061' $$,
  'a catalog item should remain deletable after being copied into a quote'
);
select is(
  (select catalog_item_id from public.quote_lines where id = '33000000-0000-0000-0000-000000000061'),
  null::uuid,
  'deleting a catalog item should only detach its quote line snapshot'
);

select * from finish();
rollback;
