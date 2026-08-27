-- ===================================================================
-- DigitalPaani Maintenance Ops — Phase 3: issues + co-signed service reports
-- Run in Supabase → SQL Editor (after 34).
--
-- ISSUES: mid-job (or any time), someone reports a part needing service,
-- repair, or replacement. Engineers triage: schedule a follow-up work
-- order, mark it handled, or dismiss with a reason. Open issues stay
-- pinned to the equipment — "we'll do it later" gets a list.
--
-- SERVICE REPORTS: one per technician per plant per visit day, compiled
-- from that day's completed work orders and issues. Three signatures in
-- enforced order — technician (at submission), engineer (at review),
-- client (drawn on the phone) — each stamped over a SHA-256 hash of the
-- report content. Once the client signs, the row is locked by trigger:
-- corrections are new reports, never edits.
-- ===================================================================

create extension if not exists pgcrypto;

-- ---- 1. Issues ----
create table if not exists public.wo_issues (
  id           bigserial primary key,
  equipment_id text not null references public.equipment(id) on delete cascade,
  log_id       text references public.maintenance_logs(id) on delete set null,
  raised_by    uuid not null default auth.uid() references auth.users(id) on delete set null,
  raised_name  text not null default '',
  description  text not null,
  need         text not null default 'repair' check (need in ('service','repair','replace')),
  status       text not null default 'open' check (status in ('open','scheduled','handled','dismissed')),
  triaged_by   uuid references auth.users(id) on delete set null,
  triaged_at   timestamptz,
  triage_note  text,
  follow_up_log_id text references public.maintenance_logs(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists issues_eq_idx on public.wo_issues (equipment_id) where status = 'open';
alter table public.wo_issues enable row level security;
revoke truncate, references, trigger on public.wo_issues from anon, authenticated;

drop policy if exists issues_read on public.wo_issues;
create policy issues_read on public.wo_issues for select to authenticated
  using (public.is_active());
-- Anyone active may RAISE an issue (technicians roam; finding problems is
-- everyone's job). Triage goes through the RPC below, so no update policy.
drop policy if exists issues_insert on public.wo_issues;
create policy issues_insert on public.wo_issues for insert to authenticated
  with check (raised_by = auth.uid() and public.is_active());

create or replace function public.triage_issue(
  p_id bigint, p_action text, p_note text default null, p_follow_log text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins triage issues.';
  end if;
  select equipment_id into v_eq from public.wo_issues where id = p_id;
  if v_eq is null then raise exception 'Issue not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if p_action not in ('scheduled','handled','dismissed') then
    raise exception 'Unknown action.';
  end if;
  if p_action = 'dismissed' and coalesce(trim(p_note),'') = '' then
    raise exception 'Dismissing an issue needs a reason — it is the record of why nothing was done.';
  end if;
  update public.wo_issues
    set status = p_action, triage_note = nullif(trim(coalesce(p_note,'')),''),
        follow_up_log_id = p_follow_log,
        triaged_by = auth.uid(), triaged_at = now()
    where id = p_id;
end;
$$;
revoke all on function public.triage_issue(bigint,text,text,text) from public, anon;
grant execute on function public.triage_issue(bigint,text,text,text) to authenticated;

-- ---- 2. Service reports ----
create table if not exists public.service_reports (
  id              text primary key,
  plant_id        text not null references public.plants(id) on delete cascade,
  visit_date      date not null,
  technician_id   uuid not null references auth.users(id) on delete cascade,
  technician_name text not null default '',
  content         jsonb not null,
  content_hash    text not null,
  status          text not null default 'submitted'
                  check (status in ('submitted','changes','eng_signed','signed')),
  tech_signed_at  timestamptz not null default now(),
  eng_sign        jsonb,
  client_sign     jsonb,
  review_note     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (plant_id, visit_date, technician_id)
);
alter table public.service_reports enable row level security;
revoke truncate, references, trigger on public.service_reports from anon, authenticated;

drop policy if exists sr_read on public.service_reports;
create policy sr_read on public.service_reports for select to authenticated
  using (public.is_active());
-- All writes go through the RPCs below (no insert/update policies), and a
-- signed report is immutable even to them:
create or replace function public.guard_service_reports()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return coalesce(new, old); end if;   -- service context
  if tg_op = 'DELETE' then
    if old.status = 'signed' then raise exception 'A signed report cannot be deleted.'; end if;
    if not public.is_admin() then raise exception 'Only admins delete reports.'; end if;
    return old;
  end if;
  if old.status = 'signed' then
    raise exception 'This report is signed and locked — corrections are new reports, never edits.';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_service_reports on public.service_reports;
create trigger guard_service_reports
  before update or delete on public.service_reports
  for each row execute function public.guard_service_reports();
drop policy if exists sr_delete on public.service_reports;
create policy sr_delete on public.service_reports for delete to authenticated
  using (public.is_admin());

-- Signature 1: the technician submits (their login IS the signature).
create or replace function public.submit_service_report(
  p_id text, p_plant text, p_date date, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_status text;
begin
  if coalesce(public.my_role(),'') <> 'Technician' then
    raise exception 'Service reports are raised by technicians. Engineers use Visit Reports.';
  end if;
  select name into v_name from public.profiles where id = auth.uid();
  select status into v_status from public.service_reports
    where plant_id = p_plant and visit_date = p_date and technician_id = auth.uid();
  if v_status is not null and v_status not in ('changes') then
    raise exception 'A report for this visit is already submitted.';
  end if;
  insert into public.service_reports
    (id, plant_id, visit_date, technician_id, technician_name, content, content_hash,
     status, tech_signed_at, updated_at, eng_sign, review_note)
  values (p_id, p_plant, p_date, auth.uid(), coalesce(v_name,''), p_content,
          encode(digest(p_content::text, 'sha256'), 'hex'), 'submitted', now(), now(), null, null)
  on conflict (plant_id, visit_date, technician_id) do update
    set content = excluded.content, content_hash = excluded.content_hash,
        status = 'submitted', tech_signed_at = now(), updated_at = now(),
        eng_sign = null, review_note = null;
end;
$$;
revoke all on function public.submit_service_report(text,text,date,jsonb) from public, anon;
grant execute on function public.submit_service_report(text,text,date,jsonb) to authenticated;

-- Signature 2: the engineer co-signs (or sends back with a note).
create or replace function public.engineer_review_report(p_id text, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_plant text; v_status text; v_hash text; v_name text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins review service reports.';
  end if;
  select plant_id, status, content_hash into v_plant, v_status, v_hash
    from public.service_reports where id = p_id;
  if v_plant is null then raise exception 'Report not found.'; end if;
  if not public.has_plant_access(v_plant) then
    raise exception 'No access to this plant.';
  end if;
  if v_status <> 'submitted' then raise exception 'This report is not awaiting review.'; end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then
    raise exception 'Say what needs fixing — the note is what the technician works from.';
  end if;
  select name into v_name from public.profiles where id = auth.uid();
  update public.service_reports
    set status = case when p_approve then 'eng_signed' else 'changes' end,
        eng_sign = case when p_approve then jsonb_build_object(
          'user_id', auth.uid(), 'name', coalesce(v_name,''), 'ts', now(), 'hash', v_hash) end,
        review_note = case when p_approve then null else trim(p_note) end,
        updated_at = now()
    where id = p_id;
end;
$$;
revoke all on function public.engineer_review_report(text,boolean,text) from public, anon;
grant execute on function public.engineer_review_report(text,boolean,text) to authenticated;

-- Signature 3: the client draws on the phone. Locks the report.
create or replace function public.client_sign_report(
  p_id text, p_name text, p_designation text, p_image_path text
) returns void language plpgsql security definer set search_path = public as $$
declare v_plant text; v_status text; v_tech uuid; v_hash text;
begin
  select plant_id, status, technician_id, content_hash into v_plant, v_status, v_tech, v_hash
    from public.service_reports where id = p_id;
  if v_plant is null then raise exception 'Report not found.'; end if;
  -- The device in the client's hands is the technician's (or an engineer's).
  if not (v_tech = auth.uid()
          or (coalesce(public.my_role(),'') in ('Engineer','Admin','Superadmin')
              and public.has_plant_access(v_plant))) then
    raise exception 'Only the report''s technician or an engineer can collect the client signature.';
  end if;
  if v_status <> 'eng_signed' then
    raise exception 'The engineer must co-sign before the client — signature order is enforced.';
  end if;
  if coalesce(trim(p_name),'') = '' then
    raise exception 'The client''s name is required beneath their signature.';
  end if;
  update public.service_reports
    set status = 'signed',
        client_sign = jsonb_build_object(
          'name', trim(p_name), 'designation', trim(coalesce(p_designation,'')),
          'ts', now(), 'image_path', p_image_path, 'hash', v_hash),
        updated_at = now()
    where id = p_id;
end;
$$;
revoke all on function public.client_sign_report(text,text,text,text) from public, anon;
grant execute on function public.client_sign_report(text,text,text,text) to authenticated;

-- ---- 3. Storage: client signature images live under the report's id ----
drop policy if exists "report media insert" on storage.objects;
create policy "report media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'wo-media' and (storage.foldername(name))[1] like 'SR-%'
    and exists (select 1 from public.service_reports r
      where r.id = (storage.foldername(name))[1]
        and (r.technician_id = auth.uid()
          or (coalesce(public.my_role(),'') in ('Engineer','Admin','Superadmin')
              and public.has_plant_access(r.plant_id)))));

-- ---- 4. Verify: every row ok = 1 ----
select 'issues table' as what, (select count(*) from information_schema.tables where table_name = 'wo_issues') as ok
union all
select 'reports table', (select count(*) from information_schema.tables where table_name = 'service_reports')
union all
select 'report guard', (select count(*) from pg_trigger where tgname = 'guard_service_reports')
union all
select 'sign functions', (select count(*) = 3 from pg_proc
        where proname in ('submit_service_report','engineer_review_report','client_sign_report'))::int
union all
select 'pgcrypto', (select count(*) from pg_extension where extname = 'pgcrypto');
