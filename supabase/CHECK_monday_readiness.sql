-- ===================================================================
-- Monday readiness check — run in Supabase → SQL Editor. READ-ONLY.
-- Answers: what will Devid actually see when he opens My Work,
-- and is any leftover from our live testing still lying around?
-- ===================================================================

-- 1. Devid's account: must be Technician, active, and linked to his
--    field-name history.
select p.email, p.role, p.status, p.name,
       (select count(*) from public.technicians t where t.user_id = p.id) as registry_links
from public.profiles p
where p.email ilike 'devid%';

-- 2. What My Work will show him Monday: every open/active/returned job
--    assigned to him, oldest first. Anything here that is NOT a real
--    job for next week should be closed or deleted before Monday.
select l.id, l.wo_no, l.equipment_id, l.wo_state, l.start_date, l.etr,
       l.reason, l.hold_until, l.photos_required
from public.maintenance_logs l
join public.profiles p on p.id = l.assigned_to
where p.email ilike 'devid%'
  and l.wo_state in ('open', 'active', 'returned')
order by l.start_date;

-- 3. Leftovers from our live click-testing: completed-but-unreviewed
--    work, unsigned reports, and open issues anywhere in the system.
--    Each row is a decision: finish it, or clean it up before Monday.
select 'work awaiting review' as what, l.id::text as record, coalesce(l.wo_no, '') as detail
from public.maintenance_logs l where l.wo_state = 'submitted'
union all
select 'report not yet client-signed', r.id, r.status
from public.service_reports r where r.status <> 'signed'
union all
select 'issue with no decision yet', i.id::text, left(i.description, 60)
from public.wo_issues i where i.status = 'open';

-- 4. Photo storage going into the week: orphans should be zero.
select * from public.wo_storage_usage();
