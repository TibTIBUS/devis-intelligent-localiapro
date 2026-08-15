-- Les devis finalisés restent immuables pour tout le monde : un devis accepté
-- vaut contrat et sert de preuve. On ouvre une seule exception, réservée aux
-- comptes app_admins, pour purger entièrement un devis de bout en bout (nettoyage
-- des devis de test). L'exception ne desserre jamais la mise à jour d'un devis
-- finalisé : elle n'autorise que la suppression complète, et uniquement à
-- l'intérieur de la transaction ouverte par public.purge_quote().

create function private.quote_purge_is_allowed()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('app.purge_quote', true), '') = 'on';
$$;

revoke all on function private.quote_purge_is_allowed() from public, anon;

create or replace function private.protect_finalized_quote()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'finalized'
    and not (tg_op = 'DELETE' and private.quote_purge_is_allowed())
  then
    raise exception using
      errcode = '55000',
      message = 'A finalized quote is immutable.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.ensure_quote_is_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_organization_id uuid := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
  target_quote_id uuid := case when tg_op = 'DELETE' then old.quote_id else new.quote_id end;
  target_quote_status text;
begin
  select status into target_quote_status
  from public.quotes
  where id = target_quote_id
    and organization_id = target_organization_id;

  if found
    and target_quote_status = 'finalized'
    and not (tg_op = 'DELETE' and private.quote_purge_is_allowed())
  then
    raise exception using
      errcode = '55000',
      message = 'A finalized quote is immutable.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.prevent_quote_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and private.quote_purge_is_allowed() then
    return old;
  end if;

  raise exception using
    errcode = '55000',
    message = 'A quote version is immutable.';
end;
$$;

create or replace function private.prevent_quote_acceptance_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and private.quote_purge_is_allowed() then
    return old;
  end if;

  raise exception using
    errcode = '55000',
    message = 'A quote acceptance record is immutable.';
end;
$$;

-- Supprime définitivement un devis et tout ce qui en dépend. Renvoie les
-- chemins des PDF stockés pour que l'appelant vide aussi le bucket : le
-- stockage n'est pas nettoyé par les clés étrangères.
create function public.purge_quote(
  p_organization_id uuid,
  p_quote_id uuid
)
returns table (bucket_id text, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
begin
  if v_actor_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  if not exists (select 1 from public.app_admins where user_id = v_actor_user_id) then
    raise exception using errcode = '42501', message = 'Quote purge is reserved to administrators.';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = v_actor_user_id
  ) then
    raise exception using errcode = '42501', message = 'Quote purge is reserved to organization members.';
  end if;

  if not exists (
    select 1 from public.quotes
    where id = p_quote_id and organization_id = p_organization_id
  ) then
    raise exception using errcode = 'P0002', message = 'Quote not found.';
  end if;

  perform set_config('app.purge_quote', 'on', true);

  -- L'ordre est imposé par les clés étrangères « on delete restrict » :
  -- envois, puis acceptations, puis documents, puis versions, puis le devis.
  -- Les sections, lignes et actions IA partent en cascade avec le devis.
  delete from public.quote_document_emails
  where organization_id = p_organization_id and quote_id = p_quote_id;

  delete from public.quote_acceptances
  where organization_id = p_organization_id and quote_id = p_quote_id;

  return query
  delete from public.documents
  where organization_id = p_organization_id and quote_id = p_quote_id
  returning documents.storage_bucket, documents.storage_path;

  delete from public.quote_versions
  where organization_id = p_organization_id and quote_id = p_quote_id;

  delete from public.quotes
  where organization_id = p_organization_id and id = p_quote_id;
end;
$$;

revoke all on function public.purge_quote(uuid, uuid) from public, anon;
grant execute on function public.purge_quote(uuid, uuid) to authenticated;
