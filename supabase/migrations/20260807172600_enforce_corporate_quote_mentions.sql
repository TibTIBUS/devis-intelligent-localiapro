update public.legal_rules_versions
set source_references = source_references || jsonb_build_array(
  'https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006178891/'
)
where code = 'FR-BUILDING-QUOTE-2017-01';

create function private.get_company_quote_compliance_result(p_organization_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  company public.company_legal_information%rowtype;
  normalized_legal_form text;
  errors jsonb := '[]'::jsonb;
begin
  select information.* into company
  from public.company_legal_information information
  where information.organization_id = p_organization_id;

  if not found or company.legal_form is null then
    return jsonb_build_object('errors', errors, 'warnings', '[]'::jsonb);
  end if;

  normalized_legal_form := regexp_replace(upper(btrim(company.legal_form)), '[^A-Z]', '', 'g');

  if normalized_legal_form = any (array['SARL', 'EURL', 'SAS', 'SASU', 'SA', 'SCA', 'SE']) then
    if company.share_capital_cents is null then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_SHARE_CAPITAL', 'field', 'company.shareCapital'));
    end if;
    if company.registration_city is null then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_REGISTRATION_CITY', 'field', 'company.registrationCity'));
    end if;
  end if;

  return jsonb_build_object('errors', errors, 'warnings', '[]'::jsonb);
end;
$$;

revoke all on function private.get_company_quote_compliance_result(uuid) from public;
grant execute on function private.get_company_quote_compliance_result(uuid) to authenticated;

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

create function private.validate_company_mentions_before_finalization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  compliance_result jsonb;
begin
  if old.status = 'draft' and new.status = 'finalized' then
    compliance_result := private.get_company_quote_compliance_result(old.organization_id);
    if jsonb_array_length(compliance_result -> 'errors') > 0 then
      raise exception using
        errcode = '23514',
        message = 'Quote compliance validation failed.',
        detail = (compliance_result -> 'errors')::text;
    end if;
  end if;
  return new;
end;
$$;

create trigger quotes_validate_company_mentions_before_finalization
before update on public.quotes
for each row execute function private.validate_company_mentions_before_finalization();

revoke all on function private.validate_company_mentions_before_finalization() from public;
