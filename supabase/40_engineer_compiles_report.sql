-- ===================================================================
-- DigitalPaani Maintenance Ops — engineers can compile the report
-- Run in Supabase → SQL Editor (after 39).
--
-- FRICTION REMOVED
-- After approving the last work order of a visit, the engineer had to
-- wait for the technician to raise the report before they could sign
-- it — a round trip for a document that is entirely derived from work
-- orders the engineer just approved.
--
-- Now the engineer can compile and co-sign in one step. The report goes
-- straight to 'eng_signed', ready for the client's signature on site.
--
-- HONESTY ABOUT THE FIRST SIGNATURE
-- The technician does not sign this version of the document, so we do
-- not pretend they did. Their attestation is real but different: they
-- submitted each work order, with notes and photos, and that timestamp
-- is what tech_signed_at records. eng_sign carries compiled = true so
-- the report view can say "attested by work-order submission" instead
-- of implying a signature on a page they never saw.
-- ===================================================================

create or replace function public.engineer_create_report(
  p_id text, p_plant text, p_date date, p_tech uuid, p_content jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_eng text; v_total int; v_pending int; v_attest timestamptz; v_hash text;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins compile reports this way.';
  end if;
  if not public.has_plant_access(p_plant) then
    raise exception 'No access to this plant.';
  end if;

  -- Every job in the visit must be closed, and there must be at least one.
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
          'eng_signed',
          -- The technician's real attestation moment: when they submitted the work.
          coalesce(v_attest, now()),
          now(),
          jsonb_build_object('user_id', auth.uid(), 'name', coalesce(v_eng,''),
                             'ts', now(), 'hash', v_hash, 'compiled', true),
          null)
  on conflict (plant_id, visit_date, technician_id) do update
    set content = excluded.content, content_hash = excluded.content_hash,
        status = 'eng_signed', updated_at = now(),
        eng_sign = excluded.eng_sign, review_note = null
    -- Never overwrite a report the client has already signed; the guard
    -- trigger would refuse anyway, but say why here.
    where public.service_reports.status <> 'signed';
end;
$$;
revoke all on function public.engineer_create_report(text,text,date,uuid,jsonb) from public, anon;
grant execute on function public.engineer_create_report(text,text,date,uuid,jsonb) to authenticated;

-- ---- Verify ----
select proname, pg_get_function_arguments(oid) as args
from pg_proc where proname = 'engineer_create_report';
