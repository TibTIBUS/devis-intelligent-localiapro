create index quote_ai_actions_actor_user_idx
on public.quote_ai_actions (actor_user_id);

create index quote_ai_actions_line_reference_idx
on public.quote_ai_actions (organization_id, quote_id, line_id)
where line_id is not null;
