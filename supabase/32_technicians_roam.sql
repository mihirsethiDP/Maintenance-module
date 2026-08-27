-- ===================================================================
-- DigitalPaani Maintenance Ops — technicians roam
-- Run in Supabase → SQL Editor (after 31).
--
-- Technicians are not tied to plants: they get sent wherever the work
-- order takes them. So their access derives from the ASSIGNMENT, not
-- from plant_assignments — no plant setup needed on a technician
-- account, ever. Without this, a technician could SEE a job at an
-- unassigned plant in My Work but the database would refuse to let
-- them close it (has_plant_access said no).
-- ===================================================================

-- ---- 1. Updating a work order: a technician's right comes from being
--         the assignee, nothing else. Engineers/admins unchanged. ----
drop policy if exists logs_update on public.maintenance_logs;
create policy logs_update on public.maintenance_logs for update to authenticated
  using (
    (coalesce(public.my_role(),'') not in ('Technician')
      and public.has_plant_access(
        (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id)))
    or (public.my_role() = 'Technician' and assigned_to = auth.uid())
  )
  with check (
    (coalesce(public.my_role(),'') not in ('Technician')
      and public.has_plant_access(
        (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id)))
    or (public.my_role() = 'Technician' and assigned_to = auth.uid())
  );
-- (my_role() only returns a role for ACTIVE accounts, so a deactivated
--  technician fails both branches — no separate is_active check needed.)

-- ---- 2. Completing: same rule inside the RPC ----
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null,
  p_part_actions jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_assigned uuid; pa jsonb;
begin
  select equipment_id, assigned_to into v_eq, v_assigned
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if coalesce(public.my_role(),'') = 'Technician' then
    -- Assignment is the technician's authority; the plant does not matter.
    if v_assigned is distinct from auth.uid() then
      raise exception 'This work-order is not assigned to you.';
    end if;
  elsif not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
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

-- ---- 3. Verify: expect one row per check, ok = 1 ----
select 'logs_update mentions assigned_to' as what,
       (select count(*) from pg_policies
        where tablename = 'maintenance_logs' and policyname = 'logs_update'
          and qual like '%assigned_to%') as ok;
