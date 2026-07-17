-- ===================================================================
-- DigitalPaani Maintenance Ops — reset users to the Superadmin only
-- Run in Supabase → SQL Editor. Order matters; run top to bottom.
-- ===================================================================

-- 1. Remove every user except the superadmin (Mihir).
--    Deleting from auth.users cascades to public.profiles (FK on delete cascade).
delete from auth.users
where lower(email) <> 'mihir.sethi@digitalpaani.com';

-- 2. Introduce the three-tier role model: Superadmin > Admin > Engineer.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('Superadmin','Admin','Engineer'));

-- 3. Make Mihir the Superadmin (owner).
update public.profiles set role = 'Superadmin', name = 'Mihir Sethi'
where id = (select id from auth.users where email = 'mihir.sethi@digitalpaani.com');

-- 4. is_admin() must treat Superadmin as admin too (used by all data-table RLS).
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('Admin','Superadmin'));
$$;

-- 5. Superadmin-only helper (for managing admins, later).
create or replace function public.is_superadmin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'Superadmin');
$$;

-- 6. Verify — should return exactly one row: Mihir Sethi / Superadmin.
select p.name, p.role, u.email
from public.profiles p join auth.users u on u.id = p.id;
