-- ===================================================================
-- DigitalPaani Maintenance Ops — remove leftover test equipment
-- Run in Supabase → SQL Editor (after 23).
--
-- Keeps ONLY the fleet restored from All_Sites_PPM_Schedule.xlsx, whose
-- ids all look like 'PL-07-E012'. Anything else was created by hand
-- while testing (ids like 'EQ-271710' or 'EQ-IMP-...') and goes.
--
-- Deleting an equipment row cascades to everything hanging off it:
-- its work-orders, part rows, research-queue rows and notifications.
-- THIS CANNOT BE UNDONE.
-- ===================================================================

-- ---- 0. PREVIEW FIRST (recommended) -------------------------------
-- Run just this block on its own and eyeball the list before deleting:
--
--   select id, tag, plant_id, status
--   from public.equipment
--   where id not like 'PL-__-E%'
--   order by plant_id, id;
--
--   select p.id, p.name, count(e.id) as equipment
--   from public.plants p left join public.equipment e on e.plant_id = p.id
--   where p.id not between 'PL-01' and 'PL-22'
--   group by p.id, p.name order by p.id;
-- -------------------------------------------------------------------

-- ---- 1. Hand-made test equipment (cascades to its logs/parts/queue) ----
delete from public.equipment
where id not like 'PL-__-E%';

-- ---- 2. Test plants left behind (the 22 real sites are PL-01..PL-22) ----
delete from public.plants
where id not in (
  'PL-01','PL-02','PL-03','PL-04','PL-05','PL-06','PL-07','PL-08','PL-09','PL-10','PL-11',
  'PL-12','PL-13','PL-14','PL-15','PL-16','PL-17','PL-18','PL-19','PL-20','PL-21','PL-22'
);

-- ---- 3. Verify: the real fleet, and nothing else ----
select
  (select count(*) from public.plants)                                  as plants,          -- expect 22
  (select count(*) from public.equipment)                               as equipment,       -- expect 663
  (select count(*) from public.equipment where id not like 'PL-__-E%')  as strays,          -- expect 0
  (select count(*) from public.maintenance_logs)                        as history,         -- expect 0
  (select count(*) from public.equipment_parts)                         as parts,           -- expect 0
  (select count(*) from public.enrichment_queue)                        as research_queue;  -- expect 0
