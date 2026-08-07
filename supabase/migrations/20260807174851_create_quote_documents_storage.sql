alter table public.quote_versions
  add constraint quote_versions_organization_id_key unique (organization_id, id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null,
  quote_version_id uuid not null,
  kind text not null check (kind = 'quote_pdf'),
  storage_bucket text not null default 'quote-pdfs' check (storage_bucket = 'quote-pdfs'),
  storage_path text not null,
  file_name text not null check (length(file_name) between 1 and 255),
  mime_type text not null check (mime_type = 'application/pdf'),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint documents_quote_organization_fkey
    foreign key (organization_id, quote_id)
    references public.quotes (organization_id, id)
    on delete restrict,
  constraint documents_quote_version_organization_fkey
    foreign key (organization_id, quote_version_id)
    references public.quote_versions (organization_id, id)
    on delete restrict,
  constraint documents_organization_version_kind_key
    unique (organization_id, quote_version_id, kind),
  constraint documents_storage_path_key unique (storage_bucket, storage_path)
);

create index documents_organization_quote_created_at_idx
  on public.documents (organization_id, quote_id, created_at desc, id);

alter table public.documents enable row level security;
revoke all on public.documents from anon;
revoke all on public.documents from authenticated;
grant select on public.documents to authenticated;

create policy "documents_select_member"
on public.documents for select to authenticated
using ((select private.is_organization_member(organization_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-pdfs', 'quote-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "quote_pdfs_select_member"
on storage.objects for select to authenticated
using (
  bucket_id = 'quote-pdfs'
  and (storage.foldername(name))[1] = 'organizations'
  and exists (
    select 1
    from public.organization_members
    where organization_id::text = (storage.foldername(name))[2]
      and user_id = (select auth.uid())
  )
);
