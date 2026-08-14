alter table private.ai_assistant_request_rate_limits
  add column bucket text not null default 'assistant'
    check (char_length(btrim(bucket)) > 0);

alter table private.ai_assistant_request_rate_limits
  drop constraint ai_assistant_request_rate_limits_pkey;

alter table private.ai_assistant_request_rate_limits
  add constraint ai_assistant_request_rate_limits_pkey
  primary key (actor_user_id, bucket);

alter table private.ai_assistant_request_rate_limits
  alter column bucket drop default;

drop function public.consume_ai_assistant_request_quota(uuid);

create function public.consume_ai_assistant_request_quota(
  p_actor_user_id uuid,
  p_bucket text,
  p_limit integer
)
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
  if p_bucket is null or char_length(btrim(p_bucket)) = 0 then
    raise exception using errcode = '22023', message = 'Bucket is required.';
  end if;
  if p_limit is null or p_limit <= 0 then
    raise exception using errcode = '22023', message = 'Limit must be a positive integer.';
  end if;

  insert into private.ai_assistant_request_rate_limits as rate_limit (
    actor_user_id,
    bucket,
    request_count,
    window_started_at
  ) values (
    p_actor_user_id,
    p_bucket,
    1,
    window_start
  )
  on conflict (actor_user_id, bucket) do update
  set request_count = case
        when rate_limit.window_started_at = excluded.window_started_at
          then rate_limit.request_count + 1
        else 1
      end,
      window_started_at = excluded.window_started_at
  returning rate_limit.request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_ai_assistant_request_quota(uuid, text, integer) from public;
revoke all on function public.consume_ai_assistant_request_quota(uuid, text, integer) from anon;
revoke all on function public.consume_ai_assistant_request_quota(uuid, text, integer) from authenticated;
grant execute on function public.consume_ai_assistant_request_quota(uuid, text, integer) to service_role;
