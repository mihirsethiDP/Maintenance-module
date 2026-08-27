-- ===================================================================
-- DigitalPaani Maintenance Ops — Phase 1: the Technician tier
-- Run in Supabase → SQL Editor (after 30). Then redeploy invite-user.
--
-- WHAT THIS ADDS
--   * 'Technician' becomes a real role: logs in, sees My Work, completes
--     the work orders assigned to them. Cannot create work orders, cannot
--     touch equipment records.
--   * Work orders gain assigned_to/assigned_by — assignment to an account,
--     not just a name typed in a box. Free-text names still work.
--   * Service engineers may now ADD and EDIT equipment at their own plants
--     (delete stays admin-only).
--   * The technician registry can link a name to a login, so a person's
--     job history follows them into their account.
-- ===================================================================

-- ---- 1. The role itself ----
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('Superadmin','Admin','Engineer','Technician'));

-- Role of the calling user, for policies that treat tiers differently.
create or replace function public.my_role()
returns text language sql security definer stable set search_path = public as $$
  select role from public.profiles
  where id = auth.uid() and coalesce(status,'active') = 'active';
$$;
revoke all on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated, service_role;

-- ---- 2. Assignment lives on the work order ----
alter table public.maintenance_logs add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.maintenance_logs add column if not exists assigned_by uuid references auth.users(id) on delete set null;
create index if not exists logs_assigned_open_idx
  on public.maintenance_logs (assigned_to) where end_date is null;

-- Registry name ↔ login, so history and suggestions follow the person.
alter table public.technicians add column if not exists user_id uuid unique references auth.users(id) on delete set null;

-- ---- 3. Equipment: engineers gain add/edit at their plants ----
-- Old shape: one FOR ALL admin-only policy. New shape: insert/update open to
-- admins everywhere and to engineers at plants they hold; technicians get
-- nothing; delete stays admin-only.
drop policy if exists equipment_admin_write on public.equipment;
drop policy if exists equipment_insert on public.equipment;
drop policy if exists equipment_update on public.equipment;
drop policy if exists equipment_delete on public.equipment;

create policy equipment_insert on public.equipment for insert to authenticated
  with check (
    public.is_admin()
    or (public.my_role() = 'Engineer' and public.has_plant_access(plant_id))
  );
create policy equipment_update on public.equipment for update to authenticated
  using (
    public.is_admin()
    or (public.my_role() = 'Engineer' and public.has_plant_access(plant_id))
  )
  with check (
    public.is_admin()
    or (public.my_role() = 'Engineer' and public.has_plant_access(plant_id))
  );
create policy equipment_delete on public.equipment for delete to authenticated
  using (public.is_admin());

-- ---- 4. Work orders: technicians complete, never create ----
-- Direct inserts: engineers/admins at their plants only.
drop policy if exists logs_write on public.maintenance_logs;
create policy logs_write on public.maintenance_logs for insert to authenticated
  with check (
    coalesce(public.my_role(),'') <> 'Technician'
    and public.has_plant_access(
      (select e.plant_id from public.equipment e where e.id = equipment_id)));

-- Updates: a technician may only touch work orders assigned to them.
drop policy if exists logs_update on public.maintenance_logs;
create policy logs_update on public.maintenance_logs for update to authenticated
  using (
    public.has_plant_access(
      (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id))
    and (coalesce(public.my_role(),'') <> 'Technician' or assigned_to = auth.uid()))
  with check (
    public.has_plant_access(
      (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id))
    and (coalesce(public.my_role(),'') <> 'Technician' or assigned_to = auth.uid()));

-- ---- 5. Starting a work order records the assignment ----
create or replace function public.log_maintenance_start(
  p_id text, p_eq text, p_reason text, p_start date, p_etr date, p_tech text, p_notes text,
  p_priority text default 'Normal', p_part_id bigint default null, p_severity text default null,
  p_assigned uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_plant_access((select plant_id from public.equipment where id = p_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if coalesce(public.my_role(),'') = 'Technician' then
    raise exception 'Technicians complete work orders; engineers create them.';
  end if;
  if p_assigned is not null and not exists (
    select 1 from public.profiles
    where id = p_assigned and coalesce(status,'active') = 'active') then
    raise exception 'The assigned person''s account is not active.';
  end if;
  if exists (select 1 from public.maintenance_logs where equipment_id = p_eq and end_date is null) then
    raise exception 'This equipment already has an open work-order.';
  end if;
  insert into public.maintenance_logs
    (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority,
     affected_part_id, severity, assigned_to, assigned_by)
  values (p_id, p_eq, p_reason, p_start, p_etr, p_tech, coalesce(p_notes,''), 'active',
          case when p_priority in ('Critical','High','Normal') then p_priority else 'Normal' end,
          p_part_id,
          case when p_severity in ('Minor','Major','Critical') then p_severity else null end,
          p_assigned, case when p_assigned is not null then auth.uid() end);
  update public.equipment
    set status = case when p_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = p_eq;
end;
$$;
drop function if exists public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text);
revoke all on function public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text,uuid) from public, anon;
grant execute on function public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text,uuid) to authenticated;

-- ---- 6. Completing: technicians may only close their own assignments ----
-- (Everything else in the function is unchanged from 13.)
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null,
  p_part_actions jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_assigned uuid; pa jsonb;
begin
  select equipment_id, assigned_to into v_eq, v_assigned
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if coalesce(public.my_role(),'') = 'Technician' and v_assigned is distinct from auth.uid() then
    raise exception 'This work-order is not assigned to you.';
  end if;

  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,''), wo_state = 'done',
        checklist = p_checklist
    where id = p_log;

  if p_part_actions is not null then
    for pa in select * from jsonb_array_elements(p_part_actions) loop
      if (pa->>'action') not in ('serviced','replaced') then continue; end if;
      insert into public.maintenance_log_parts (log_id, part_id, part_name, action)
      values (p_log, nullif(pa->>'part_id','')::bigint, coalesce(pa->>'name','part'), pa->>'action')
      on conflict (log_id, part_name) do update set action = excluded.action;
      if (pa->>'part_id') is not null and (pa->>'part_id') <> '' then
        update public.equipment_parts
          set last_serviced = greatest(coalesce(last_serviced, p_end), p_end),
              last_replaced = case when (pa->>'action') = 'replaced'
                                   then greatest(coalesce(last_replaced, p_end), p_end)
                                   else last_replaced end
          where id = (pa->>'part_id')::bigint;
      end if;
    end loop;
  end if;

  update public.equipment set status = 'Operational' where id = v_eq;
end;
$$;

-- ---- 7. Verify ----
select 'role constraint' as what,
       (select count(*) from information_schema.check_constraints
        where constraint_name = 'profiles_role_check') as ok;
select policyname, cmd from pg_policies where tablename = 'equipment' order by policyname;
select column_name from information_schema.columns
 where table_name = 'maintenance_logs' and column_name in ('assigned_to','assigned_by');

-- ===================================================================
-- OPTIONAL — run ONLY after telling Devid his login is changing.
-- Flips his account to Technician and links his registry history.
-- His visible tabs change to My Work + Equipment the moment this runs.
-- ===================================================================
-- update public.profiles set role = 'Technician'
--   where email = 'devid.rajput@digitalpaani.com';
-- update public.technicians
--   set user_id = (select id from public.profiles where email = 'devid.rajput@digitalpaani.com')
--   where user_id is null and lower(name) like 'devid%';
-- -- He needs plant assignments to see anything (Team → Assign plants), and
-- -- his engineer schedule PDFs stop being relevant — My Work replaces them.
