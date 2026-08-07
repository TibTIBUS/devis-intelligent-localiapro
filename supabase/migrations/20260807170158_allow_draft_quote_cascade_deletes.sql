create or replace function private.ensure_quote_is_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_organization_id uuid := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  target_quote_id uuid := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;
  target_quote_status text;
begin
  select status into target_quote_status
  from public.quotes
  where id = target_quote_id
    and organization_id = target_organization_id;

  if found and target_quote_status = 'finalized' then
    raise exception using
      errcode = '55000',
      message = 'A finalized quote is immutable.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
