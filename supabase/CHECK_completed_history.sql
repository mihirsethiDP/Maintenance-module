-- ===================================================================
-- What completed maintenance history is in the database? READ-ONLY.
-- Run in Supabase → SQL Editor before deciding whether a handover
-- should keep it. Each row is a job somebody recorded as done.
-- ===================================================================

select l.end_date            as completed_on,
       coalesce(l.wo_no,'—') as work_order,
       l.equipment_id,
       e.tag,
       l.reason,
       coalesce(nullif(l.technician,''),'(nobody named)') as recorded_by,
       left(coalesce(l.completion_notes,''), 60)          as notes,
       l.start_date          as started_on,
       (select count(*) from public.work_order_media m where m.log_id = l.id) as photos,
       exists (select 1 from public.service_reports r
                where r.status = 'signed'
                  and r.content->'jobs' @> jsonb_build_array(jsonb_build_object('id', l.id))) as in_a_signed_report
  from public.maintenance_logs l
  left join public.equipment e on e.id = l.equipment_id
 where l.end_date is not null
 order by l.end_date desc, l.equipment_id;
