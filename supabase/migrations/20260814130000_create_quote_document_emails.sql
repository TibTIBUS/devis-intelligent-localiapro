alter table public.documents
  add constraint documents_organization_id_key unique (organization_id, id);

create table public.quote_document_emails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null,
  document_id uuid not null,
  recipient_email text not null check (char_length(btrim(recipient_email)) > 0),
  resend_message_id text not null check (char_length(btrim(resend_message_id)) > 0),
  sent_at timestamptz not null default timezone('utc', now()),
  constraint quote_document_emails_quote_fkey
    foreign key (organization_id, quote_id)
    references public.quotes (organization_id, id)
    on delete restrict,
  constraint quote_document_emails_document_fkey
    foreign key (organization_id, document_id)
    references public.documents (organization_id, id)
    on delete restrict
);

create index quote_document_emails_organization_quote_sent_at_idx
  on public.quote_document_emails (organization_id, quote_id, sent_at desc, id);

alter table public.quote_document_emails enable row level security;

revoke all on public.quote_document_emails from anon;
revoke all on public.quote_document_emails from authenticated;
grant select on public.quote_document_emails to authenticated;

create policy "quote_document_emails_select_member"
on public.quote_document_emails for select to authenticated
using ((select private.is_organization_member(organization_id)));

create policy "quote_document_emails_service_role_insert"
on public.quote_document_emails
for insert
to service_role
with check (true);
