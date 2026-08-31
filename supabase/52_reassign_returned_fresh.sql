-- ===================================================================
-- DigitalPaani Maintenance Ops — reassigning a returned job hands it
-- over fresh. Run in Supabase → SQL Editor (after 51).
--
-- 34's reassign_work_order carried a comment promising that a returned
-- job handed to someone new "goes back to in progress so the new person
-- completes it fresh" — but the CASE beneath it was a no-op: the new
-- assignee received the job still 'returned', and My Work showed them
-- "Fix & send again" for a completion they never made.
--
-- Now: reassigning a RETURNED job resets it to in-progress — the state
-- becomes 'active', the old completion date and submission stamp are
-- cleared, and the engineer's send-back note is kept (it tells the new
-- person what was missing). A SUBMITTED job cannot be reassigned at
-- all: it is awaiting a verdict — review it (approve, or send back)
-- before handing it to anyone.
-- ===================================================================

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
  if v_state = 'submitted' then
    raise exception 'This job is waiting for a review verdict — approve it or send it back first.';
  end if;
  select name into v_new_name from public.profiles
    where id = p_to and coalesce(status,'active') = 'active';
  if v_new_name is null then
    raise exception 'The new assignee''s account is not active.';
  end if;
  update public.maintenance_logs
    set assigned_to = p_to, assigned_by = auth.uid(),
        technician = v_new_name,
        -- A returned job handed to someone new starts fresh: in progress,
        -- no leftover completion date, ready for THEIR completion. The
        -- send-back note stays — it says what the record was missing.
        wo_state = case when wo_state = 'returned' then 'active' else wo_state end,
        end_date = case when wo_state = 'returned' then null else end_date end,
        submitted_at = case when wo_state = 'returned' then null else submitted_at end,
        completion_notes = case when wo_state = 'returned' then null else completion_notes end
    where id = p_log;
end;
$$;
revoke all on function public.reassign_work_order(text,uuid) from public, anon;
grant execute on function public.reassign_work_order(text,uuid) to authenticated;

-- ---- Verify ----
select 'reassign guards submitted', (pg_get_functiondef('public.reassign_work_order(text,uuid)'::regprocedure) like '%waiting for a review verdict%')::text
union all
select 'returned resets to active', (pg_get_functiondef('public.reassign_work_order(text,uuid)'::regprocedure) like '%then ''active''%')::text;
