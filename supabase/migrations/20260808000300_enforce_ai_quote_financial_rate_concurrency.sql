drop function public.set_ai_quote_discount(uuid, uuid, integer);
drop function public.set_ai_quote_deposit(uuid, uuid, integer);

create function public.set_ai_quote_discount(
  p_organization_id uuid,
  p_quote_id uuid,
  p_expected_rate_basis_points integer,
  p_discount_rate_basis_points integer
) returns table (action_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare v_before integer; v_action_id uuid;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_expected_rate_basis_points not between 0 and 10000
    or p_discount_rate_basis_points not between 0 and 10000
  then raise exception using errcode = '22023', message = 'Invalid discount rate'; end if;
  select discount_rate_basis_points into v_before from public.quotes
  where organization_id = p_organization_id and id = p_quote_id and status = 'draft' for update;
  if not found then raise exception using errcode = 'P0002', message = 'Draft quote not found'; end if;
  if v_before is distinct from p_expected_rate_basis_points then
    raise exception using errcode = '40001', message = 'Quote changed after AI proposal';
  end if;
  update public.quotes set discount_rate_basis_points = p_discount_rate_basis_points
  where organization_id = p_organization_id and id = p_quote_id;
  insert into public.quote_ai_actions (organization_id, quote_id, action_type, payload)
  values (p_organization_id, p_quote_id, 'set_discount', jsonb_build_object('before', v_before, 'after', p_discount_rate_basis_points))
  returning id into v_action_id;
  return query select v_action_id;
end; $$;

create function public.set_ai_quote_deposit(
  p_organization_id uuid,
  p_quote_id uuid,
  p_expected_rate_basis_points integer,
  p_deposit_rate_basis_points integer
) returns table (action_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare v_before integer; v_action_id uuid;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'Authentication required'; end if;
  if p_expected_rate_basis_points not between 0 and 10000
    or p_deposit_rate_basis_points not between 0 and 10000
  then raise exception using errcode = '22023', message = 'Invalid deposit rate'; end if;
  select deposit_rate_basis_points into v_before from public.quotes
  where organization_id = p_organization_id and id = p_quote_id and status = 'draft' for update;
  if not found then raise exception using errcode = 'P0002', message = 'Draft quote not found'; end if;
  if v_before is distinct from p_expected_rate_basis_points then
    raise exception using errcode = '40001', message = 'Quote changed after AI proposal';
  end if;
  update public.quotes set deposit_rate_basis_points = p_deposit_rate_basis_points
  where organization_id = p_organization_id and id = p_quote_id;
  insert into public.quote_ai_actions (organization_id, quote_id, action_type, payload)
  values (p_organization_id, p_quote_id, 'set_deposit', jsonb_build_object('before', v_before, 'after', p_deposit_rate_basis_points))
  returning id into v_action_id;
  return query select v_action_id;
end; $$;

revoke all on function public.set_ai_quote_discount(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.set_ai_quote_deposit(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.set_ai_quote_discount(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.set_ai_quote_deposit(uuid, uuid, integer, integer) to authenticated;
