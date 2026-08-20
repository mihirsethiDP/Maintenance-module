-- ===================================================================
-- DigitalPaani Maintenance Ops — DELIVERY RESET
-- Run in Supabase → SQL Editor (after 17... there is no 17; after 16).
--
-- Wipes every plant, equipment, work-order, part, queue row,
-- notification, assignment and technician — a clean tool ready to
-- hand over. KEEPS: user accounts/roles (profiles), PPM checklists,
-- and per-type expected-life reference data.
--
-- THIS CANNOT BE UNDONE. Equipment can be re-imported from the PPM
-- spreadsheets afterwards.
-- ===================================================================

-- Order respects foreign keys.
delete from public.maintenance_log_parts;
delete from public.enrichment_queue;
delete from public.notifications;
delete from public.maintenance_logs;
delete from public.equipment_parts;
delete from public.equipment;
delete from public.plant_assignments;
delete from public.plants;
delete from public.technicians;

-- ---- Verify: everything below should be 0 ----
select
  (select count(*) from public.plants)               as plants,
  (select count(*) from public.equipment)            as equipment,
  (select count(*) from public.maintenance_logs)     as logs,
  (select count(*) from public.equipment_parts)      as parts,
  (select count(*) from public.enrichment_queue)     as queue,
  (select count(*) from public.notifications)        as notifications,
  (select count(*) from public.plant_assignments)    as assignments,
  (select count(*) from public.technicians)          as technicians,
  -- and these should be KEPT (non-zero):
  (select count(*) from public.profiles)             as profiles_kept,
  (select count(*) from public.checklist_templates)  as checklists_kept,
  (select count(*) from public.type_config)          as type_config_kept;
