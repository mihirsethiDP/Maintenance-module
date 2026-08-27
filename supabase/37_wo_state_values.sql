-- ===================================================================
-- DigitalPaani Maintenance Ops — allow the review states on wo_state
-- Run in Supabase → SQL Editor (after 36). Fixes a live bug.
--
-- THE BUG
-- 09 constrained wo_state to ('open','active','done'). 33 introduced
-- 'submitted' and 'returned' for the review loop but never widened that
-- constraint, so completing a work order as a technician failed with
--   violates check constraint "maintenance_logs_wo_state_check"
-- A SECURITY DEFINER function bypasses RLS; it never bypasses a CHECK.
-- ===================================================================

alter table public.maintenance_logs drop constraint if exists maintenance_logs_wo_state_check;
alter table public.maintenance_logs add constraint maintenance_logs_wo_state_check
  check (wo_state in ('open','active','submitted','returned','done'));

-- ---- Verify: the definition must list all five states ----
select pg_get_constraintdef(oid) as wo_state_constraint
from pg_constraint where conname = 'maintenance_logs_wo_state_check';
