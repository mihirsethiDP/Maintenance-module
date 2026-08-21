-- ===================================================================
-- DigitalPaani Maintenance Ops — delete a duplicate/retired account
-- Run in Supabase → SQL Editor.
--
-- Use when the same person has TWO rows on the Team page (an invite sent
-- twice before the first was accepted creates a second auth user while
-- the first is still unconfirmed). Keeps the ACTIVE row, deletes the
-- DEACTIVATED one.
--
-- Maintenance history is NOT affected: work-orders store the technician
-- as plain text, not a link to the account. Deleting the account only
-- removes the login, its profile row and its plant assignments.
--
-- THIS CANNOT BE UNDONE.
-- ===================================================================

-- ---- 1. PREVIEW — run this block alone and read it before deleting ----
select
  p.id,
  p.name,
  p.email,
  p.role,
  coalesce(p.status, 'active')                                              as status,
  p.ui_mode,
  (select count(*) from public.plant_assignments pa where pa.user_id = p.id) as assigned_plants,
  u.last_sign_in_at,
  u.created_at
from public.profiles p
join auth.users u on u.id = p.id
where p.email ilike 'swadesh.bharati@digitalpaani.com'      -- <= the duplicated email
order by status, u.created_at;

-- Expect two rows: one 'active' (keep, has the plant assignments) and one
-- 'disabled' (delete). If the row you want gone is NOT the disabled one,
-- stop and fix the statuses on the Team page first.


-- ---- 2. DELETE the deactivated duplicate --------------------------------
-- Cascades: profiles row, plant_assignments, auth sessions/identities.
-- technicians.created_by is set to null; nothing else references the user.
delete from auth.users
where id in (
  select p.id from public.profiles p
  where p.email ilike 'swadesh.bharati@digitalpaani.com'    -- <= same email
    and coalesce(p.status, 'active') = 'disabled'
);


-- ---- 3. Verify: one row left, active, with its plants ----
select
  p.id, p.name, p.email, p.role, coalesce(p.status, 'active') as status,
  (select count(*) from public.plant_assignments pa where pa.user_id = p.id) as assigned_plants
from public.profiles p
where p.email ilike 'swadesh.bharati@digitalpaani.com';
