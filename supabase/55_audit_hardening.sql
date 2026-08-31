-- ===================================================================
-- DigitalPaani Maintenance Ops — hardening from the whole-code audit
-- Run in Supabase → SQL Editor (after 54). Four fixes:
--
--   1. Profiles: the role-change rule could be bypassed with DELETE +
--      re-INSERT (both open to any Admin), an Admin could hard-delete a
--      fellow Admin, and the sole Superadmin could demote themselves
--      into a lockout. INSERTs now require the Superadmin, deleting an
--      Admin requires the Superadmin, and Superadmin self-demotion is
--      refused (ownership handover stays possible from the SQL editor).
--   2. Reports: amendment scope is now truly server-enforced — content
--      carrying a job already inside a signed report is refused, so a
--      stale device cannot sign duplicated work into a second official
--      document. And compiling over a technician's in-flight report is
--      refused instead of silently overwriting it.
--   3. Quick-complete honesty: completing a never-started job records
--      the work on its completion day (no phantom multi-day durations
--      when an overdue plan is closed on the spot — the same rule the
--      online client already applied, now enforced for offline replays
--      too), and the completer's name lands on the record when the
--      technician field was blank.
-- ===================================================================

-- ---- 1a. Profiles guard v4 ----
create or replace function public.guard_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_open int;
begin
  -- Service context (SQL editor, service role): auth.uid() is NULL and RLS
  -- is already bypassed there by design -- the guard is for client requests.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    -- Rows are created by the auth hooks / invite function (service
    -- context). A client-side INSERT is a role-ceiling bypass unless the
    -- Superadmin does it knowingly.
    if not public.is_superadmin() then
      raise exception 'Profiles are created by the invite flow, not directly.';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.role = 'Superadmin' then
      raise exception 'The Superadmin profile cannot be deleted.';
    end if;
    if old.role = 'Admin' and not public.is_superadmin() then
      raise exception 'Only the Superadmin can remove an Admin.';
    end if;
    return old;
  end if;
  -- UPDATE:
  if old.role = 'Superadmin' and new.role is distinct from old.role then
    raise exception 'Ownership is handed over in the SQL editor, not here.';
  end if;
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
    -- Open assigned work must be handed over before deactivation.
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
drop trigger if exists guard_profiles_insert on public.profiles;
create trigger guard_profiles_insert
  before insert on public.profiles
  for each row execute function public.guard_profiles();
-- (guard_profiles_update / guard_profiles_delete triggers from 08 stay.)

-- ---- 2. Amendment scope enforced server-side ----
create or replace function public.submit_service_report(
  p_id text, p_plant text, p_date date, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_open_status text; v_pending int; v_new int; v_amends text; v_dup int;
begin
  if coalesce(public.my_role(),'') <> 'Technician' then
    raise exception 'Service reports are raised by technicians. Engineers use Visit Reports.';
  end if;

  select count(*) into v_pending
    from public.maintenance_logs l
    join public.equipment e on e.id = l.equipment_id
   where e.plant_id = p_plant and l.end_date = p_date and l.assigned_to = auth.uid()
     and coalesce(l.wo_state,'') in ('submitted','returned');
  if v_pending > 0 then
    raise exception 'Your engineer has not finished reviewing % job(s) from this visit. The report can be raised once they are approved.', v_pending;
  end if;

  -- One in-flight report per visit; signed ones do not block.
  select status into v_open_status from public.service_reports
    where plant_id = p_plant and visit_date = p_date and technician_id = auth.uid()
      and status <> 'signed';
  if v_open_status is not null and v_open_status <> 'changes' then
    raise exception 'A report for this visit is already submitted.';
  end if;

  -- There must be something NOT already inside a signed report.
  select count(*) into v_new
    from public.maintenance_logs l
    join public.equipment e on e.id = l.equipment_id
   where e.plant_id = p_plant and l.end_date = p_date and l.assigned_to = auth.uid()
     and l.id not in (select public.covered_job_ids(p_plant, p_date, auth.uid()));
  if v_new = 0 then
    raise exception 'Everything from this visit is already in the signed report — there is nothing new to report.';
  end if;

  -- And the CONTENT itself must not re-list covered work: a device with a
  -- stale cache would otherwise sign duplicates into a second official
  -- document. Refusing tells the client to refresh and rebuild.
  select count(*) into v_dup
    from jsonb_array_elements(coalesce(p_content->'jobs', '[]'::jsonb)) j
   where j->>'id' in (select public.covered_job_ids(p_plant, p_date, auth.uid()));
  if v_dup > 0 then
    raise exception 'This report includes % job(s) already inside a signed report. Refresh and try again — the new report must cover only new work.', v_dup;
  end if;

  -- The most recent signed report for this visit, if any, is what we amend.
  select id into v_amends from public.service_reports
    where plant_id = p_plant and visit_date = p_date and technician_id = auth.uid()
      and status = 'signed'
    order by updated_at desc limit 1;

  select name into v_name from public.profiles where id = auth.uid();
  insert into public.service_reports
    (id, plant_id, visit_date, technician_id, technician_name, content, content_hash,
     status, tech_signed_at, updated_at, eng_sign, review_note, amendment_of)
  values (p_id, p_plant, p_date, auth.uid(), coalesce(v_name,''), p_content,
          encode(sha256(convert_to(p_content::text, 'UTF8')), 'hex'),
          'submitted', now(), now(), null, null, v_amends)
  on conflict (plant_id, visit_date, technician_id) where status <> 'signed' do update
    set content = excluded.content, content_hash = excluded.content_hash,
        status = 'submitted', tech_signed_at = now(), updated_at = now(),
        eng_sign = null, review_note = null, amendment_of = excluded.amendment_of;
end;
$$;

create or replace function public.engineer_create_report(
  p_id text, p_plant text, p_date date, p_tech uuid, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_eng text; v_total int; v_new int; v_pending int;
  v_attest timestamptz; v_hash text; v_amends text; v_open_status text; v_dup int;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins compile reports this way.';
  end if;
  if not public.has_plant_access(p_plant) then
    raise exception 'No access to this plant.';
  end if;

  -- Never overwrite a technician's in-flight report: review it instead.
  select status into v_open_status from public.service_reports
    where plant_id = p_plant and visit_date = p_date and technician_id = p_tech
      and status <> 'signed';
  if v_open_status in ('submitted','changes') then
    raise exception 'The technician has a report in flight for this visit — review that one instead of compiling over it.';
  end if;

  select count(*),
         count(*) filter (where coalesce(l.wo_state,'') in ('submitted','returned')),
         count(*) filter (where l.id not in (select public.covered_job_ids(p_plant, p_date, p_tech))),
         max(l.submitted_at)
    into v_total, v_pending, v_new, v_attest
    from public.maintenance_logs l
    join public.equipment e on e.id = l.equipment_id
   where e.plant_id = p_plant and l.end_date = p_date and l.assigned_to = p_tech;

  if v_total = 0 then
    raise exception 'No completed work orders for that technician at that plant on that date.';
  end if;
  if v_pending > 0 then
    raise exception 'Approve the remaining % job(s) from this visit first.', v_pending;
  end if;
  if v_new = 0 then
    raise exception 'Everything from this visit is already in the signed report — there is nothing new to report.';
  end if;
  select count(*) into v_dup
    from jsonb_array_elements(coalesce(p_content->'jobs', '[]'::jsonb)) j
   where j->>'id' in (select public.covered_job_ids(p_plant, p_date, p_tech));
  if v_dup > 0 then
    raise exception 'This report includes % job(s) already inside a signed report. Refresh and try again — the new report must cover only new work.', v_dup;
  end if;

  select id into v_amends from public.service_reports
    where plant_id = p_plant and visit_date = p_date and technician_id = p_tech
      and status = 'signed'
    order by updated_at desc limit 1;

  select name into v_name from public.profiles where id = p_tech;
  select name into v_eng  from public.profiles where id = auth.uid();
  v_hash := encode(sha256(convert_to(p_content::text, 'UTF8')), 'hex');

  insert into public.service_reports
    (id, plant_id, visit_date, technician_id, technician_name, content, content_hash,
     status, tech_signed_at, updated_at, eng_sign, review_note, amendment_of)
  values (p_id, p_plant, p_date, p_tech, coalesce(v_name,''), p_content, v_hash,
          'eng_signed', coalesce(v_attest, now()), now(),
          jsonb_build_object('user_id', auth.uid(), 'name', coalesce(v_eng,''),
                             'ts', now(), 'hash', v_hash, 'compiled', true),
          null, v_amends)
  on conflict (plant_id, visit_date, technician_id) where status <> 'signed' do update
    set content = excluded.content, content_hash = excluded.content_hash,
        status = 'eng_signed', updated_at = now(),
        eng_sign = excluded.eng_sign, review_note = null, amendment_of = excluded.amendment_of;
end;
$$;

-- ---- 3. Quick-complete honesty (open jobs) ----
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null,
  p_part_actions jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_assigned uuid; v_photos boolean; v_start date; v_state text; v_is_tech boolean; v_today date; pa jsonb;
begin
  select equipment_id, assigned_to, photos_required, start_date, coalesce(wo_state,'')
    into v_eq, v_assigned, v_photos, v_start, v_state
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  v_is_tech := coalesce(public.my_role(),'') = 'Technician';
  if v_is_tech then
    if v_assigned is distinct from auth.uid() then
      raise exception 'This work-order is not assigned to you.';
    end if;
    if coalesce(v_photos, false) and not exists (
      select 1 from public.work_order_media where log_id = p_log) then
      raise exception 'This job requires photos — add at least one before completing.';
    end if;
  elsif not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;

  -- The date is a claim; these are its limits.
  v_today := (now() at time zone 'Asia/Kolkata')::date;
  if p_end is null then raise exception 'A completion date is required.'; end if;
  if p_end > v_today then
    raise exception 'The completion date cannot be in the future.';
  end if;
  -- A job completed while still OPEN was never started: the work happened
  -- on its completion day — whether the plan was overdue or in the future.
  -- (This is what the online client always recorded; now replays match.)
  if v_state = 'open' then
    v_start := p_end;
  end if;
  if p_end < v_start then
    raise exception 'The completion date is before the job started (%).', v_start;
  end if;
  if p_end < v_today - 30 then
    raise exception 'Completions can be recorded up to 30 days after the work. For older records, ask your admin.';
  end if;

  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,''),
        start_date = v_start,
        assigned_to = coalesce(assigned_to, case when v_is_tech then null else auth.uid() end),
        assigned_by = coalesce(assigned_by, case when v_is_tech then null else auth.uid() end),
        -- The completer's name belongs on the record when none was typed.
        technician = coalesce(nullif(technician,''), (select name from public.profiles where id = auth.uid())),
        wo_state = case when v_is_tech then 'submitted' else 'done' end,
        submitted_at = case when v_is_tech then now() end,
        completed_recorded_at = now(),
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

-- ---- Verify: every row true ----
select 'insert guard exists' as what,
       (select count(*) = 1 from pg_trigger where tgname = 'guard_profiles_insert')::text as ok
union all
select 'admin delete needs superadmin',
       (select (prosrc like '%can remove an Admin%')::text from pg_proc where proname = 'guard_profiles')
union all
select 'superadmin self-demotion blocked',
       (select (prosrc like '%handed over in the SQL editor%')::text from pg_proc where proname = 'guard_profiles')
union all
select 'amendment content enforced (tech)',
       (select (prosrc like '%already inside a signed report. Refresh%')::text from pg_proc where proname = 'submit_service_report')
union all
select 'amendment content enforced (eng) + in-flight guard',
       (select (prosrc like '%review that one instead%' and prosrc like '%Refresh and try again%')::text from pg_proc where proname = 'engineer_create_report')
union all
select 'open quick-complete records completion-day work',
       (select (prosrc like '%never started%' or prosrc like '%completion day%')::text from pg_proc where proname = 'log_maintenance_complete');
