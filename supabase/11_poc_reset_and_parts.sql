-- ===================================================================
-- DigitalPaani Maintenance Ops — PoC reset + parts (BOM) foundation
-- Run in Supabase → SQL Editor.
--
-- 1) Clears ALL equipment (and their work-orders / notifications) so the
--    admin flow can be tested on a handful of hand-added units.
--    Plants, users, and plant assignments are kept.
--    To restore the full 663-unit fleet later: re-run 03_seed_reference_data.sql.
-- 2) Creates the equipment_parts table (bill of materials) that both the
--    manual editor and the AI enrichment write into.
-- ===================================================================

-- ---- 1. Wipe equipment-linked data ----
delete from public.notifications;        -- references equipment
delete from public.maintenance_logs;     -- cascade would handle it, explicit is clearer
delete from public.equipment;

-- ---- 2. Parts of assembly (BOM) ----
create table if not exists public.equipment_parts (
  id           bigint generated always as identity primary key,
  equipment_id text not null references public.equipment(id) on delete cascade,
  name         text not null,
  spec         text default '',            -- e.g. "6309-2Z, 45mm bore"
  qty          integer not null default 1,
  criticality  integer not null default 5 check (criticality between 1 and 10),
  source       text default 'manual',      -- 'manual' | 'ai'
  source_url   text default '',
  created_at   timestamptz not null default now()
);
create index if not exists parts_equipment_idx on public.equipment_parts(equipment_id);

alter table public.equipment_parts enable row level security;
drop policy if exists parts_read  on public.equipment_parts;
drop policy if exists parts_write on public.equipment_parts;
create policy parts_read on public.equipment_parts for select to authenticated
  using (public.has_plant_access((select plant_id from public.equipment e where e.id = equipment_id)));
create policy parts_write on public.equipment_parts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- 3. Verify: equipment 0, logs 0, parts table ready ----
select
  (select count(*) from public.equipment)        as equipment_left,
  (select count(*) from public.maintenance_logs) as logs_left,
  (select count(*) from public.equipment_parts)  as parts_rows;
