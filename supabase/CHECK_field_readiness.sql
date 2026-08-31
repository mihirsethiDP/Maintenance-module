-- ===================================================================
-- Field readiness check — run in Supabase → SQL Editor. READ-ONLY.
-- One query, one result set (the editor shows only the last statement).
-- Re-runnable any day: it answers "is tomorrow set up, and is anything
-- stuck?" for every technician, not just the first week.
-- ===================================================================

with me as (
  select id, email, name, role, status from public.profiles
  where role = 'Technician' and coalesce(status,'active') = 'active'
)
select 1 as ord, 'technician account' as area,
       m.email || ' | ' || m.name || ' | ' || m.role || ' | ' || m.status
       || ' | field-name history linked: ' ||
       case when exists (select 1 from public.technicians t where t.user_id = m.id)
            then 'yes' else 'NO — invite/registry link missing' end as detail
from me m

union all

-- What their My Work shows: today's work first, then the days ahead.
select 2, 'work assigned',
       m.name || ' | ' || coalesce(l.wo_no, l.id) || ' | ' || l.equipment_id
       || ' | ' || l.wo_state
       || case when l.start_date > (now() at time zone 'Asia/Kolkata')::date
               then ' | starts ' || l.start_date::text
               else ' | due now (' || l.start_date::text || ')' end
       || case when l.hold_until is not null then ' | on hold until ' || l.hold_until::text else '' end
       || case when l.photos_required then ' | photos required' else '' end
from public.maintenance_logs l
join me m on m.id = l.assigned_to
where l.wo_state in ('open','active','returned')

union all

-- Nobody assigned yet: work sitting unclaimed at any plant.
select 3, 'unassigned work waiting',
       coalesce(l.wo_no, l.id) || ' | ' || l.equipment_id || ' | starts ' || l.start_date::text
from public.maintenance_logs l
where l.wo_state = 'open' and l.assigned_to is null

union all

-- Anything stuck on a person, oldest first when you read the output.
select 4, 'waiting on the engineer', coalesce(l.wo_no, l.id) || ' | ' || l.equipment_id
       || ' | completed ' || l.end_date::text
from public.maintenance_logs l where l.wo_state = 'submitted'

union all

select 5, 'sent back to the technician', coalesce(l.wo_no, l.id) || ' | ' || l.equipment_id
from public.maintenance_logs l where l.wo_state = 'returned'

union all

select 6, 'report not yet client-signed', r.id || ' | ' || plant_id || ' | ' || r.visit_date::text
       || ' | ' || r.status
from public.service_reports r where r.status <> 'signed'

union all

select 7, 'problem reported, no decision yet', i.id::text || ' | ' || left(i.description, 50)
from public.wo_issues i where i.status = 'open'

union all

-- Free-tier headroom + leftover files the Oversight "Clean up" button removes.
select 8, 'photo storage',
       round(u.total_bytes / 1048576.0, 1)::text || ' MB of 1024 MB | '
       || u.object_count::text || ' files | ' || u.orphan_count::text || ' leftover'
from public.wo_storage_usage() u

order by ord, detail;
