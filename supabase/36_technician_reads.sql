-- ===================================================================
-- DigitalPaani Maintenance Ops — technicians can READ what they roam to
-- Run in Supabase → SQL Editor (after 35). Fixes a live bug.
--
-- THE BUG
-- 32 made a technician's WRITE rights derive from the assignment instead of
-- plant_assignments, so they need no plant setup. But the READ policies
-- (equipment_read and logs_read from 05, plus parts and log-parts) were
-- still gated by has_plant_access — which a technician with no assignments
-- fails for every plant. Result: an assigned work order was invisible in
-- My Work and the Equipment tab was completely empty. RLS was filtering
-- out the entire fleet.
--
-- THE FIX
-- Technicians read the fleet (they get sent anywhere, and the QR sticker on
-- a machine has to open that machine). What they can ACT on is unchanged:
-- assignment only, enforced in 32/33's policies and RPCs.
--
-- my_role() only returns a role for ACTIVE accounts, so a deactivated
-- technician loses these reads along with everything else.
-- ===================================================================

-- ---- 1. Equipment: the whole fleet, read-only ----
drop policy if exists equipment_read on public.equipment;
create policy equipment_read on public.equipment for select to authenticated
  using (public.my_role() = 'Technician' or public.has_plant_access(plant_id));

-- ---- 2. Work orders: full history, so a machine's page is complete ----
drop policy if exists logs_read on public.maintenance_logs;
create policy logs_read on public.maintenance_logs for select to authenticated
  using (
    public.my_role() = 'Technician'
    or public.has_plant_access(
      (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id)));

-- ---- 3. Parts and part history (the completion form lists parts) ----
drop policy if exists parts_read on public.equipment_parts;
create policy parts_read on public.equipment_parts for select to authenticated
  using (
    public.my_role() = 'Technician'
    or public.has_plant_access((select plant_id from public.equipment e where e.id = equipment_id)));

drop policy if exists mlp_read on public.maintenance_log_parts;
create policy mlp_read on public.maintenance_log_parts for select to authenticated
  using (
    public.my_role() = 'Technician'
    or public.has_plant_access(
      (select e.plant_id from public.maintenance_logs l
         join public.equipment e on e.id = l.equipment_id
       where l.id = maintenance_log_parts.log_id)));

-- ---- 4. Verify: sign in as Devid afterwards, or check the policy text ----
select tablename, policyname,
       (qual like '%my_role%')::int as covers_technician
from pg_policies
where tablename in ('equipment','maintenance_logs','equipment_parts','maintenance_log_parts')
  and cmd = 'SELECT'
order by tablename;
