create policy "service role manages assistant request quota"
on private.ai_assistant_request_rate_limits
for all
to service_role
using (true)
with check (true);
