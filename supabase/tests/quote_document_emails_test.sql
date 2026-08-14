begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is((select relrowsecurity from pg_class where oid = 'public.quote_document_emails'::regclass), true, 'quote_document_emails has RLS enabled');
select ok((select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'quote_document_emails' and policyname = 'quote_document_emails_select_member'), 'quote_document_emails has a member select policy');
select ok((select has_table_privilege('anon', 'public.quote_document_emails', 'select') = false), 'anon cannot read quote document emails');
select ok((select has_table_privilege('anon', 'public.quote_document_emails', 'insert') = false), 'anon cannot insert quote document emails');
select ok((select has_table_privilege('authenticated', 'public.quote_document_emails', 'insert') = false), 'authenticated cannot insert quote document emails directly');
select ok((select has_table_privilege('service_role', 'public.quote_document_emails', 'insert')), 'the server role can insert quote document emails');
select ok((select exists (select 1 from pg_constraint where conname = 'documents_organization_id_key')), 'documents exposes a composite organization key for FK references');

select * from finish();
rollback;
