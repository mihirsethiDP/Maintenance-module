-- ===================================================================
-- DigitalPaani Maintenance Ops — no deactivation while work is orphaned
-- Run in Supabase → SQL Editor (after 43).
--
-- Deactivating a technician who still has OPEN assigned work orders left
-- those jobs assigned to a ghost: in nobody's My Work, and blamed on
-- someone who cannot even sign in. The app now forces a handover first
-- (reassign to another technician, or explicitly unassign for the
-- engineers) — and this trigger makes the database refuse the shortcut,
-- so no other client, script, or future bug can recreate the orphan.
--
-- Jobs already submitted or returned do NOT block: engineers hold
-- Approve and Close as-is for those. The SQL editor (service context,
-- auth.uid() is null) also bypasses, as with every guard here, so an
-- emergency fix by hand stays possible.
-- ===================================================================

create or replace function public.guard_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_open int;
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
  if new.email is distinct from old.email and not public.is_superadmin() then
    raise exception 'The email shown on Team cannot be edited here.';
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
    -- NEW: open assigned work must be handed over before deactivation.
    if coalesce(new.status,'active') <> 'active' then
      select count(*) into v_open from public.maintenance_logs
        where assigned_to = old.id and end_date is null;
      if v_open > 0 then
        raise exception 'They still have % open job(s) assigned. Hand those over (or unassign them) first.', v_open;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---- Verify: the guard mentions the handover rule ----
select prosrc like '%open job(s) assigned%' as has_handover_guard
from pg_proc where proname = 'guard_profiles';
