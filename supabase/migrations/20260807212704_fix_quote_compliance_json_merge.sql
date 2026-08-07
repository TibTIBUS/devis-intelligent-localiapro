create or replace function public.validate_quote_compliance(p_quote_id uuid)
returns jsonb
language plpgsql
security invoker
stable
set search_path = ''
as $$
declare
  quote_organization_id uuid;
  quote_result jsonb;
  company_result jsonb;
  merged_errors jsonb;
  merged_warnings jsonb;
begin
  select q.organization_id into quote_organization_id
  from public.quotes q
  where q.id = p_quote_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Quote not found.';
  end if;

  quote_result := private.get_quote_compliance_result(
    p_quote_id,
    quote_organization_id,
    timezone('Europe/Paris', now())::date
  );
  company_result := private.get_company_quote_compliance_result(quote_organization_id);
  merged_errors := (quote_result -> 'errors') || (company_result -> 'errors');

  if exists (
    select 1 from jsonb_array_elements(company_result -> 'errors') issue
    where issue ->> 'code' = 'MISSING_REGISTRATION_CITY'
  ) then
    select coalesce(jsonb_agg(issue), '[]'::jsonb) into merged_warnings
    from jsonb_array_elements(quote_result -> 'warnings') issue
    where issue ->> 'code' <> 'REGISTRATION_DETAILS_TO_CONFIRM';
  else
    merged_warnings := quote_result -> 'warnings';
  end if;

  return jsonb_build_object(
    'valid', jsonb_array_length(merged_errors) = 0,
    'errors', merged_errors,
    'warnings', merged_warnings,
    'rulesVersion', quote_result ->> 'rulesVersion'
  );
end;
$$;
