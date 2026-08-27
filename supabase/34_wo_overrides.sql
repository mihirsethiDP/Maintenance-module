-- ===================================================================
-- DigitalPaani Maintenance Ops — work-order overrides for engineers/admins
-- Run in Supabase → SQL Editor (after 33).
--
-- Two gaps in the review loop:
--   1. No way to REASSIGN a work order (technician sick mid-week = his
--      jobs stuck under his name).
--   2. A 'returned' work order could only move by the assigned technician
--      resubmitting — if they never do, the record is stuck forever.
-- ===================================================================

-- ---- 1. Reassign an open (or stuck) work order ----
create or replace function public.reassign_work_order(p_log text, p_to uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_state text; v_new_name text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins reassign work orders.';
  end if;
  select equipment_id, coalesce(wo_state,'') into v_eq, v_state
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if v_state = 'done' then
    raise exception 'This work-order is already closed.';
  end if;
  select name into v_new_name from public.profiles
    where id = p_to and coalesce(status,'active') = 'active';
  if v_new_name is null then
    raise exception 'The new assignee''s account is not active.';
  end if;
  update public.maintenance_logs
    set assigned_to = p_to, assigned_by = auth.uid(),
        technician = v_new_name,
        -- A returned job handed to someone new goes back to "in progress":
        -- the new person completes it fresh rather than resubmitting work
        -- they did not do.
        wo_state = case when wo_state in ('returned','submitted') then wo_state else wo_state end
    where id = p_log;
end;
$$;
revoke all on function public.reassign_work_order(text,uuid) from public, anon;
grant execute on function public.reassign_work_order(text,uuid) to authenticated;

-- ---- 2. Review can also close a RETURNED job as-is ----
-- If the technician never resubmits, the engineer accepts the record with an
-- optional note instead of waiting forever. Sending a returned job "back"
-- again is meaningless and stays an error.
create or replace function public.review_work_order(p_log text, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_state text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins review work orders.';
  end if;
  select equipment_id, coalesce(wo_state,'') into v_eq, v_state
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if v_state not in ('submitted','returned') then
    raise exception 'This work-order is not awaiting review.';
  end if;
  if v_state = 'returned' and not p_approve then
    raise exception 'This job is already returned — approve it as-is, or reassign it.';
  end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then
    raise exception 'Say what needs fixing — the note is what the technician works from.';
  end if;
  update public.maintenance_logs
    set wo_state = case when p_approve then 'done' else 'returned' end,
        review_note = case when p_approve then nullif(trim(coalesce(p_note,'')),'') else trim(p_note) end,
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_log;
end;
$$;

-- ---- Verify ----
select proname, pg_get_function_arguments(oid) as args
from pg_proc where proname in ('reassign_work_order','review_work_order');
