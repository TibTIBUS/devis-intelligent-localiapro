begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select has_column('public', 'quotes', 'payment_terms', 'quotes should store payment terms');
select has_column('public', 'quotes', 'note', 'quotes should store a note');
select has_function('public', 'set_ai_quote_payment_terms', array['uuid','uuid','text'], 'payment terms function exists');
select has_function('public', 'set_ai_quote_validity', array['uuid','uuid','date'], 'validity function exists');
select has_function('public', 'set_ai_quote_worksite_address', array['uuid','uuid','uuid'], 'worksite function exists');
select has_function('public', 'update_ai_quote_note', array['uuid','uuid','text'], 'note function exists');
select ok(not has_function_privilege('anon', 'public.set_ai_quote_payment_terms(uuid,uuid,text)', 'EXECUTE'), 'anon cannot set payment terms');
select ok(not has_function_privilege('anon', 'public.set_ai_quote_validity(uuid,uuid,date)', 'EXECUTE'), 'anon cannot set validity');
select ok(not has_function_privilege('anon', 'public.set_ai_quote_worksite_address(uuid,uuid,uuid)', 'EXECUTE'), 'anon cannot set worksite');
select ok(not has_function_privilege('anon', 'public.update_ai_quote_note(uuid,uuid,text)', 'EXECUTE'), 'anon cannot set note');
select ok(has_function_privilege('authenticated', 'public.set_ai_quote_payment_terms(uuid,uuid,text)', 'EXECUTE'), 'authenticated may set payment terms');
select ok(has_function_privilege('authenticated', 'public.set_ai_quote_validity(uuid,uuid,date)', 'EXECUTE'), 'authenticated may set validity');
select ok(has_function_privilege('authenticated', 'public.set_ai_quote_worksite_address(uuid,uuid,uuid)', 'EXECUTE'), 'authenticated may set worksite');
select ok(has_function_privilege('authenticated', 'public.update_ai_quote_note(uuid,uuid,text)', 'EXECUTE'), 'authenticated may set note');

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000081','authenticated','authenticated','metadata-a@example.test','x',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000082','authenticated','authenticated','metadata-b@example.test','x',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,trade,created_by) values
('10000000-0000-0000-0000-000000000081','Métadonnées A','Plomberie','00000000-0000-0000-0000-000000000081'),
('10000000-0000-0000-0000-000000000082','Métadonnées B','Électricité','00000000-0000-0000-0000-000000000082');
insert into public.organization_members (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000081','owner'),
('10000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000082','owner');
insert into public.customers (id,organization_id,display_name) values
('21000000-0000-0000-0000-000000000081','10000000-0000-0000-0000-000000000081','Client A'),
('21000000-0000-0000-0000-000000000082','10000000-0000-0000-0000-000000000082','Client B');
insert into public.customer_addresses (id,organization_id,customer_id,address_line_1,postal_code,city) values
('22000000-0000-0000-0000-000000000081','10000000-0000-0000-0000-000000000081','21000000-0000-0000-0000-000000000081','1 rue A','75001','Paris'),
('22000000-0000-0000-0000-000000000082','10000000-0000-0000-0000-000000000082','21000000-0000-0000-0000-000000000082','2 rue B','69001','Lyon');
insert into public.quotes (id,organization_id,customer_id) values
('31000000-0000-0000-0000-000000000081','10000000-0000-0000-0000-000000000081','21000000-0000-0000-0000-000000000081');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000081',true);
select lives_ok($$select * from public.set_ai_quote_payment_terms('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081','Paiement à réception')$$,'sets exact payment terms');
select is((select payment_terms from public.quotes where id='31000000-0000-0000-0000-000000000081'),'Paiement à réception','payment terms are exact');
select is((select count(*) from public.quote_ai_actions where action_type='set_payment_terms'),1::bigint,'payment terms are audited');
select lives_ok($$select * from public.undo_last_ai_quote_action('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081')$$,'undoes payment terms');
select is((select payment_terms from public.quotes where id='31000000-0000-0000-0000-000000000081'),null,'undo restores null payment terms');
select lives_ok($$select * from public.set_ai_quote_validity('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081','2026-09-30')$$,'sets validity');
select is((select valid_until from public.quotes where id='31000000-0000-0000-0000-000000000081'),'2026-09-30'::date,'validity is exact');
select lives_ok($$select * from public.undo_last_ai_quote_action('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081')$$,'undoes validity');
select is((select valid_until from public.quotes where id='31000000-0000-0000-0000-000000000081'),null,'undo restores null validity');
select lives_ok($$select * from public.update_ai_quote_note('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081','Protéger le parquet')$$,'sets exact note');
select is((select note from public.quotes where id='31000000-0000-0000-0000-000000000081'),'Protéger le parquet','note is exact');
select lives_ok($$select * from public.set_ai_quote_worksite_address('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081','22000000-0000-0000-0000-000000000081')$$,'sets customer worksite');
select is((select work_address_id from public.quotes where id='31000000-0000-0000-0000-000000000081'),'22000000-0000-0000-0000-000000000081'::uuid,'worksite is exact');
select throws_ok($$select * from public.set_ai_quote_worksite_address('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081','22000000-0000-0000-0000-000000000082')$$,'23503',null,'rejects another organization address');
update public.quotes set work_address_id=null where id='31000000-0000-0000-0000-000000000081';
select throws_ok($$select * from public.undo_last_ai_quote_action('10000000-0000-0000-0000-000000000081','31000000-0000-0000-0000-000000000081')$$,'40001',null,'undo refuses a more recent manual change');
select is((select count(*) from public.quote_ai_actions where quote_id='31000000-0000-0000-0000-000000000081'),4::bigint,'all successful actions remain audited');

select * from finish();
rollback;
