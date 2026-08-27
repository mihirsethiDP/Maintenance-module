-- ===================================================================
-- DigitalPaani Maintenance Ops — putting a work order on hold
-- Run in Supabase → SQL Editor (after 40).
--
-- WHY
-- The Oversight page ages every waiting job the same way, so a job
-- genuinely blocked on a vendor delivery reads as neglect. A hold
-- separates "waiting on the world" from "nobody is doing it".
--
-- THE DATE IS A CHECK-BACK, NOT A PREDICTION
-- Delivery dates are often unknown, so requiring "when will it resume?"
-- would force engineers to invent one. hold_until asks a question that
-- always has an honest answer: WHEN WILL YOU LOOK AT THIS AGAIN? On that
-- date the hold stops counting, the job is overdue again, and Oversight
-- flags it as an expired hold. Unknown timelines are fine; unattended
-- ones are not.
--
-- EXTENSIONS ARE COUNTED
-- Re-holding an already-held job increments hold_reviews. A hold rolled
-- forward five times is a vendor problem to escalate, not a maintenance
-- problem to keep deferring — and without the count that pattern is
-- invisible.
--
-- WHO
-- Engineers and admins only, never the technician whose clock it stops.
-- The technician's route is to report an issue; the engineer decides
-- whether it justifies a hold. A self-certified pause is not
-- accountability.
--
-- Not a new wo_state: the job stays open/active, so there is nothing to
-- "resume to" and the state machine is unchanged. A held job can still
-- be worked on and completed the moment the blocker clears.
-- ===================================================================

alter table public.maintenance_logs add column if not exists hold_until    date;
alter table public.maintenance_logs add column if not exists hold_reason   text;
alter table public.maintenance_logs add column if not exists hold_kind     text;
alter table public.maintenance_logs add column if not exists hold_by       uuid references auth.users(id) on delete set null;
alter table public.maintenance_logs add column if not exists hold_at       timestamptz;
alter table public.maintenance_logs add column if not exists hold_reviews  int not null default 0;
alter table public.maintenance_logs add column if not exists hold_issue_id bigint references public.wo_issues(id) on delete set null;

alter table public.maintenance_logs drop constraint if exists maintenance_logs_hold_kind_check;
alter table public.maintenance_logs add constraint maintenance_logs_hold_kind_check
  check (hold_kind is null or hold_kind in ('vendor','shutdown','access','budget','other'));

-- ---- Place or extend a hold ----
create or replace function public.hold_work_order(
  p_log text, p_until date, p_reason text, p_kind text default 'other', p_issue bigint default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_end date; v_today date; v_held boolean;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins put work on hold. Technicians report an issue instead.';
  end if;
  select equipment_id, end_date, (hold_until is not null and hold_until >= (now() at time zone 'Asia/Kolkata')::date)
    into v_eq, v_end, v_held
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if v_end is not null then
    raise exception 'This work-order is already finished.';
  end if;
  if coalesce(trim(p_reason),'') = '' then
    raise exception 'A hold needs a reason — it is the answer to "why is this not done yet?".';
  end if;
  v_today := (now() at time zone 'Asia/Kolkata')::date;
  if p_until is null or p_until <= v_today then
    raise exception 'Set a check-back date in the future. You need not know when the blocker clears — only when you will look again.';
  end if;
  update public.maintenance_logs
    set hold_until = p_until,
        hold_reason = trim(p_reason),
        hold_kind = case when p_kind in ('vendor','shutdown','access','budget','other') then p_kind else 'other' end,
        hold_issue_id = coalesce(p_issue, hold_issue_id),
        hold_by = auth.uid(), hold_at = now(),
        -- Counts every time this job's hold was set or rolled forward.
        hold_reviews = coalesce(hold_reviews, 0) + 1
    where id = p_log;
end;
$$;
drop function if exists public.hold_work_order(text,date,text,bigint);
revoke all on function public.hold_work_order(text,date,text,text,bigint) from public, anon;
grant execute on function public.hold_work_order(text,date,text,text,bigint) to authenticated;

-- ---- Release it ----
-- The reason, category and extension count are kept; only the date is
-- cleared, so the history still shows the job was held, why, and how long
-- it was rolled forward.
create or replace function public.release_work_order_hold(p_log text)
returns void language plpgsql security definer set search_path = public as $$
declare v_eq text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins release a hold.';
  end if;
  select equipment_id into v_eq from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  update public.maintenance_logs set hold_until = null where id = p_log;
end;
$$;
revoke all on function public.release_work_order_hold(text) from public, anon;
grant execute on function public.release_work_order_hold(text) to authenticated;

-- ---- Verify ----
select
  (select count(*) from information_schema.columns
   where table_name = 'maintenance_logs'
     and column_name in ('hold_until','hold_reason','hold_kind','hold_by','hold_at','hold_reviews','hold_issue_id')) as hold_columns,
  (select count(*) from pg_proc where proname in ('hold_work_order','release_work_order_hold')) as hold_functions;
