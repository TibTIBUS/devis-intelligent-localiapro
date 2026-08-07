begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select has_function('public','set_ai_quote_discount',array['uuid','uuid','integer','integer'],'discount function exists');
select has_function('public','set_ai_quote_deposit',array['uuid','uuid','integer','integer'],'deposit function exists');
select ok(not has_function_privilege('anon','public.set_ai_quote_discount(uuid,uuid,integer,integer)','EXECUTE'),'anon cannot set discount');
select ok(not has_function_privilege('anon','public.set_ai_quote_deposit(uuid,uuid,integer,integer)','EXECUTE'),'anon cannot set deposit');
select ok(has_function_privilege('authenticated','public.set_ai_quote_discount(uuid,uuid,integer,integer)','EXECUTE'),'authenticated may set discount');
select ok(has_function_privilege('authenticated','public.set_ai_quote_deposit(uuid,uuid,integer,integer)','EXECUTE'),'authenticated may set deposit');

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000083','authenticated','authenticated','financial-ai-a@example.test','x',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000084','authenticated','authenticated','financial-ai-b@example.test','x',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,trade,created_by) values
('10000000-0000-0000-0000-000000000083','Finance IA A','Plomberie','00000000-0000-0000-0000-000000000083'),
('10000000-0000-0000-0000-000000000084','Finance IA B','Électricité','00000000-0000-0000-0000-000000000084');
insert into public.organization_members (organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000083','00000000-0000-0000-0000-000000000083','owner'),
('10000000-0000-0000-0000-000000000084','00000000-0000-0000-0000-000000000084','owner');
insert into public.customers (id,organization_id,display_name) values
('21000000-0000-0000-0000-000000000083','10000000-0000-0000-0000-000000000083','Client Finance A'),
('21000000-0000-0000-0000-000000000084','10000000-0000-0000-0000-000000000084','Client Finance B');
insert into public.customer_addresses (id,organization_id,customer_id,address_line_1,postal_code,city) values
('22000000-0000-0000-0000-000000000083','10000000-0000-0000-0000-000000000083','21000000-0000-0000-0000-000000000083','1 rue Finance','75001','Paris');
insert into public.quotes (id,organization_id,customer_id,discount_rate_basis_points,deposit_rate_basis_points,status,quote_number,sequence_year,sequence_number,issued_on,valid_until,is_quote_free,work_address_id,finalized_at) values
('31000000-0000-0000-0000-000000000083','10000000-0000-0000-0000-000000000083','21000000-0000-0000-0000-000000000083',500,3000,'draft',null,null,null,null,null,null,null,null),
('31100000-0000-0000-0000-000000000083','10000000-0000-0000-0000-000000000083','21000000-0000-0000-0000-000000000083',0,0,'finalized','D-2026-90001',2026,90001,'2026-08-08','2026-09-08',true,'22000000-0000-0000-0000-000000000083',now()),
('31000000-0000-0000-0000-000000000084','10000000-0000-0000-0000-000000000084','21000000-0000-0000-0000-000000000084',0,0,'draft',null,null,null,null,null,null,null,null);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000083',true);

select lives_ok($$select * from public.set_ai_quote_discount('10000000-0000-0000-0000-000000000083','31000000-0000-0000-0000-000000000083',500,1050)$$,'sets exact discount basis points');
select is((select discount_rate_basis_points from public.quotes where id='31000000-0000-0000-0000-000000000083'),1050,'discount rate is exact');
select is((select payload->>'before' from public.quote_ai_actions where action_type='set_discount'),'500','discount audit preserves previous rate');
select is((select payload->>'after' from public.quote_ai_actions where action_type='set_discount'),'1050','discount audit preserves new rate');
select lives_ok($$select * from public.undo_last_ai_quote_action('10000000-0000-0000-0000-000000000083','31000000-0000-0000-0000-000000000083')$$,'undoes discount');
select is((select discount_rate_basis_points from public.quotes where id='31000000-0000-0000-0000-000000000083'),500,'undo restores discount');
select is((select count(*) from public.quote_ai_actions where action_type='set_discount' and undone_at is not null),1::bigint,'undone discount remains audited');

select lives_ok($$select * from public.set_ai_quote_deposit('10000000-0000-0000-0000-000000000083','31000000-0000-0000-0000-000000000083',3000,2500)$$,'sets exact deposit basis points');
select is((select deposit_rate_basis_points from public.quotes where id='31000000-0000-0000-0000-000000000083'),2500,'deposit rate is exact');
select is((select count(*) from public.quote_ai_actions where action_type='set_deposit'),1::bigint,'deposit is audited');
select throws_ok($$select * from public.set_ai_quote_discount('10000000-0000-0000-0000-000000000083','31000000-0000-0000-0000-000000000083',500,10001)$$,'22023',null,'rejects discount above 100 percent');
select throws_ok($$select * from public.set_ai_quote_deposit('10000000-0000-0000-0000-000000000083','31000000-0000-0000-0000-000000000083',2500,-1)$$,'22023',null,'rejects negative deposit');
select throws_ok($$select * from public.set_ai_quote_discount('10000000-0000-0000-0000-000000000084','31000000-0000-0000-0000-000000000084',0,1000)$$,'P0002',null,'cannot set another organization discount');
select throws_ok($$select * from public.set_ai_quote_deposit('10000000-0000-0000-0000-000000000084','31000000-0000-0000-0000-000000000084',0,1000)$$,'P0002',null,'cannot set another organization deposit');
update public.quotes set deposit_rate_basis_points=4000 where id='31000000-0000-0000-0000-000000000083';
select throws_ok($$select * from public.set_ai_quote_deposit('10000000-0000-0000-0000-000000000083','31000000-0000-0000-0000-000000000083',2500,3500)$$,'40001',null,'stale proposal cannot overwrite a manual rate change');
select throws_ok($$select * from public.undo_last_ai_quote_action('10000000-0000-0000-0000-000000000083','31000000-0000-0000-0000-000000000083')$$,'40001',null,'undo rejects a more recent manual rate change');
select is((select deposit_rate_basis_points from public.quotes where id='31000000-0000-0000-0000-000000000083'),4000,'manual rate remains intact');
select throws_ok($$select * from public.set_ai_quote_discount('10000000-0000-0000-0000-000000000083','31100000-0000-0000-0000-000000000083',0,1000)$$,'P0002',null,'cannot discount a finalized quote');
select throws_ok($$select * from public.set_ai_quote_deposit('10000000-0000-0000-0000-000000000083','31100000-0000-0000-0000-000000000083',0,1000)$$,'P0002',null,'cannot set deposit on a finalized quote');
select is((select count(*) from public.quote_ai_actions where quote_id='31000000-0000-0000-0000-000000000083'),2::bigint,'only successful actions are audited');
select is((select count(*) from public.quote_ai_actions where quote_id='31000000-0000-0000-0000-000000000083' and line_id is null),2::bigint,'financial actions do not reference quote lines');

select * from finish();
rollback;
