-- ===================================================================
-- Monday readiness check — run in Supabase → SQL Editor. READ-ONLY.
-- One query, one result set (the editor only shows the last statement,
-- so everything is folded into a single output).
-- ===================================================================

select 1 as ord, 'account' as area,
       p.email || ' | role=' || p.role || ' | status=' || p.status
       || ' | registry links=' || (select count(*) from public.technicians t where t.user_id = p.id)::text
       as detail
from public.profiles p
where p.email ilike 'devid%'

union all

-- What My Work shows him Monday. Anything here that is not a real job
-- for next week should be closed or deleted before Monday.
select 2, 'his Monday list',
       coalesce(l.wo_no, l.id) || ' | ' || l.equipment_id || ' | ' || l.wo_state
       || ' | starts ' || l.start_date::text
       || case when l.hold_until is not null then ' | on hold until ' || l.hold_until::text else '' end
       || case when l.photos_required then ' | photos required' else '' end
from public.maintenance_logs l
join public.profiles p on p.id = l.assigned_to
where p.email ilike 'devid%' and l.wo_state in ('open', 'active', 'returned')

union all

-- Leftovers from live click-testing, anywhere in the system.
select 3, 'work awaiting review', coalesce(l.wo_no, l.id) || ' | ' || l.equipment_id
from public.maintenance_logs l where l.wo_state = 'submitted'

union all

select 4, 'report not yet client-signed', r.id || ' | ' || r.status
from public.service_reports r where r.status <> 'signed'

union all

select 5, 'issue with no decision yet', i.id::text || ' | ' || left(i.description, 60)
from public.wo_issues i where i.status = 'open'

order by ord, detail;
