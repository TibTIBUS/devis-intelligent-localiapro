alter table public.company_legal_information
add column professional_insurance_required boolean;

alter table public.quotes
add column preparation_fee_ht_cents bigint
  check (preparation_fee_ht_cents is null or preparation_fee_ht_cents > 0),
add column preparation_fee_vat_rate_basis_points integer
  check (
    preparation_fee_vat_rate_basis_points is null
    or preparation_fee_vat_rate_basis_points between 0 and 10000
  ),
add column travel_fee_applicable boolean,
add constraint quotes_preparation_fee_consistency_check check (
  (is_quote_free is null and preparation_fee_ht_cents is null and preparation_fee_vat_rate_basis_points is null)
  or (is_quote_free and preparation_fee_ht_cents is null and preparation_fee_vat_rate_basis_points is null)
  or (
    is_quote_free = false
    and preparation_fee_ht_cents is not null
    and preparation_fee_vat_rate_basis_points is not null
  )
);

grant update (
  preparation_fee_ht_cents,
  preparation_fee_vat_rate_basis_points,
  travel_fee_applicable
) on public.quotes to authenticated;

alter table public.quote_lines
add column line_kind text not null default 'service'
  check (line_kind in ('labor', 'material', 'travel', 'service', 'other'));

create table public.legal_rules_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(btrim(code)) > 0),
  jurisdiction text not null check (char_length(btrim(jurisdiction)) > 0),
  domain text not null check (char_length(btrim(domain)) > 0),
  effective_from date not null,
  effective_until date,
  source_references jsonb not null check (jsonb_typeof(source_references) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  check (effective_until is null or effective_until >= effective_from)
);

insert into public.legal_rules_versions (
  id,
  code,
  jurisdiction,
  domain,
  effective_from,
  source_references
) values (
  'a1000000-0000-4000-8000-000000000001',
  'FR-BUILDING-QUOTE-2017-01',
  'FR',
  'building_quote',
  date '2017-04-01',
  jsonb_build_array(
    'https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000033935526',
    'https://entreprendre.service-public.fr/vosdroits/F31144',
    'https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000047362294'
  )
);

alter table public.legal_rules_versions enable row level security;
revoke all on public.legal_rules_versions from anon;
revoke all on public.legal_rules_versions from authenticated;
grant select on public.legal_rules_versions to authenticated;

create policy "legal_rules_versions_select_authenticated"
on public.legal_rules_versions for select to authenticated
using (true);

alter table public.quote_versions
add column legal_rules_version_id uuid,
add column compliance_snapshot jsonb not null default '{}'::jsonb
  check (jsonb_typeof(compliance_snapshot) = 'object');

update public.quote_versions
set legal_rules_version_id = 'a1000000-0000-4000-8000-000000000001'
where legal_rules_version_id is null;

alter table public.quote_versions
alter column legal_rules_version_id set not null,
alter column legal_rules_version_id set default 'a1000000-0000-4000-8000-000000000001',
add constraint quote_versions_legal_rules_version_fkey
  foreign key (legal_rules_version_id) references public.legal_rules_versions (id) on delete restrict;

create function private.get_quote_compliance_result(
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
  errors jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
begin
  select q.* into current_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.organization_id = p_organization_id;

  if not found then
    return jsonb_build_object(
      'valid', false,
      'errors', jsonb_build_array(jsonb_build_object('code', 'QUOTE_NOT_FOUND', 'field', 'quote')),
      'warnings', warnings,
      'rulesVersion', 'FR-BUILDING-QUOTE-2017-01'
    );
  end if;

  select information.* into company
  from public.company_legal_information information
  where information.organization_id = p_organization_id;

  if not found then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_COMPANY_LEGAL_INFORMATION', 'field', 'company'));
  else
    if company.legal_form is null then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_COMPANY_LEGAL_FORM', 'field', 'company.legalForm'));
    end if;
    if company.professional_insurance_required is null then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_INSURANCE_APPLICABILITY', 'field', 'company.professionalInsuranceRequired'));
    elsif company.professional_insurance_required and not exists (
      select 1
      from public.company_insurances insurance
      where insurance.organization_id = p_organization_id
        and (insurance.valid_from is null or insurance.valid_from <= p_issue_date)
        and (insurance.valid_until is null or insurance.valid_until >= p_issue_date)
    ) then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_REQUIRED_INSURANCE', 'field', 'company.insurances'));
    end if;
    if company.vat_number is null then
      warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'VAT_STATUS_TO_CONFIRM', 'field', 'company.vatNumber'));
    end if;
    if company.registration_city is null then
      warnings := warnings || jsonb_build_array(jsonb_build_object('code', 'REGISTRATION_DETAILS_TO_CONFIRM', 'field', 'company.registrationCity'));
    end if;
  end if;

  if current_quote.valid_until is null then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_VALIDITY_DATE', 'field', 'validUntil'));
  elsif current_quote.valid_until < p_issue_date then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'EXPIRED_VALIDITY_DATE', 'field', 'validUntil'));
  end if;

  if current_quote.work_address_id is null then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_WORKSITE_ADDRESS', 'field', 'workAddressId'));
  end if;

  if current_quote.is_quote_free is null then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_QUOTE_FEE_STATUS', 'field', 'isQuoteFree'));
  elsif current_quote.is_quote_free = false and (
    current_quote.preparation_fee_ht_cents is null
    or current_quote.preparation_fee_vat_rate_basis_points is null
  ) then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_PAID_QUOTE_PRICE', 'field', 'preparationFee'));
  end if;

  if current_quote.travel_fee_applicable is null then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_TRAVEL_FEE_DECLARATION', 'field', 'travelFeeApplicable'));
  elsif current_quote.travel_fee_applicable and not exists (
    select 1 from public.quote_lines line
    where line.organization_id = p_organization_id
      and line.quote_id = p_quote_id
      and line.line_kind = 'travel'
  ) then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_TRAVEL_FEE_LINE', 'field', 'lines'));
  elsif current_quote.travel_fee_applicable = false and exists (
    select 1 from public.quote_lines line
    where line.organization_id = p_organization_id
      and line.quote_id = p_quote_id
      and line.line_kind = 'travel'
      and coalesce(line.unit_price_ht_cents, 0) > 0
  ) then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'TRAVEL_FEE_DECLARATION_MISMATCH', 'field', 'lines'));
  end if;

  if not exists (
    select 1 from public.quote_lines line
    where line.organization_id = p_organization_id and line.quote_id = p_quote_id
  ) then
    errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_QUOTE_LINE', 'field', 'lines'));
  else
    if exists (
      select 1 from public.quote_lines line
      where line.organization_id = p_organization_id
        and line.quote_id = p_quote_id
        and (line.unit_price_ht_cents is null or line.vat_rate_basis_points is null)
    ) then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'INCOMPLETE_QUOTE_LINE', 'field', 'lines'));
    end if;
    if not exists (
      select 1 from public.quote_lines line
      where line.organization_id = p_organization_id
        and line.quote_id = p_quote_id
        and line.line_kind in ('labor', 'service')
    ) then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_LABOR_OR_SERVICE_LINE', 'field', 'lines'));
    end if;
  end if;

  return jsonb_build_object(
    'valid', jsonb_array_length(errors) = 0,
    'errors', errors,
    'warnings', warnings,
    'rulesVersion', 'FR-BUILDING-QUOTE-2017-01'
  );
end;
$$;

create function public.validate_quote_compliance(p_quote_id uuid)
returns jsonb
language plpgsql
security invoker
stable
set search_path = ''
as $$
declare
  quote_organization_id uuid;
begin
  select q.organization_id into quote_organization_id
  from public.quotes q
  where q.id = p_quote_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Quote not found.';
  end if;

  return private.get_quote_compliance_result(
    p_quote_id,
    quote_organization_id,
    timezone('Europe/Paris', now())::date
  );
end;
$$;

revoke all on function private.get_quote_compliance_result(uuid, uuid, date) from public;
grant execute on function private.get_quote_compliance_result(uuid, uuid, date) to authenticated;
revoke all on function public.validate_quote_compliance(uuid) from public;
revoke all on function public.validate_quote_compliance(uuid) from anon;
grant execute on function public.validate_quote_compliance(uuid) to authenticated;

create function private.validate_quote_before_finalization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  compliance_result jsonb;
begin
  if old.status = 'draft' and new.status = 'finalized' then
    compliance_result := private.get_quote_compliance_result(
      old.id,
      old.organization_id,
      coalesce(new.issued_on, timezone('Europe/Paris', now())::date)
    );

    if not (compliance_result ->> 'valid')::boolean then
      raise exception using
        errcode = '23514',
        message = 'Quote compliance validation failed.',
        detail = (compliance_result -> 'errors')::text;
    end if;
  end if;
  return new;
end;
$$;

create trigger quotes_validate_before_finalization
before update on public.quotes
for each row execute function private.validate_quote_before_finalization();

revoke all on function private.validate_quote_before_finalization() from public;

create function private.enrich_quote_version_compliance_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  quote_record public.quotes%rowtype;
  lines_with_kinds jsonb;
begin
  select q.* into strict quote_record
  from public.quotes q
  where q.id = new.quote_id and q.organization_id = new.organization_id;

  select coalesce(
    jsonb_agg(snapshot_line || jsonb_build_object('lineKind', line.line_kind) order by line.position, line.id),
    '[]'::jsonb
  ) into lines_with_kinds
  from public.quote_lines line
  join lateral (
    select value as snapshot_line
    from jsonb_array_elements(new.snapshot -> 'lines')
    where value ->> 'id' = line.id::text
  ) snapshot_entry on true
  where line.organization_id = new.organization_id
    and line.quote_id = new.quote_id;

  new.snapshot := jsonb_set(new.snapshot, '{lines}', lines_with_kinds, true);
  new.compliance_snapshot := jsonb_build_object(
    'rulesVersion', 'FR-BUILDING-QUOTE-2017-01',
    'preparationFeeHtCents', quote_record.preparation_fee_ht_cents,
    'preparationFeeVatRateBasisPoints', quote_record.preparation_fee_vat_rate_basis_points,
    'travelFeeApplicable', quote_record.travel_fee_applicable,
    'professionalInsuranceRequired', (
      select information.professional_insurance_required
      from public.company_legal_information information
      where information.organization_id = new.organization_id
    ),
    'insurances', coalesce((
      select jsonb_agg(to_jsonb(insurance) - 'created_at' - 'updated_at' order by insurance.insurance_type, insurance.id)
      from public.company_insurances insurance
      where insurance.organization_id = new.organization_id
        and (insurance.valid_from is null or insurance.valid_from <= new.issued_on)
        and (insurance.valid_until is null or insurance.valid_until >= new.issued_on)
    ), '[]'::jsonb)
  );
  return new;
end;
$$;

create trigger quote_versions_enrich_compliance_snapshot
before insert on public.quote_versions
for each row execute function private.enrich_quote_version_compliance_snapshot();

revoke all on function private.enrich_quote_version_compliance_snapshot() from public;
