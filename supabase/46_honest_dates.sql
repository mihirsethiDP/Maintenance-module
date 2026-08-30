-- ===================================================================
-- DigitalPaani Maintenance Ops — honest dates
-- Run in Supabase → SQL Editor (after 45). No function redeploys.
--
-- Completion and start dates are CLAIMS typed on a device — and that is
-- a feature: "set the completion date to the day you actually did the
-- work" is taught in the guides, and the offline outbox depends on it.
-- But a wrong device clock (or a creative user) could backdate silently:
-- an overdue job completed "on time" with no trace.
--
-- Three changes make the claim honest without breaking the feature:
--   1. BOUNDS, server-side in IST: no future dates, nothing before the
--      job started, and backdating capped at 30 days.
--   2. A RECORD: completed_recorded_at is stamped from the server clock
--      whenever a completion lands, alongside the claimed end_date.
--      (created_at has always done this for the start.)
--   3. VISIBILITY: the app shows "recorded N days after the work" to the
--      reviewing engineer when the two disagree by more than a day —
--      which is also simply TRUE for offline completions that synced
--      later. Same philosophy as everywhere here: you cannot technically
--      stop a wrench, but you can make the record impossible to miss.
-- ===================================================================

alter table public.maintenance_logs add column if not exists completed_recorded_at timestamptz;

-- ---- Completion: bounds + the server stamp ----
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null,
  p_part_actions jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_assigned uuid; v_photos boolean; v_start date; v_is_tech boolean; v_today date; pa jsonb;
begin
  select equipment_id, assigned_to, photos_required, start_date
    into v_eq, v_assigned, v_photos, v_start
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
  if p_end < v_start then
    raise exception 'The completion date is before the job started (%).', v_start;
  end if;
  if p_end < v_today - 30 then
    raise exception 'Completions can be recorded up to 30 days after the work. For older records, ask your admin.';
  end if;

  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,''),
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

-- ---- Starting: same bounds on the claimed start date ----
create or replace function public.log_maintenance_start(
  p_id text, p_eq text, p_reason text, p_start date, p_etr date, p_tech text, p_notes text,
  p_priority text default 'Normal', p_part_id bigint default null, p_severity text default null,
  p_assigned uuid default null, p_photos boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare v_today date;
begin
  if not public.has_plant_access((select plant_id from public.equipment where id = p_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if coalesce(public.my_role(),'') = 'Technician' then
    raise exception 'Technicians complete work orders; engineers create them.';
  end if;
  if p_assigned is not null and not exists (
    select 1 from public.profiles
    where id = p_assigned and coalesce(status,'active') = 'active') then
    raise exception 'The assigned person''s account is not active.';
  end if;
  if exists (select 1 from public.maintenance_logs where equipment_id = p_eq and end_date is null) then
    raise exception 'This equipment already has an open work-order.';
  end if;

  v_today := (now() at time zone 'Asia/Kolkata')::date;
  if p_start is null then raise exception 'A start date is required.'; end if;
  if p_start > v_today then
    raise exception 'The start date cannot be in the future — the machine would show as down before anyone touched it.';
  end if;
  if p_start < v_today - 30 then
    raise exception 'Work can be recorded up to 30 days late. For older records, ask your admin.';
  end if;
  if p_etr is not null and p_etr < p_start then
    raise exception 'Expected completion cannot be before the start date.';
  end if;

  insert into public.maintenance_logs
    (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority,
     affected_part_id, severity, assigned_to, assigned_by, photos_required)
  values (p_id, p_eq, p_reason, p_start, p_etr, p_tech, coalesce(p_notes,''), 'active',
          case when p_priority in ('Critical','High','Normal') then p_priority else 'Normal' end,
          p_part_id,
          case when p_severity in ('Minor','Major','Critical') then p_severity else null end,
          p_assigned, case when p_assigned is not null then auth.uid() end,
          coalesce(p_photos, false) or p_reason = 'Breakdown');
  update public.equipment
    set status = case when p_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = p_eq;
end;
$$;

-- ---- Verify: every row ok = 1 ----
select 'recorded-at column' as what,
       (select count(*) from information_schema.columns
        where table_name = 'maintenance_logs' and column_name = 'completed_recorded_at') as ok
union all
select 'complete has bounds',
       (select (prosrc like '%cannot be in the future%')::int from pg_proc where proname = 'log_maintenance_complete')
union all
select 'start has bounds',
       (select (prosrc like '%cannot be in the future%')::int from pg_proc where proname = 'log_maintenance_start');
