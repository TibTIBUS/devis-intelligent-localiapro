create table private.ai_assistant_request_rate_limits (
  actor_user_id uuid primary key,
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null
);

alter table private.ai_assistant_request_rate_limits enable row level security;

create function public.consume_ai_assistant_request_quota(p_actor_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_start timestamptz := date_trunc('minute', now());
  allowed boolean;
begin
  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'Actor is required.';
  end if;

  insert into private.ai_assistant_request_rate_limits as rate_limit (
    actor_user_id,
    request_count,
    window_started_at
  ) values (
    p_actor_user_id,
    1,
    window_start
  )
  on conflict (actor_user_id) do update
  set request_count = case
        when rate_limit.window_started_at = excluded.window_started_at
          then rate_limit.request_count + 1
        else 1
      end,
      window_started_at = excluded.window_started_at
  returning rate_limit.request_count <= 10 into allowed;

  return allowed;
end;
$$;

revoke all on table private.ai_assistant_request_rate_limits from public;
revoke all on function public.consume_ai_assistant_request_quota(uuid) from public;
revoke all on function public.consume_ai_assistant_request_quota(uuid) from anon;
revoke all on function public.consume_ai_assistant_request_quota(uuid) from authenticated;
grant execute on function public.consume_ai_assistant_request_quota(uuid) to service_role;
