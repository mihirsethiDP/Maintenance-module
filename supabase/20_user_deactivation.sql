-- ===================================================================
-- DigitalPaani Maintenance Ops — user deactivation, enforced in the DB
-- Run in Supabase → SQL Editor (after 19).
--
-- The Team page gains Deactivate / Reactivate buttons. Deactivation is
-- reversible and keeps every record the person ever touched. This
-- migration makes it REAL: a deactivated account loses all data access
-- at the database level (not just the UI) — every permission helper
-- now requires status = 'active'.
--
-- Rules: admins may deactivate engineers; only the Superadmin may
-- deactivate an Admin; nobody can deactivate themselves or the
-- Superadmin.
-- ===================================================================

-- ---- 1. Permission helpers require an ACTIVE account ----
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and role in ('Admin','Superadmin')
      and coalesce(status, 'active') = 'active');
$$;

create or replace function public.is_superadmin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and role = 'Superadmin'
      and coalesce(status, 'active') = 'active');
$$;

create or replace function public.has_plant_access(p text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.plant_assignments pa
    join public.profiles pr on pr.id = pa.user_id
    where pa.user_id = auth.uid() and pa.plant_id = p
      and coalesce(pr.status, 'active') = 'active'
  );
$$;

-- ---- 2. Guard trigger: who may flip status ----
create or replace function public.guard_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'Superadmin' then
      raise exception 'The Superadmin profile cannot be deleted.';
    end if;
    return old;
  end if;
  -- UPDATE:
  if new.role is distinct from old.role and not public.is_superadmin() then
    raise exception 'Only the Superadmin can change roles.';
  end if;
  if old.role = 'Superadmin' and auth.uid() is distinct from old.id then
    raise exception 'Only the Superadmin can modify their own profile.';
  end if;
  if new.status is distinct from old.status then
    if old.id = auth.uid() then
      raise exception 'You cannot change your own account status.';
    end if;
    if old.role = 'Superadmin' then
      raise exception 'The Superadmin cannot be deactivated.';
    end if;
    if old.role = 'Admin' and not public.is_superadmin() then
      raise exception 'Only the Superadmin can deactivate an Admin.';
    end if;
    if not public.is_admin() then
      raise exception 'Only admins can change account status.';
    end if;
  end if;
  return new;
end;
$$;

-- ---- 3. Verify ----
select p.name, p.role, coalesce(p.status, 'active') as status
from public.profiles p order by p.role, p.name;
