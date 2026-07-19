-- ===================================================================
-- DigitalPaani Maintenance Ops — LAUNCH HARDENING (run before launch)
-- Fixes from pre-launch security QA. Supabase → SQL Editor → Run.
-- ===================================================================

-- -------------------------------------------------------------------
-- 1. maintenance_logs: writes were open to ANY authenticated user on
--    ANY plant. Scope INSERT/UPDATE to plants the caller can access.
-- -------------------------------------------------------------------
drop policy if exists logs_write  on public.maintenance_logs;
create policy logs_write on public.maintenance_logs for insert to authenticated
  with check (public.has_plant_access(
    (select e.plant_id from public.equipment e where e.id = equipment_id)));

drop policy if exists logs_update on public.maintenance_logs;
create policy logs_update on public.maintenance_logs for update to authenticated
  using (public.has_plant_access(
    (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id)))
  with check (public.has_plant_access(
    (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id)));

-- -------------------------------------------------------------------
-- 2. Privilege escalation (a): the signup trigger trusted client
--    metadata for role. Force Engineer; the invite Edge Function
--    (service role) sets the real role after creating the user.
-- -------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    'Engineer',                     -- never trust client-supplied role
    new.raw_user_meta_data->>'phone',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- -------------------------------------------------------------------
-- 3. Privilege escalation (b): an Admin could change roles (incl. its
--    own) or delete the Superadmin via PostgREST. Enforce with a
--    trigger: only a Superadmin may change roles, and the Superadmin
--    row is untouchable by anyone else.
-- -------------------------------------------------------------------
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
  return new;
end;
$$;

drop trigger if exists guard_profiles_update on public.profiles;
create trigger guard_profiles_update
  before update on public.profiles
  for each row execute function public.guard_profiles();

drop trigger if exists guard_profiles_delete on public.profiles;
create trigger guard_profiles_delete
  before delete on public.profiles
  for each row execute function public.guard_profiles();

-- -------------------------------------------------------------------
-- 4. Atomic maintenance flows + duplicate-open-work-order prevention.
--    (Previously the log insert and status update were two calls; one
--    could fail leaving inconsistent state.)
-- -------------------------------------------------------------------
create unique index if not exists one_open_log_per_equipment
  on public.maintenance_logs (equipment_id) where end_date is null;

create or replace function public.log_maintenance_start(
  p_id text, p_eq text, p_reason text, p_start date, p_etr date, p_tech text, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_plant_access((select plant_id from public.equipment where id = p_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if exists (select 1 from public.maintenance_logs where equipment_id = p_eq and end_date is null) then
    raise exception 'This equipment already has an open work-order.';
  end if;
  insert into public.maintenance_logs (id, equipment_id, reason, start_date, etr, technician, notes)
  values (p_id, p_eq, p_reason, p_start, p_etr, p_tech, coalesce(p_notes,''));
  update public.equipment
    set status = case when p_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = p_eq;
end;
$$;

create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text;
begin
  select equipment_id into v_eq from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,'')
    where id = p_log;
  update public.equipment set status = 'Operational' where id = v_eq;
end;
$$;

revoke all on function public.log_maintenance_start(text,text,text,date,date,text,text) from public;
grant execute on function public.log_maintenance_start(text,text,text,date,date,text,text) to authenticated;
revoke all on function public.log_maintenance_complete(text,date,text) from public;
grant execute on function public.log_maintenance_complete(text,date,text) to authenticated;

-- -------------------------------------------------------------------
-- 5. Verify
-- -------------------------------------------------------------------
select policyname, cmd from pg_policies where tablename = 'maintenance_logs' order by policyname;
