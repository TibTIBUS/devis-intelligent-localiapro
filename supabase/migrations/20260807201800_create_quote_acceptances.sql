alter table public.quote_versions
  add constraint quote_versions_organization_quote_id_key
  unique (organization_id, quote_id, id);

create table public.quote_acceptances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null,
  quote_version_id uuid not null,
  accepted_on date not null,
  signatory_name text not null check (length(trim(signatory_name)) between 1 and 200),
  evidence_type text not null check (evidence_type in ('signed_quote', 'written_confirmation', 'deposit_payment')),
  evidence_reference text check (evidence_reference is null or length(evidence_reference) <= 500),
  recorded_by uuid not null references auth.users (id) on delete restrict,
  recorded_at timestamptz not null default timezone('utc', now()),
  constraint quote_acceptances_quote_version_fkey
    foreign key (organization_id, quote_id, quote_version_id)
    references public.quote_versions (organization_id, quote_id, id)
    on delete restrict,
  constraint quote_acceptances_version_key unique (organization_id, quote_version_id)
);

create index quote_acceptances_organization_quote_idx
  on public.quote_acceptances (organization_id, quote_id, recorded_at desc);

alter table public.quote_acceptances enable row level security;
revoke all on public.quote_acceptances from anon;
revoke all on public.quote_acceptances from authenticated;
grant select, insert on public.quote_acceptances to authenticated;

create policy "quote_acceptances_select_member"
on public.quote_acceptances for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "quote_acceptances_insert_member"
on public.quote_acceptances for insert to authenticated
with check (
  recorded_by = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create function private.prevent_quote_acceptance_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'A quote acceptance record is immutable.';
end;
$$;

create trigger quote_acceptances_prevent_mutation
before update or delete on public.quote_acceptances
for each row execute function private.prevent_quote_acceptance_mutation();

revoke all on function private.prevent_quote_acceptance_mutation() from public;
