alter table public.quote_ai_actions
alter column created_at set default statement_timestamp();

create function private.normalize_quote_ai_action_undone_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.undone_at is null and new.undone_at is not null then
    new.undone_at := statement_timestamp();
  end if;

  return new;
end;
$$;

create trigger quote_ai_actions_normalize_undone_at
before update of undone_at on public.quote_ai_actions
for each row
execute function private.normalize_quote_ai_action_undone_at();

revoke all on function private.normalize_quote_ai_action_undone_at() from public, anon, authenticated;
revoke all on function private.include_quote_texts_in_snapshot() from public, anon, authenticated;

grant select on table public.quotes to service_role;
grant select on table public.quote_versions to service_role;
