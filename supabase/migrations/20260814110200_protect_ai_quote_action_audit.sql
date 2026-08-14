create function private.enforce_quote_ai_action_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null
    or new.actor_user_id is distinct from auth.uid()
    or not (select private.is_organization_member(new.organization_id))
  then
    raise exception using
      errcode = '42501',
      message = 'AI quote action write is not authorized';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.quote_id is distinct from old.quote_id
    or new.actor_user_id is distinct from old.actor_user_id
    or new.action_type is distinct from old.action_type
    or new.payload is distinct from old.payload
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = '42501',
      message = 'AI quote action audit fields are immutable';
  end if;

  return new;
end;
$$;

create trigger quote_ai_actions_enforce_write
before insert or update on public.quote_ai_actions
for each row
execute function private.enforce_quote_ai_action_write();

revoke all on function private.enforce_quote_ai_action_write()
from public, anon, authenticated;

create role quote_ai_action_executor
  nologin
  inherit
  nosuperuser
  nocreatedb
  nocreaterole
  noreplication
  nobypassrls;

grant authenticated to quote_ai_action_executor;
-- PostgreSQL requires the migration role to be able to SET ROLE to the new
-- owner before ALTER FUNCTION ... OWNER TO can be applied.
grant quote_ai_action_executor to postgres;

revoke insert, update on table public.quote_ai_actions from authenticated;
grant select, insert, update on table public.quote_ai_actions to quote_ai_action_executor;
grant create on schema public to quote_ai_action_executor;

alter function public.add_catalog_quote_line(uuid, uuid, uuid, bigint, text, integer)
owner to quote_ai_action_executor;
alter function public.update_ai_quote_line(uuid, uuid, uuid, bigint, text)
owner to quote_ai_action_executor;
alter function public.delete_ai_quote_line(uuid, uuid, uuid)
owner to quote_ai_action_executor;
alter function public.set_ai_quote_payment_terms(uuid, uuid, text)
owner to quote_ai_action_executor;
alter function public.set_ai_quote_validity(uuid, uuid, date)
owner to quote_ai_action_executor;
alter function public.set_ai_quote_worksite_address(uuid, uuid, uuid)
owner to quote_ai_action_executor;
alter function public.update_ai_quote_note(uuid, uuid, text)
owner to quote_ai_action_executor;
alter function public.set_ai_quote_discount(uuid, uuid, integer, integer)
owner to quote_ai_action_executor;
alter function public.set_ai_quote_deposit(uuid, uuid, integer, integer)
owner to quote_ai_action_executor;
alter function public.undo_last_ai_quote_action(uuid, uuid)
owner to quote_ai_action_executor;

revoke quote_ai_action_executor from postgres;

revoke create on schema public from quote_ai_action_executor;

alter function public.add_catalog_quote_line(uuid, uuid, uuid, bigint, text, integer)
security definer;
alter function public.update_ai_quote_line(uuid, uuid, uuid, bigint, text)
security definer;
alter function public.delete_ai_quote_line(uuid, uuid, uuid)
security definer;
alter function public.set_ai_quote_payment_terms(uuid, uuid, text)
security definer;
alter function public.set_ai_quote_validity(uuid, uuid, date)
security definer;
alter function public.set_ai_quote_worksite_address(uuid, uuid, uuid)
security definer;
alter function public.update_ai_quote_note(uuid, uuid, text)
security definer;
alter function public.set_ai_quote_discount(uuid, uuid, integer, integer)
security definer;
alter function public.set_ai_quote_deposit(uuid, uuid, integer, integer)
security definer;
alter function public.undo_last_ai_quote_action(uuid, uuid)
security definer;

revoke all on function public.add_catalog_quote_line(uuid, uuid, uuid, bigint, text, integer) from public, anon;
revoke all on function public.update_ai_quote_line(uuid, uuid, uuid, bigint, text) from public, anon;
revoke all on function public.delete_ai_quote_line(uuid, uuid, uuid) from public, anon;
revoke all on function public.set_ai_quote_payment_terms(uuid, uuid, text) from public, anon;
revoke all on function public.set_ai_quote_validity(uuid, uuid, date) from public, anon;
revoke all on function public.set_ai_quote_worksite_address(uuid, uuid, uuid) from public, anon;
revoke all on function public.update_ai_quote_note(uuid, uuid, text) from public, anon;
revoke all on function public.set_ai_quote_discount(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.set_ai_quote_deposit(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.undo_last_ai_quote_action(uuid, uuid) from public, anon;

grant execute on function public.add_catalog_quote_line(uuid, uuid, uuid, bigint, text, integer) to authenticated;
grant execute on function public.update_ai_quote_line(uuid, uuid, uuid, bigint, text) to authenticated;
grant execute on function public.delete_ai_quote_line(uuid, uuid, uuid) to authenticated;
grant execute on function public.set_ai_quote_payment_terms(uuid, uuid, text) to authenticated;
grant execute on function public.set_ai_quote_validity(uuid, uuid, date) to authenticated;
grant execute on function public.set_ai_quote_worksite_address(uuid, uuid, uuid) to authenticated;
grant execute on function public.update_ai_quote_note(uuid, uuid, text) to authenticated;
grant execute on function public.set_ai_quote_discount(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.set_ai_quote_deposit(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.undo_last_ai_quote_action(uuid, uuid) to authenticated;
