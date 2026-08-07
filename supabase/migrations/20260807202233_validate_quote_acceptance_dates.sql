create function private.validate_quote_acceptance_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  version_issued_on date;
  version_valid_until date;
begin
  select
    issued_on,
    (snapshot #>> '{quote,validUntil}')::date
  into version_issued_on, version_valid_until
  from public.quote_versions
  where organization_id = new.organization_id
    and quote_id = new.quote_id
    and id = new.quote_version_id;

  if version_issued_on is null or version_valid_until is null then
    raise exception using errcode = '23514', message = 'Quote validity dates are unavailable.';
  end if;
  if new.accepted_on < version_issued_on or new.accepted_on > version_valid_until then
    raise exception using errcode = '23514', message = 'Acceptance date must be within the quote validity period.';
  end if;
  return new;
end;
$$;

create trigger quote_acceptances_validate_dates
before insert on public.quote_acceptances
for each row execute function private.validate_quote_acceptance_dates();

revoke all on function private.validate_quote_acceptance_dates() from public;
