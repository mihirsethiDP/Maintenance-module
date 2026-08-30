-- ===================================================================
-- DigitalPaani Maintenance Ops — compiling over a signed report must fail loudly
-- Run in Supabase → SQL Editor (after 48).
--
-- THE BUG
-- engineer_create_report upserts with "do update ... where status <>
-- 'signed'". When that day's report was already client-signed, the update
-- matched zero rows — and the function returned success while writing
-- NOTHING. The engineer was told the report was created; it was not. The
-- immutability guard never fired because no row was touched. A silent lie,
-- found by adversarial re-reading, not by a user (yet).
--
-- Now it raises, in plain words. Full "amendment reports" (a second report
-- for the same visit day) are deliberately NOT built until the situation
-- actually occurs — the refusal tells the engineer exactly what is going on.
-- ===================================================================

create or replace function public.engineer_create_report(
  p_id text, p_plant text, p_date date, p_tech uuid, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_eng text; v_total int; v_pending int; v_attest timestamptz; v_hash text; v_status text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins compile reports this way.';
  end if;
  if not public.has_plant_access(p_plant) then
    raise exception 'No access to this plant.';
  end if;

  -- A client-signed report for this visit is locked; say so instead of
  -- pretending to succeed.
  select status into v_status from public.service_reports
    where plant_id = p_plant and visit_date = p_date and technician_id = p_tech;
  if v_status = 'signed' then
    raise exception 'That visit''s report is already signed by the client and locked. Work finished after the signature needs its own record — contact Mihir if this comes up, and amendments will be built.';
  end if;

  select count(*),
         count(*) filter (where coalesce(l.wo_state,'') in ('submitted','returned')),
         max(l.submitted_at)
    into v_total, v_pending, v_attest
    from public.maintenance_logs l
    join public.equipment e on e.id = l.equipment_id
   where e.plant_id = p_plant and l.end_date = p_date and l.assigned_to = p_tech;

  if v_total = 0 then
    raise exception 'No completed work orders for that technician at that plant on that date.';
  end if;
  if v_pending > 0 then
    raise exception 'Approve the remaining % job(s) from this visit first.', v_pending;
  end if;

  select name into v_name from public.profiles where id = p_tech;
  select name into v_eng  from public.profiles where id = auth.uid();
  v_hash := encode(sha256(convert_to(p_content::text, 'UTF8')), 'hex');

  insert into public.service_reports
    (id, plant_id, visit_date, technician_id, technician_name, content, content_hash,
     status, tech_signed_at, updated_at, eng_sign, review_note)
  values (p_id, p_plant, p_date, p_tech, coalesce(v_name,''), p_content, v_hash,
          'eng_signed', coalesce(v_attest, now()), now(),
          jsonb_build_object('user_id', auth.uid(), 'name', coalesce(v_eng,''),
                             'ts', now(), 'hash', v_hash, 'compiled', true),
          null)
  on conflict (plant_id, visit_date, technician_id) do update
    set content = excluded.content, content_hash = excluded.content_hash,
        status = 'eng_signed', updated_at = now(),
        eng_sign = excluded.eng_sign, review_note = null;
end;
$$;

-- ---- Verify: the silent no-op clause is gone, the loud check is in ----
select (prosrc like '%already signed by the client%')::int as raises_on_signed,
       (prosrc not like '%where public.service_reports.status%')::int as silent_noop_removed
from pg_proc where proname = 'engineer_create_report';
