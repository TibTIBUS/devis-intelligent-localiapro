create index quote_acceptances_version_reference_idx
  on public.quote_acceptances (organization_id, quote_id, quote_version_id);

create index quote_acceptances_recorded_by_idx
  on public.quote_acceptances (recorded_by);
