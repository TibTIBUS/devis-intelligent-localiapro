create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quotes_organization_id_id_key unique (organization_id, id),
  constraint quotes_customer_organization_fkey
    foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
    on delete restrict
);

create table public.quote_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  quote_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quote_sections_organization_quote_id_key
    unique (organization_id, quote_id, id),
  constraint quote_sections_quote_organization_fkey
    foreign key (organization_id, quote_id)
    references public.quotes (organization_id, id)
    on delete cascade
);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  quote_id uuid not null,
  section_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quote_lines_quote_organization_fkey
    foreign key (organization_id, quote_id)
    references public.quotes (organization_id, id)
    on delete cascade,
  constraint quote_lines_section_quote_organization_fkey
    foreign key (organization_id, quote_id, section_id)
    references public.quote_sections (organization_id, quote_id, id)
);

create index quotes_organization_updated_at_idx
  on public.quotes (organization_id, updated_at desc, id);

create index quotes_organization_customer_idx
  on public.quotes (organization_id, customer_id, id);

create index quote_lines_organization_quote_idx
  on public.quote_lines (organization_id, quote_id, id);

create index quote_lines_organization_quote_section_idx
  on public.quote_lines (organization_id, quote_id, section_id, id)
  where section_id is not null;

create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function private.set_updated_at();

create trigger quote_sections_set_updated_at
before update on public.quote_sections
for each row execute function private.set_updated_at();

create trigger quote_lines_set_updated_at
before update on public.quote_lines
for each row execute function private.set_updated_at();

alter table public.quotes enable row level security;
alter table public.quote_sections enable row level security;
alter table public.quote_lines enable row level security;

revoke all on public.quotes from anon;
revoke all on public.quote_sections from anon;
revoke all on public.quote_lines from anon;

grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_sections to authenticated;
grant select, insert, update, delete on public.quote_lines to authenticated;

create policy "quotes_select_member"
on public.quotes for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "quotes_insert_member"
on public.quotes for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "quotes_update_member"
on public.quotes for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "quotes_delete_member"
on public.quotes for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "quote_sections_select_member"
on public.quote_sections for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "quote_sections_insert_member"
on public.quote_sections for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "quote_sections_update_member"
on public.quote_sections for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "quote_sections_delete_member"
on public.quote_sections for delete to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "quote_lines_select_member"
on public.quote_lines for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "quote_lines_insert_member"
on public.quote_lines for insert to authenticated
with check ((select private.is_organization_member(organization_id)));

create policy "quote_lines_update_member"
on public.quote_lines for update to authenticated
using ((select private.is_organization_member(organization_id)))
with check ((select private.is_organization_member(organization_id)));

create policy "quote_lines_delete_member"
on public.quote_lines for delete to authenticated
using ((select private.is_organization_member(organization_id)));
