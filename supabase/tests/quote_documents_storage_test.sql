begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is((select relrowsecurity from pg_class where oid = 'public.documents'::regclass), true, 'documents has RLS enabled');
select is((select public from storage.buckets where id = 'quote-pdfs'), false, 'quote PDF bucket is private');
select is((select file_size_limit from storage.buckets where id = 'quote-pdfs'), 10485760::bigint, 'quote PDF bucket limits files to 10 MB');
select ok((select allowed_mime_types = array['application/pdf'] from storage.buckets where id = 'quote-pdfs'), 'quote PDF bucket only accepts PDF');
select ok((select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_select_member'), 'documents has a member select policy');
select ok((select count(*) = 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'quote_pdfs_select_member'), 'storage has a member select policy');
select ok((select has_table_privilege('anon', 'public.documents', 'select') = false), 'anon cannot read documents');
select ok((select has_table_privilege('authenticated', 'public.documents', 'insert') = false), 'authenticated cannot insert documents directly');
select ok((select has_table_privilege('authenticated', 'public.documents', 'update') = false), 'authenticated cannot update documents directly');
select ok((select exists (select 1 from pg_constraint where conname = 'documents_organization_version_kind_key')), 'one PDF document is allowed per quote version');

select * from finish();
rollback;
