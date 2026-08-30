-- ===================================================================
-- One-time cleanup before Devid's first field week: removes the three
-- records left over from live click-testing, and nothing else.
-- Targeted by exact id. Run in Supabase → SQL Editor.
--
--   L-1787824767113  the test work order on PL-01-E001 (photo rows
--                    cascade; the photo files in storage become
--                    orphans and the Oversight "Clean up" button
--                    removes them after the 24-hour guard)
--   SR-45328580      the test service report (eng_signed, not client-
--                    signed, so the lock does not apply)
--   issue 1          "Bearing not OK"
--
-- The equipment PL-01-E001 itself is left alone — if it was only ever
-- a test machine, delete it in the app afterwards.
-- ===================================================================

begin;

delete from public.service_reports where id = 'SR-45328580';
delete from public.wo_issues       where id = 1 and description = 'Bearing not OK';
delete from public.maintenance_logs where id = 'L-1787824767113';

-- If the test job was the only thing keeping PL-01-E001 out of
-- service, put it back to Operational.
update public.equipment e
   set status = 'Operational'
 where e.id = 'PL-01-E001'
   and e.status <> 'Operational'
   and not exists (select 1 from public.maintenance_logs l
                    where l.equipment_id = e.id
                      and l.wo_state in ('open', 'active', 'submitted', 'returned'));

commit;

-- Verify: every count must be 0, and the equipment row shows its state.
select 'test job left' as what, count(*)::text as result
  from public.maintenance_logs where id = 'L-1787824767113'
union all
select 'test report left', count(*)::text
  from public.service_reports where id = 'SR-45328580'
union all
select 'test issue left', count(*)::text
  from public.wo_issues where id = 1
union all
select 'PL-01-E001 status', coalesce(min(status), '(deleted)')
  from public.equipment where id = 'PL-01-E001';
