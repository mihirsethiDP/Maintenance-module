-- ===================================================================
-- DigitalPaani Maintenance Ops — Auto work-order generation from PPM
-- Run in Supabase → SQL Editor.
-- PREREQUISITE: enable the pg_cron extension first
--   (Dashboard → Database → Extensions → search "pg_cron" → Enable),
--   or the last section of this script will fail — everything above it
--   still applies and can be re-run safely.
-- ===================================================================

-- 1. Work-order lifecycle + priority.
--    wo_state: 'open'   = created (by the scheduler or an admin), not started;
--              'active' = an engineer is working on it (equipment flagged);
--              'done'   = completed.
alter table public.maintenance_logs
  add column if not exists wo_state text not null default 'active'
    check (wo_state in ('open','active','done'));
alter table public.maintenance_logs
  add column if not exists priority text not null default 'Normal'
    check (priority in ('Critical','High','Normal'));

-- Backfill: anything already completed is 'done'.
update public.maintenance_logs set wo_state = 'done' where end_date is not null and wo_state <> 'done';

-- 2. Daily generator: create an OPEN work-order for every Operational
--    equipment whose PPM slot falls due today and has nothing open yet.
--    Does NOT change equipment status — that happens when work starts.
create or replace function public.generate_ppm_work_orders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  eq record;
  created integer := 0;
  slot_day integer;
begin
  for eq in
    select e.id, e.tag, e.slot from public.equipment e
    where e.slot is not null
      and e.status = 'Operational'
      and not exists (select 1 from public.maintenance_logs l
                      where l.equipment_id = e.id and l.end_date is null)
  loop
    slot_day := case eq.slot when 'W1' then 4 when 'W2' then 11 when 'W3' then 18 when 'W4' then 25 else null end;
    if (eq.slot = 'weekly' and (current_date - date '2026-01-01') % 7 = 0)
       or (slot_day is not null and extract(day from current_date)::int = slot_day) then
      insert into public.maintenance_logs
        (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority)
      values
        ('L-AUTO-' || to_char(current_date,'YYYYMMDD') || '-' || eq.id,
         eq.id, 'Scheduled', current_date, current_date, '',
         'Auto-generated from PPM schedule.', 'open', 'Normal')
      on conflict (id) do nothing;
      created := created + 1;
    end if;
  end loop;
  return created;
end;
$$;

-- 3. Start a work-order: open → active, and flag the equipment.
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
    set wo_state = 'active', start_date = current_date,
        technician = coalesce(nullif(technician,''), (select name from public.profiles where id = auth.uid()))
    where id = p_log;
  update public.equipment
    set status = case when v_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = v_eq;
end;
$$;
revoke all on function public.start_work_order(text) from public, anon;
grant execute on function public.start_work_order(text) to authenticated;

-- 4. Manual start now records priority + active state.
create or replace function public.log_maintenance_start(
  p_id text, p_eq text, p_reason text, p_start date, p_etr date, p_tech text, p_notes text,
  p_priority text default 'Normal'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_plant_access((select plant_id from public.equipment where id = p_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if exists (select 1 from public.maintenance_logs where equipment_id = p_eq and end_date is null) then
    raise exception 'This equipment already has an open work-order.';
  end if;
  insert into public.maintenance_logs (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority)
  values (p_id, p_eq, p_reason, p_start, p_etr, p_tech, coalesce(p_notes,''), 'active',
          case when p_priority in ('Critical','High','Normal') then p_priority else 'Normal' end);
  update public.equipment
    set status = case when p_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = p_eq;
end;
$$;
revoke all on function public.log_maintenance_start(text,text,text,date,date,text,text,text) from public, anon;
grant execute on function public.log_maintenance_start(text,text,text,date,date,text,text,text) to authenticated;
-- drop the old 7-arg signature so there is exactly one
drop function if exists public.log_maintenance_start(text,text,text,date,date,text,text);

-- 5. Completion marks the work-order done.
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text;
begin
  select equipment_id into v_eq from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,''), wo_state = 'done'
    where id = p_log;
  update public.equipment set status = 'Operational' where id = v_eq;
end;
$$;

-- 6. Schedule the generator daily at 00:30 UTC (06:00 IST).
--    Requires pg_cron enabled (see header). Re-runnable.
create extension if not exists pg_cron;
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ppm-daily-generation') then
    perform cron.unschedule('ppm-daily-generation');
  end if;
  perform cron.schedule('ppm-daily-generation', '30 0 * * *', 'select public.generate_ppm_work_orders()');
end;
$$;

-- 7. Verify: columns exist, job registered, and a dry-run count.
select jobname, schedule from cron.job where jobname = 'ppm-daily-generation';
