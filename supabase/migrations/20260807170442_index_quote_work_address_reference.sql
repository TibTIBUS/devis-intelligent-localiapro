create index quotes_work_address_reference_idx
  on public.quotes (organization_id, customer_id, work_address_id)
  where work_address_id is not null;
