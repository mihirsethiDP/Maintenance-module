-- ===================================================================
-- DigitalPaani Maintenance Ops — scheduling tomorrow's work
-- Run in Supabase → SQL Editor (after 52).
--
-- Honest dates distinguish a PLAN from a CLAIM. An 'open' work order is
-- a plan — its date may be in the future, the machine stays in service,
-- nothing is claimed. Reality begins at Start Work, which stamps the
-- actual start date (today, IST) — and from there the existing bounds
-- apply unchanged: no future starts, no future completions.
--
-- Four pieces:
--   1. schedule_work_order(): engineers/admins create an OPEN job for a
--      future day (up to 60 days out), assigned or not.
--   2. The PPM generator creates each job 3 days before its due date,
--      so the week can be assigned in advance.
--   3. Completing a still-open job EARLIER than its planned day clamps
--      the start to the completion day — doing planned work early is
--      honest; a record that starts after it ended is not.
--   4. start_work_order stamps the real start in IST (was UTC).
-- ===================================================================

-- ---- 1. Schedule a job for a future day ----
create or replace function public.schedule_work_order(
  p_id text, p_eq text, p_reason text, p_date date, p_etr date, p_tech text, p_notes text,
  p_priority text default 'Normal', p_assigned uuid default null, p_photos boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare v_today date;
begin
  if coalesce(public.my_role(),'') = 'Technician' then
    raise exception 'Technicians complete work orders; engineers create them.';
  end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = p_eq)) then
    raise exception 'No access to this equipment''s plant.';
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
  if p_date is null then raise exception 'A date is required.'; end if;
  if p_date < v_today then
    raise exception 'To record work that already happened, use Put in Maintenance — scheduling is for today onward.';
  end if;
  if p_date > v_today + 60 then
    raise exception 'Jobs can be scheduled up to 60 days ahead.';
  end if;
  if p_etr is not null and p_etr < p_date then
    raise exception 'Expected completion cannot be before the scheduled day.';
  end if;

  -- 'open' is the whole point: a plan. The machine is untouched, and
  -- Start Work stamps the real start date when reality begins.
  insert into public.maintenance_logs
    (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority,
     assigned_to, assigned_by, photos_required)
  values (p_id, p_eq, p_reason, p_date, coalesce(p_etr, p_date), coalesce(p_tech,''),
          coalesce(p_notes,''), 'open',
          case when p_priority in ('Critical','High','Normal') then p_priority else 'Normal' end,
          p_assigned, case when p_assigned is not null then auth.uid() end,
          coalesce(p_photos, false) or p_reason = 'Breakdown');
end;
$$;
revoke all on function public.schedule_work_order(text,text,text,date,date,text,text,text,uuid,boolean) from public, anon;
grant execute on function public.schedule_work_order(text,text,text,date,date,text,text,text,uuid,boolean) to authenticated;

-- ---- 2. Generator: create PPM jobs 3 days ahead of their due date ----
create or replace function public.generate_ppm_work_orders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  eq record;
  created integer := 0;
  slot_day integer;
  d date;
begin
  for eq in
    select e.id, e.tag, e.slot from public.equipment e
    where e.slot is not null
      and e.status = 'Operational'
      and not exists (select 1 from public.maintenance_logs l
                      where l.equipment_id = e.id and l.end_date is null)
  loop
    slot_day := case eq.slot when 'W1' then 4 when 'W2' then 11 when 'W3' then 18 when 'W4' then 25 else null end;
    -- Look at today and the next 3 days; create for the FIRST matching
    -- slot date, dated on that due date (one open job per machine at a
    -- time — the guard above keeps later dates waiting their turn).
    for i in 0..3 loop
      d := current_date + i;
      if (eq.slot = 'weekly' and (d - date '2026-01-01') % 7 = 0)
         or (slot_day is not null and extract(day from d)::int = slot_day) then
        insert into public.maintenance_logs
          (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority)
        values
          ('L-AUTO-' || to_char(d,'YYYYMMDD') || '-' || eq.id,
           eq.id, 'Scheduled', d, d, '',
           'Auto-generated from PPM schedule.', 'open', 'Normal')
        on conflict (id) do nothing;
        created := created + 1;
        exit;  -- one per machine
      end if;
    end loop;
  end loop;
  return created;
end;
$$;

-- ---- 3. Completing a planned job early clamps the start to reality ----
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
  -- A still-open job dated for a later day, finished early: the plan was
  -- later, reality is now — the start clamps to the completion day. A
  -- STARTED job keeps the strict bound: its start date is already real.
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

-- ---- 4. Start Work stamps the real start in IST ----
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
        -- The plan ends here: the start date becomes the day work really began.
        start_date = (now() at time zone 'Asia/Kolkata')::date,
        technician = coalesce(nullif(technician,''), (select name from public.profiles where id = auth.uid()))
    where id = p_log;
  update public.equipment
    set status = case when v_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = v_eq;
end;
$$;
revoke all on function public.start_work_order(text) from public, anon;
grant execute on function public.start_work_order(text) to authenticated;

-- ---- Verify: every row true ----
select 'schedule fn exists' as what,
       (select count(*) = 1 from pg_proc where proname = 'schedule_work_order')::text as ok
union all
select 'generator looks ahead',
       (select (prosrc like '%current_date + i%')::text from pg_proc where proname = 'generate_ppm_work_orders')
union all
select 'early completion clamps start',
       (select (prosrc like '%v_start := p_end%')::text from pg_proc where proname = 'log_maintenance_complete')
union all
select 'start stamps IST',
       (select (prosrc like '%Asia/Kolkata%')::text from pg_proc where proname = 'start_work_order');
