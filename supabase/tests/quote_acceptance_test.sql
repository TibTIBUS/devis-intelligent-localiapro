begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is((select relrowsecurity from pg_class where oid = 'public.quote_acceptances'::regclass), true, 'quote acceptances has RLS enabled');
select ok(not has_table_privilege('anon', 'public.quote_acceptances', 'select'), 'anon cannot read acceptances');
select ok(has_table_privilege('authenticated', 'public.quote_acceptances', 'select'), 'authenticated can read through RLS');
select ok(has_table_privilege('authenticated', 'public.quote_acceptances', 'insert'), 'authenticated can record through RLS');
select ok(not has_table_privilege('authenticated', 'public.quote_acceptances', 'update'), 'authenticated cannot modify acceptances');
select ok(not has_table_privilege('authenticated', 'public.quote_acceptances', 'delete'), 'authenticated cannot delete acceptances');
select ok((select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'quote_acceptances' and policyname = 'quote_acceptances_select_member'), 'member select policy exists');
select ok((select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'quote_acceptances' and policyname = 'quote_acceptances_insert_member'), 'member insert policy exists');
select ok((select count(*) = 1 from pg_trigger where tgrelid = 'public.quote_acceptances'::regclass and tgname = 'quote_acceptances_validate_dates'), 'acceptance validity dates are enforced');

select * from finish();
rollback;
