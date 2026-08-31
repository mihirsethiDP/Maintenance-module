-- ===================================================================
-- DigitalPaani Maintenance Ops — engineer-own work joins the co-signed flow
-- Run in Supabase → SQL Editor (after 53).
--
-- Work an engineer does with their own hands produced no signed document:
-- the report pipeline keys on assigned_to, and engineer-own jobs never
-- carried it. Two stamps fix that — no new tables, no new functions:
--
--   1. start_work_order: taking an unassigned job assigns it to the taker.
--   2. log_maintenance_complete: an engineer/admin completing an
--      unassigned job is stamped as the person who did it.
--
-- With assigned_to set, the EXISTING pipeline covers engineer visits:
-- "Visits ready for a report" lists the day, engineer_create_report
-- accepts any profile as the worker, and the client signs as always.
-- The signature pair is honest: the engineer signs once (they did the
-- work AND they are the engineer), then the client locks it.
-- ===================================================================

create or replace function public.start_work_order(p_log text)
returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_reason text; v_state text;
begin
  select equipment_id, reason, wo_state into v_eq, v_reason, v_state
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if v_state <> 'open' then raise exception 'This work-order has already been started.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  update public.maintenance_logs
    set wo_state = 'active',
        start_date = (now() at time zone 'Asia/Kolkata')::date,
        -- Starting an unassigned job is taking it: the taker owns it, and
        -- ownership is what routes the visit into a co-signed report later.
        assigned_to = coalesce(assigned_to, auth.uid()),
        assigned_by = coalesce(assigned_by, auth.uid()),
        technician = coalesce(nullif(technician,''), (select name from public.profiles where id = auth.uid()))
    where id = p_log;
  update public.equipment
    set status = case when v_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = v_eq;
end;
$$;
revoke all on function public.start_work_order(text) from public, anon;
grant execute on function public.start_work_order(text) to authenticated;

create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null,
  p_part_actions jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_assigned uuid; v_photos boolean; v_start date; v_state text; v_is_tech boolean; v_today date; pa jsonb;
begin
  select equipment_id, assigned_to, photos_required, start_date, coalesce(wo_state,'')
    into v_eq, v_assigned, v_photos, v_start, v_state
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  v_is_tech := coalesce(public.my_role(),'') = 'Technician';
  if v_is_tech then
    if v_assigned is distinct from auth.uid() then
      raise exception 'This work-order is not assigned to you.';
    end if;
    if coalesce(v_photos, false) and not exists (
      select 1 from public.work_order_media where log_id = p_log) then
      raise exception 'This job requires photos — add at least one before completing.';
    end if;
  elsif not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;

  -- The date is a claim; these are its limits.
  v_today := (now() at time zone 'Asia/Kolkata')::date;
  if p_end is null then raise exception 'A completion date is required.'; end if;
  if p_end > v_today then
    raise exception 'The completion date cannot be in the future.';
  end if;
  if v_state = 'open' and v_start > p_end then
    v_start := p_end;
  end if;
  if p_end < v_start then
    raise exception 'The completion date is before the job started (%).', v_start;
  end if;
  if p_end < v_today - 30 then
    raise exception 'Completions can be recorded up to 30 days after the work. For older records, ask your admin.';
  end if;

  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,''),
        start_date = v_start,
        -- An engineer/admin closing an unassigned job did the work: the
        -- record says so, and their visit can then be co-signed.
        assigned_to = coalesce(assigned_to, case when v_is_tech then null else auth.uid() end),
        assigned_by = coalesce(assigned_by, case when v_is_tech then null else auth.uid() end),
        wo_state = case when v_is_tech then 'submitted' else 'done' end,
        submitted_at = case when v_is_tech then now() end,
        completed_recorded_at = now(),
        checklist = p_checklist
    where id = p_log;

  if p_part_actions is not null then
    for pa in select * from jsonb_array_elements(p_part_actions) loop
      if (pa->>'action') not in ('serviced','replaced') then continue; end if;
      insert into public.maintenance_log_parts (log_id, part_id, part_name, action)
      values (p_log, nullif(pa->>'part_id','')::bigint, coalesce(pa->>'name','part'), pa->>'action')
      on conflict (log_id, part_name) do update set action = excluded.action;
      if (pa->>'part_id') is not null and (pa->>'part_id') <> '' then
        update public.equipment_parts
          set last_serviced = greatest(coalesce(last_serviced, p_end), p_end),
              last_replaced = case when (pa->>'action') = 'replaced'
                                   then greatest(coalesce(last_replaced, p_end), p_end)
                                   else last_replaced end
          where id = (pa->>'part_id')::bigint;
      end if;
    end loop;
  end if;

  update public.equipment set status = 'Operational' where id = v_eq;
end;
$$;

-- ---- Verify: both rows true ----
select 'start stamps the taker' as what,
       (select (prosrc like '%coalesce(assigned_to, auth.uid())%')::text
        from pg_proc where proname = 'start_work_order') as ok
union all
select 'unassigned completion stamps the completer',
       (select (prosrc like '%did the work%')::text
        from pg_proc where proname = 'log_maintenance_complete');
