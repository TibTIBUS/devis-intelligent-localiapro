insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'organization-assets',
  'organization-assets',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "organization_logos_select_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'logo'
  and storage.filename(name) = 'logo'
  and exists (
    select 1
    from public.organization_members
    where organization_id::text = (storage.foldername(name))[2]
      and user_id = (select auth.uid())
  )
);

create policy "organization_logos_insert_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'logo'
  and storage.filename(name) = 'logo'
  and exists (
    select 1
    from public.organization_members
    where organization_id::text = (storage.foldername(name))[2]
      and user_id = (select auth.uid())
  )
);

create policy "organization_logos_update_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'logo'
  and storage.filename(name) = 'logo'
  and exists (
    select 1
    from public.organization_members
    where organization_id::text = (storage.foldername(name))[2]
      and user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'organization-assets'
  and (storage.foldername(name))[1] = 'organizations'
  and (storage.foldername(name))[3] = 'logo'
  and storage.filename(name) = 'logo'
  and exists (
    select 1
    from public.organization_members
    where organization_id::text = (storage.foldername(name))[2]
      and user_id = (select auth.uid())
  )
);
