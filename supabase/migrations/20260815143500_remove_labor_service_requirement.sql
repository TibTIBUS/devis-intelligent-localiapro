do $$
declare
  function_definition text;
  old_rule text := $rule$
    if not exists (
      select 1 from public.quote_lines line
      where line.organization_id = p_organization_id
        and line.quote_id = p_quote_id
        and line.line_kind in ('labor', 'service')
    ) then
      errors := errors || jsonb_build_array(jsonb_build_object('code', 'MISSING_LABOR_OR_SERVICE_LINE', 'field', 'lines'));
    end if;
$rule$;
begin
  select pg_get_functiondef('private.get_quote_compliance_result(uuid,uuid,date)'::regprocedure)
  into function_definition;

  if position(old_rule in function_definition) = 0 then
    raise exception 'Expected labor/service compliance rule was not found.';
  end if;

  function_definition := replace(function_definition, old_rule, '');
  execute function_definition;
end;
$$;
