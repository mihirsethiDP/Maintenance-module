-- ===================================================================
-- DigitalPaani Maintenance Ops — reset to a clean handover state
-- Run in Supabase → SQL Editor. ONE TIME, before handing the tool over.
--
-- WHAT THIS DELETES (and nothing else):
--   * every work order not yet finished — open / in progress / awaiting
--     review / sent back. These are almost all L-AUTO-* jobs the PPM
--     scheduler created during the build; nobody did them, so closing
--     them as "done" would fabricate maintenance history. They are
--     removed instead. Photo rows attached to them go with them
--     (cascade); the image files become leftovers that the Oversight
--     "Clean up" button sweeps.
--   * every problem report still awaiting a decision.
--   * every service report not yet client-signed (there are none today —
--     the statement is here so a re-run stays honest).
--
-- WHAT STAYS, deliberately:
--   * the PPM schedule (every machine's slot) — untouched.
--   * plants, equipment, checklists, people, technician registry.
--   * completed maintenance history and any client-signed report:
--     those are records of work that really happened.
--
-- Everything runs in one transaction and verifies itself at the end.
-- ===================================================================

begin;

-- 1. Unfinished work orders. (assigned or not, any of the four live states)
delete from public.maintenance_logs
 where end_date is null
    or coalesce(wo_state,'') in ('open','active','submitted','returned');

-- 2. Reports that never reached a client signature.
delete from public.service_reports where status <> 'signed';

-- 3. Problem reports with no decision yet.
delete from public.wo_issues where status = 'open';

-- 4. No machine may be left flagged by a job that no longer exists.
update public.equipment e
   set status = 'Operational'
 where coalesce(e.status,'') in ('In Maintenance','Broken Down')
   and not exists (select 1 from public.maintenance_logs l
                    where l.equipment_id = e.id and l.end_date is null);

-- 5. Work-order numbers start at 0001 for the client's first real job —
--    but only if no surviving record already carries a number.
do $$
begin
  if not exists (select 1 from public.maintenance_logs where wo_no is not null) then
    delete from public.wo_counters;
  end if;
end $$;

commit;

-- ---- Verify: every count must be 0 (and the PPM schedule intact) ----
select 'unfinished work orders' as what, count(*)::text as result
  from public.maintenance_logs
 where end_date is null or coalesce(wo_state,'') in ('open','active','submitted','returned')
union all
select 'unsigned reports', count(*)::text from public.service_reports where status <> 'signed'
union all
select 'undecided problem reports', count(*)::text from public.wo_issues where status = 'open'
union all
select 'machines not operational (excl. retired)', count(*)::text
  from public.equipment where coalesce(status,'') not in ('Operational','Retired')
union all
select 'PPM schedule rows kept', count(*)::text from public.equipment where slot is not null
union all
select 'completed history kept', count(*)::text from public.maintenance_logs where end_date is not null
union all
select 'next work-order number', 'WO-' || extract(year from (now() at time zone 'Asia/Kolkata'))::text
  || '-' || lpad((coalesce((select last_no from public.wo_counters
                            where year = extract(year from (now() at time zone 'Asia/Kolkata'))::int), 0) + 1)::text, 4, '0');

-- ===================================================================
-- IF THE COMPLETED HISTORY IS ALSO BUILD-PERIOD TESTING
-- Do not delete it from here. Two of those completions sit inside
-- client-signed reports, and removing the jobs alone would leave signed
-- documents pointing at nothing. Inspect with
-- CHECK_completed_history.sql, then run RESET_build_records.sql, which
-- clears the reports, the jobs, the counter, the activity feed and the
-- test machine in one transaction.
-- ===================================================================
