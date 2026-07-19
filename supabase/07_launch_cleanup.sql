-- ===================================================================
-- DigitalPaani Maintenance Ops — LAUNCH CLEANUP
-- Run once, the night before launch. Supabase → SQL Editor → Run.
-- Clears every maintenance log started before today so the tool
-- launches with a clean history, and resets any equipment left
-- stuck in a non-operational state by a deleted work-order.
-- ===================================================================

-- 1. Remove all pre-launch maintenance logs.
delete from public.maintenance_logs
where start_date < current_date;

-- 2. Any equipment whose open work-order was just deleted goes back
--    to Operational (equipment with a still-open log keeps its status).
update public.equipment e
set status = 'Operational'
where e.status <> 'Operational'
  and not exists (
    select 1 from public.maintenance_logs l
    where l.equipment_id = e.id and l.end_date is null
  );

-- 3. Verify: both counts should be 0.
select
  (select count(*) from public.maintenance_logs where start_date < current_date) as old_logs_remaining,
  (select count(*) from public.equipment e
    where e.status <> 'Operational'
      and not exists (select 1 from public.maintenance_logs l
                      where l.equipment_id = e.id and l.end_date is null)) as stuck_equipment;
