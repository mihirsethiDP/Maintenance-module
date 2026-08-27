-- ===================================================================
-- DigitalPaani Maintenance Ops — fix report hashing, gate report timing
-- Run in Supabase → SQL Editor (after 38). Fixes a live bug.
--
-- BUG 1 — "function digest(text, unknown) does not exist"
-- 35 called pgcrypto's digest() from a function pinned to
-- `search_path = public`. Supabase installs extensions into the
-- `extensions` schema, so digest() was never on the path — the
-- extension was present and the call still failed. Fixed by dropping
-- the dependency: Postgres has a built-in sha256(bytea) in pg_catalog
-- (PG 11+), always resolvable, no extension needed.
--
-- BUG 2 — a report could be raised while its work was still disputed
-- A returned work order has an end_date (submission sets it), so the
-- app counted it as part of a visit and offered to raise the report.
-- But a service report states "this is the work I did and it is
-- complete" — premature while a job is still with the engineer or sent
-- back for fixes. Now refused, with an explanation.
-- ===================================================================

-- ---- Signature 1: the technician submits ----
create or replace function public.submit_service_report(
  p_id text, p_plant text, p_date date, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare v_name text; v_status text; v_pending int;
begin
  if coalesce(public.my_role(),'') <> 'Technician' then
    raise exception 'Service reports are raised by technicians. Engineers use Visit Reports.';
  end if;

  -- Every job from this visit must be CLOSED before the client sees a
  -- report saying the work is done.
  select count(*) into v_pending
    from public.maintenance_logs l
    join public.equipment e on e.id = l.equipment_id
   where e.plant_id = p_plant
     and l.end_date = p_date
     and l.assigned_to = auth.uid()
     and coalesce(l.wo_state,'') in ('submitted','returned');
  if v_pending > 0 then
    raise exception 'Your engineer has not finished reviewing % job(s) from this visit. The report can be raised once they are approved.', v_pending;
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
          -- Built-in sha256 over the UTF-8 bytes of the content. No pgcrypto.
          encode(sha256(convert_to(p_content::text, 'UTF8')), 'hex'),
          'submitted', now(), now(), null, null)
  on conflict (plant_id, visit_date, technician_id) do update
    set content = excluded.content, content_hash = excluded.content_hash,
        status = 'submitted', tech_signed_at = now(), updated_at = now(),
        eng_sign = null, review_note = null;
end;
$$;

-- ---- Verify: hashing works, and names the built-in it now uses ----
select encode(sha256(convert_to('{"test":1}', 'UTF8')), 'hex') as sample_hash;
select proname, prosrc like '%sha256%' as uses_builtin_sha256
from pg_proc where proname = 'submit_service_report';
