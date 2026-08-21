-- ===================================================================
-- DigitalPaani Maintenance Ops — per-user interface mode
-- Run in Supabase → SQL Editor (after 20).
--
-- 'simple' (default): the record-keeping tool — no health scores, no
-- parts, no Review queue, no AI research. All the visual and friction
-- improvements stay. 'full': everything.
--
-- One deployment serves both: Amit works in simple mode while the full
-- tool keeps living in the Superadmin's login (and keeps evolving).
-- Data recorded in simple mode feeds the smart features whenever a
-- user is switched to full — nothing forks, nothing is lost.
--
-- Only the Superadmin can change who sees which mode (Team → Edit).
-- ===================================================================

alter table public.profiles add column if not exists ui_mode text not null default 'simple'
  check (ui_mode in ('simple', 'full'));

-- Guard: only the Superadmin may change interface modes.
create or replace function public.guard_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service context (SQL editor, service role): auth.uid() is NULL and RLS
  -- is already bypassed there by design -- the guard is for client requests.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
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
  if new.ui_mode is distinct from old.ui_mode and not public.is_superadmin() then
    raise exception 'Only the Superadmin can change interface modes.';
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

-- The Superadmin keeps the full tool (runs AFTER the guard above learned to
-- stand aside for the SQL editor's service context).
update public.profiles set ui_mode = 'full' where role = 'Superadmin';

-- ---- Verify ----
select name, role, ui_mode, coalesce(status, 'active') as status
from public.profiles order by role, name;
