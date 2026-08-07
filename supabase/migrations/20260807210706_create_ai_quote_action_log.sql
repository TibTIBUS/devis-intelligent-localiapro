alter table public.quote_lines
add constraint quote_lines_organization_quote_id_key
unique (organization_id, quote_id, id);

create table public.quote_ai_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quote_id uuid not null,
  actor_user_id uuid not null default auth.uid()
    references auth.users (id) on delete restrict,
  action_type text not null
    check (action_type in ('add_quote_line')),
  line_id uuid,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  undone_at timestamptz,
  constraint quote_ai_actions_quote_fkey
    foreign key (organization_id, quote_id)
    references public.quotes (organization_id, id)
    on delete cascade,
  constraint quote_ai_actions_line_fkey
    foreign key (organization_id, quote_id, line_id)
    references public.quote_lines (organization_id, quote_id, id)
    on delete set null (line_id),
  constraint quote_ai_actions_undo_date_check
    check (undone_at is null or undone_at >= created_at)
);

create index quote_ai_actions_actor_quote_created_idx
on public.quote_ai_actions (
  organization_id,
  quote_id,
  actor_user_id,
  created_at desc,
  id desc
);

alter table public.quote_ai_actions enable row level security;

revoke all on public.quote_ai_actions from anon;
revoke all on public.quote_ai_actions from authenticated;
grant select, insert, update on public.quote_ai_actions to authenticated;

create policy "quote_ai_actions_select_actor"
on public.quote_ai_actions for select to authenticated
using (
  actor_user_id = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create policy "quote_ai_actions_insert_actor"
on public.quote_ai_actions for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create policy "quote_ai_actions_update_actor"
on public.quote_ai_actions for update to authenticated
using (
  actor_user_id = (select auth.uid())
  and (select private.is_organization_member(organization_id))
)
with check (
  actor_user_id = (select auth.uid())
  and (select private.is_organization_member(organization_id))
);

create or replace function public.add_catalog_quote_line(
  p_organization_id uuid,
  p_quote_id uuid,
  p_catalog_item_id uuid,
  p_quantity_milliunits bigint,
  p_line_kind text,
  p_vat_rate_basis_points integer
)
returns table (
  action_id uuid,
  line_id uuid,
  label text,
  unit text,
  unit_price_ht_cents bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_catalog_item public.catalog_items%rowtype;
  v_line_id uuid;
  v_action_id uuid;
  v_position bigint;
begin
  if v_actor_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_quantity_milliunits <= 0 then
    raise exception using errcode = '22023', message = 'Quantity must be positive';
  end if;

  if p_line_kind not in ('labor', 'material', 'travel', 'service', 'other') then
    raise exception using errcode = '22023', message = 'Invalid line kind';
  end if;

  if p_vat_rate_basis_points is null
    or p_vat_rate_basis_points < 0
    or p_vat_rate_basis_points > 10000 then
    raise exception using errcode = '22023', message = 'Invalid VAT rate';
  end if;

  select item.*
  into v_catalog_item
  from public.catalog_items item
  where item.organization_id = p_organization_id
    and item.id = p_catalog_item_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Catalog item not found';
  end if;

  if v_catalog_item.unit_price_ht_cents is null then
    raise exception using errcode = '22023', message = 'Catalog price is required';
  end if;

  perform 1
  from public.quotes quote
  where quote.organization_id = p_organization_id
    and quote.id = p_quote_id
    and quote.status = 'draft';

  if not found then
    raise exception using errcode = 'P0002', message = 'Draft quote not found';
  end if;

  select coalesce(max(line.position), -1) + 1
  into v_position
  from public.quote_lines line
  where line.organization_id = p_organization_id
    and line.quote_id = p_quote_id;

  insert into public.quote_lines (
    organization_id,
    quote_id,
    catalog_item_id,
    label,
    description,
    line_kind,
    unit,
    quantity_milliunits,
    unit_price_ht_cents,
    vat_rate_basis_points,
    position
  ) values (
    p_organization_id,
    p_quote_id,
    p_catalog_item_id,
    v_catalog_item.name,
    v_catalog_item.description,
    p_line_kind,
    v_catalog_item.unit,
    p_quantity_milliunits,
    v_catalog_item.unit_price_ht_cents,
    p_vat_rate_basis_points,
    v_position
  )
  returning id into v_line_id;

  insert into public.quote_ai_actions (
    organization_id,
    quote_id,
    actor_user_id,
    action_type,
    line_id,
    payload
  ) values (
    p_organization_id,
    p_quote_id,
    v_actor_user_id,
    'add_quote_line',
    v_line_id,
    jsonb_build_object(
      'catalogItemId', p_catalog_item_id,
      'quantityMilliunits', p_quantity_milliunits,
      'unitPriceHtCents', v_catalog_item.unit_price_ht_cents,
      'vatRateBasisPoints', p_vat_rate_basis_points
    )
  )
  returning id into v_action_id;

  return query
  select
    v_action_id,
    v_line_id,
    v_catalog_item.name,
    v_catalog_item.unit,
    v_catalog_item.unit_price_ht_cents;
end;
$$;

create or replace function public.undo_last_ai_quote_action(
  p_organization_id uuid,
  p_quote_id uuid
)
returns table (
  action_id uuid,
  removed_line_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_action public.quote_ai_actions%rowtype;
  v_removed_line_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select action.*
  into v_action
  from public.quote_ai_actions action
  where action.organization_id = p_organization_id
    and action.quote_id = p_quote_id
    and action.actor_user_id = auth.uid()
    and action.action_type = 'add_quote_line'
    and action.undone_at is null
    and action.line_id is not null
  order by action.created_at desc, action.id desc
  limit 1
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'No action to undo';
  end if;

  delete from public.quote_lines line
  where line.organization_id = p_organization_id
    and line.quote_id = p_quote_id
    and line.id = v_action.line_id
  returning line.id into v_removed_line_id;

  if v_removed_line_id is null then
    raise exception using errcode = 'P0002', message = 'Quote line not found';
  end if;

  update public.quote_ai_actions action
  set undone_at = timezone('utc', now())
  where action.id = v_action.id;

  return query select v_action.id, v_removed_line_id;
end;
$$;

revoke all on function public.add_catalog_quote_line(uuid, uuid, uuid, bigint, text, integer) from public, anon;
revoke all on function public.undo_last_ai_quote_action(uuid, uuid) from public, anon;
grant execute on function public.add_catalog_quote_line(uuid, uuid, uuid, bigint, text, integer) to authenticated;
grant execute on function public.undo_last_ai_quote_action(uuid, uuid) to authenticated;
