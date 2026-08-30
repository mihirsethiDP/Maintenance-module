-- ===================================================================
-- DigitalPaani Maintenance Ops — amendment reports
-- Run in Supabase → SQL Editor (after 49).
--
-- A job finished after that visit's report was client-signed had no
-- reportable home: the signed report is locked (correctly), and the
-- unique key on (plant, visit day, technician) blocked a second one.
-- 49 made that a plain refusal; this builds the real answer.
--
-- THE MECHANISM
-- The hard unique key becomes a PARTIAL unique index over unsigned
-- reports only. At most one report per visit is ever in flight — the
-- fix-and-resubmit flow keeps updating that open row exactly as before —
-- while signed reports stop conflicting, so a new submission becomes an
-- AMENDMENT: its own document, its own three signatures, its own lock.
--
-- An amendment contains only the work NOT already inside a signed report
-- for that visit (enforced here, not just in the client), records which
-- report it amends, and chains naturally: work finished after an
-- amendment is signed goes into the next one.
-- ===================================================================

alter table public.service_reports add column if not exists amendment_of text
  references public.service_reports(id) on delete set null;

alter table public.service_reports
  drop constraint if exists service_reports_plant_id_visit_date_technician_id_key;
create unique index if not exists sr_open_visit_uniq
  on public.service_reports (plant_id, visit_date, technician_id)
  where status <> 'signed';

-- Job ids already inside SIGNED reports for a visit.
create or replace function public.covered_job_ids(p_plant text, p_date date, p_tech uuid)
returns setof text language sql security definer stable set search_path = public as $$
  select j->>'id'
  from public.service_reports r, jsonb_array_elements(coalesce(r.content->'jobs','[]'::jsonb)) j
  where r.plant_id = p_plant and r.visit_date = p_date and r.technician_id = p_tech
    and r.status = 'signed';
$$;
revoke all on function public.covered_job_ids(text,date,uuid) from public, anon;
grant execute on function public.covered_job_ids(text,date,uuid) to authenticated;

-- ---- Technician submission: amendment-aware ----
create or replace function public.submit_service_report(
  p_id text, p_plant text, p_date date, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_open_status text; v_pending int; v_new int; v_amends text;
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

-- ---- Engineer compilation: amendment-aware ----
create or replace function public.engineer_create_report(
  p_id text, p_plant text, p_date date, p_tech uuid, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_eng text; v_total int; v_new int; v_pending int;
  v_attest timestamptz; v_hash text; v_amends text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins compile reports this way.';
  end if;
  if not public.has_plant_access(p_plant) then
    raise exception 'No access to this plant.';
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

-- ---- Verify: every row ok = 1 ----
select 'amendment column' as what,
       (select count(*) from information_schema.columns
        where table_name = 'service_reports' and column_name = 'amendment_of') as ok
union all
select 'partial unique index',
       (select count(*) from pg_indexes where indexname = 'sr_open_visit_uniq')
union all
select 'hard unique gone',
       (select (count(*) = 0)::int from pg_constraint
        where conname = 'service_reports_plant_id_visit_date_technician_id_key')
union all
select 'covered-ids helper',
       (select count(*) from pg_proc where proname = 'covered_job_ids');
