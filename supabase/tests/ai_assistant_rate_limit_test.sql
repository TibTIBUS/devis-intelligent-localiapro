begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_table('private', 'ai_assistant_request_rate_limits', 'assistant request quota state should exist');
select ok((select relrowsecurity from pg_class where oid = 'private.ai_assistant_request_rate_limits'::regclass), 'assistant request quota state should have RLS enabled');
select ok(not has_table_privilege('authenticated', 'private.ai_assistant_request_rate_limits', 'select'), 'authenticated users should not read assistant quota state');
select has_function('public', 'consume_ai_assistant_request_quota', array['uuid'], 'the assistant quota function should exist');
select ok(not has_function_privilege('anon', 'public.consume_ai_assistant_request_quota(uuid)', 'EXECUTE'), 'anonymous users should not consume assistant quota');
select ok(not has_function_privilege('authenticated', 'public.consume_ai_assistant_request_quota(uuid)', 'EXECUTE'), 'authenticated users should not consume assistant quota directly');
select ok(has_function_privilege('service_role', 'public.consume_ai_assistant_request_quota(uuid)', 'EXECUTE'), 'the server role should consume assistant quota');

set local role service_role;
select ok(public.consume_ai_assistant_request_quota('00000000-0000-0000-0000-000000000091'), 'the first assistant request should be allowed');
select public.consume_ai_assistant_request_quota('00000000-0000-0000-0000-000000000091') from generate_series(1, 9);
select ok(not public.consume_ai_assistant_request_quota('00000000-0000-0000-0000-000000000091'), 'the eleventh assistant request should be denied');

select * from finish();
rollback;
