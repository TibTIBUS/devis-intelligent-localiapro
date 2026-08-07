create or replace function private.get_quote_compliance_result(
  p_quote_id uuid,
  p_organization_id uuid,
  p_issue_date date
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  current_quote public.quotes%rowtype;
  company public.company_legal_information%rowtype;
  compliance_errors jsonb := '[]'::jsonb;
  compliance_warnings jsonb := '[]'::jsonb;
begin
  compliance_errors := jsonb_build_array();
  compliance_warnings := jsonb_build_array();

  select q.* into current_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.organization_id = p_organization_id;

  if not found then
    return jsonb_build_object(
      'valid', false,
      'errors', jsonb_build_array(jsonb_build_object('code', 'QUOTE_NOT_FOUND', 'field', 'quote')),
      'warnings', (case when jsonb_typeof(compliance_warnings) = 'array' then compliance_warnings else '[]'::jsonb end),
      'rulesVersion', 'FR-BUILDING-QUOTE-2017-01'
    );
  end if;

  select information.* into company
  from public.company_legal_information information
  where information.organization_id = p_organization_id;

  if not found then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_COMPANY_LEGAL_INFORMATION', 'field', 'company'));
  else
    if company.legal_form is null then
      compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_COMPANY_LEGAL_FORM', 'field', 'company.legalForm'));
    end if;
    if company.professional_insurance_required is null then
      compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_INSURANCE_APPLICABILITY', 'field', 'company.professionalInsuranceRequired'));
    elsif company.professional_insurance_required and not exists (
      select 1
      from public.company_insurances insurance
      where insurance.organization_id = p_organization_id
        and (insurance.valid_from is null or insurance.valid_from <= p_issue_date)
        and (insurance.valid_until is null or insurance.valid_until >= p_issue_date)
    ) then
      compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_REQUIRED_INSURANCE', 'field', 'company.insurances'));
    end if;
    if company.vat_number is null then
      compliance_warnings := (case when jsonb_typeof(compliance_warnings) = 'array' then compliance_warnings else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'VAT_STATUS_TO_CONFIRM', 'field', 'company.vatNumber'));
    end if;
    if company.registration_city is null then
      compliance_warnings := (case when jsonb_typeof(compliance_warnings) = 'array' then compliance_warnings else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'REGISTRATION_DETAILS_TO_CONFIRM', 'field', 'company.registrationCity'));
    end if;
  end if;

  if current_quote.valid_until is null then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_VALIDITY_DATE', 'field', 'validUntil'));
  elsif current_quote.valid_until < p_issue_date then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'EXPIRED_VALIDITY_DATE', 'field', 'validUntil'));
  end if;

  if current_quote.work_address_id is null then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_WORKSITE_ADDRESS', 'field', 'workAddressId'));
  end if;

  if current_quote.is_quote_free is null then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_QUOTE_FEE_STATUS', 'field', 'isQuoteFree'));
  elsif current_quote.is_quote_free = false and (
    current_quote.preparation_fee_ht_cents is null
    or current_quote.preparation_fee_vat_rate_basis_points is null
  ) then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_PAID_QUOTE_PRICE', 'field', 'preparationFee'));
  end if;

  if current_quote.travel_fee_applicable is null then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_TRAVEL_FEE_DECLARATION', 'field', 'travelFeeApplicable'));
  elsif current_quote.travel_fee_applicable and not exists (
    select 1 from public.quote_lines line
    where line.organization_id = p_organization_id
      and line.quote_id = p_quote_id
      and line.line_kind = 'travel'
  ) then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_TRAVEL_FEE_LINE', 'field', 'lines'));
  elsif current_quote.travel_fee_applicable = false and exists (
    select 1 from public.quote_lines line
    where line.organization_id = p_organization_id
      and line.quote_id = p_quote_id
      and line.line_kind = 'travel'
      and coalesce(line.unit_price_ht_cents, 0) > 0
  ) then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'TRAVEL_FEE_DECLARATION_MISMATCH', 'field', 'lines'));
  end if;

  if not exists (
    select 1 from public.quote_lines line
    where line.organization_id = p_organization_id and line.quote_id = p_quote_id
  ) then
    compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_QUOTE_LINE', 'field', 'lines'));
  else
    if exists (
      select 1 from public.quote_lines line
      where line.organization_id = p_organization_id
        and line.quote_id = p_quote_id
        and (line.unit_price_ht_cents is null or line.vat_rate_basis_points is null)
    ) then
      compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'INCOMPLETE_QUOTE_LINE', 'field', 'lines'));
    end if;
    if not exists (
      select 1 from public.quote_lines line
      where line.organization_id = p_organization_id
        and line.quote_id = p_quote_id
        and line.line_kind in ('labor', 'service')
    ) then
      compliance_errors := (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) || jsonb_build_array(jsonb_build_object('code', 'MISSING_LABOR_OR_SERVICE_LINE', 'field', 'lines'));
    end if;
  end if;

  return jsonb_build_object(
    'valid', jsonb_array_length(case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end) = 0,
    'errors', (case when jsonb_typeof(compliance_errors) = 'array' then compliance_errors else '[]'::jsonb end),
    'warnings', (case when jsonb_typeof(compliance_warnings) = 'array' then compliance_warnings else '[]'::jsonb end),
    'rulesVersion', 'FR-BUILDING-QUOTE-2017-01'
  );
end;
$$;
