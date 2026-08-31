-- ===================================================================
-- DigitalPaani Maintenance Ops — clear the build-period records
-- Run in Supabase → SQL Editor, AFTER RESET_for_delivery.sql, and ONLY
-- because CHECK_completed_history.sql showed that every completed record
-- is testing: a machine literally tagged "Testing 123 321", notes
-- reading "ertyuiofcghjk" and "Pls report back", same-day start/finish
-- pairs from the own-work checks.
--
-- WHY THIS IS A SEPARATE SCRIPT: two of those completions sit inside
-- CLIENT-SIGNED service reports. A signed report is immutable by design
-- and the app can never delete one — deleting the jobs alone would leave
-- signed documents pointing at records that no longer exist. So this
-- script removes the test reports FIRST, in the same transaction.
--
-- Deleting a client-signed report is legitimate here and nowhere else:
-- these two were signed by us during testing, not by a client. Never run
-- this once real client signatures exist.
--
-- WHAT THIS DELETES
--   * the test service reports (signed ones included) and their
--     signature images become leftovers for Oversight → Clean up
--   * every completed work order (all 7 are build-period)
--   * the work-order counter, so the first real job is WO-2026-0001
--   * the activity feed rows recording those test events
--   * the test machine EQ-922178 "Testing 123 321" and everything
--     attached to it (cascade)
--
-- WHAT STAYS: plants, real equipment, the PPM schedule, checklists,
-- people, the technician registry.
-- ===================================================================

begin;

-- 1. Test reports (signed ones too — service context bypasses the lock).
delete from public.service_reports;

-- 2. Every completed work order from the build period.
delete from public.maintenance_logs where end_date is not null;

-- 3. Any problem report left attached to nothing.
delete from public.wo_issues;

-- 4. Numbering starts at WO-2026-0001 for the client's first real job.
delete from public.wo_counters;

-- 5. The activity feed recorded test events only.
delete from public.notifications;

-- 6. The machine that only ever existed to be tested on.
delete from public.equipment where id = 'EQ-922178';

commit;

-- ---- Verify: the first five must be 0, and the fleet must be intact ----
select 'service reports left' as what, count(*)::text as result from public.service_reports
union all
select 'completed work orders left', count(*)::text from public.maintenance_logs where end_date is not null
union all
select 'work orders of any kind left', count(*)::text from public.maintenance_logs
union all
select 'problem reports left', count(*)::text from public.wo_issues
union all
select 'activity rows left', count(*)::text from public.notifications
union all
select 'test machine left', count(*)::text from public.equipment where id = 'EQ-922178'
union all
select 'equipment kept', count(*)::text from public.equipment
union all
select 'PPM schedule rows kept', count(*)::text from public.equipment where slot is not null
union all
select 'plants kept', count(*)::text from public.plants
union all
select 'people kept', count(*)::text from public.profiles
union all
select 'next work-order number', 'WO-' || extract(year from (now() at time zone 'Asia/Kolkata'))::text || '-0001';
