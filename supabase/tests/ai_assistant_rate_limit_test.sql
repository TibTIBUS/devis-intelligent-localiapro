begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('private', 'ai_assistant_request_rate_limits', 'assistant request quota state should exist');
select ok((select relrowsecurity from pg_class where oid = 'private.ai_assistant_request_rate_limits'::regclass), 'assistant request quota state should have RLS enabled');
select ok(not has_table_privilege('authenticated', 'private.ai_assistant_request_rate_limits', 'select'), 'authenticated users should not read assistant quota state');
select has_function('public', 'consume_ai_assistant_request_quota', array['uuid', 'text', 'integer'], 'the assistant quota function should exist');
select ok(not has_function_privilege('anon', 'public.consume_ai_assistant_request_quota(uuid, text, integer)', 'EXECUTE'), 'anonymous users should not consume assistant quota');
select ok(not has_function_privilege('authenticated', 'public.consume_ai_assistant_request_quota(uuid, text, integer)', 'EXECUTE'), 'authenticated users should not consume assistant quota directly');
select ok(has_function_privilege('service_role', 'public.consume_ai_assistant_request_quota(uuid, text, integer)', 'EXECUTE'), 'the server role should consume assistant quota');

set local role service_role;
select ok(public.consume_ai_assistant_request_quota('00000000-0000-0000-0000-000000000091', 'assistant', 10), 'the first assistant request should be allowed');
select public.consume_ai_assistant_request_quota('00000000-0000-0000-0000-000000000091', 'assistant', 10) from generate_series(1, 9);
select ok(not public.consume_ai_assistant_request_quota('00000000-0000-0000-0000-000000000091', 'assistant', 10), 'the eleventh assistant request should be denied');

select ok(public.consume_ai_assistant_request_quota('00000000-0000-0000-0000-000000000091', 'voice_transcribe', 5), 'a distinct bucket for the same actor should have its own independent quota');

select * from finish();
rollback;
