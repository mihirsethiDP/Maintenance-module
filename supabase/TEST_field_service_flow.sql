-- ===================================================================
-- DigitalPaani Maintenance Ops — self-test for the field-service flow
--
-- WHAT THIS IS
-- A read-only-by-consequence test. It impersonates real users by setting
-- the JWT claim that auth.uid() reads, drives the whole Phase 1-4 state
-- machine through the actual RPCs, checks each guard, and then ABORTS on
-- purpose so every row it created disappears. Nothing is left behind:
-- the results arrive as the text of the deliberate error.
--
-- SAFE TO RUN ON PRODUCTION. It ends with `raise exception`, which rolls
-- back the entire transaction. That is also how it prints its output.
--
-- HOW TO RUN
-- Paste the whole thing into Supabase → SQL Editor → Run. You will get a
-- red error box titled "TEST RESULTS" — that is the report, not a
-- failure. Send me its contents.
--
-- WHAT IT CANNOT TEST
-- Anything that needs a browser and a real session: photo upload to
-- storage, signed-URL rendering, the client signature pad, and the
-- camera-to-JPEG compression. Those still need a human with a phone.
-- ===================================================================

do $$
declare
  res   text[] := array[]::text[];
  v_tech    uuid;
  v_boss    uuid;
  v_eq      text;
  v_plant   text;
  v_log     text := 'L-TEST-' || to_char(clock_timestamp(), 'HH24MISSMS');
  v_log2    text := 'L-TEST2-' || to_char(clock_timestamp(), 'HH24MISSMS');
  v_rep     text := 'SR-TEST-' || to_char(clock_timestamp(), 'HH24MISSMS');
  v_issue   bigint;
  v_state   text;
  v_status  text;
  v_hash    text;
  v_wono    text;
  v_eqstat  text;
  v_today   date := (now() at time zone 'Asia/Kolkata')::date;
  -- Deliberately far from any real visit: submit_service_report keys on
  -- (plant, date, technician), and this must not touch live records.
  v_vdate   date := ((now() at time zone 'Asia/Kolkata')::date - 200);
begin
  -- ---------- fixtures ----------
  select id into v_tech from public.profiles
    where role = 'Technician' and coalesce(status,'active') = 'active' limit 1;
  select id into v_boss from public.profiles
    where role in ('Superadmin','Admin') and coalesce(status,'active') = 'active'
    order by case role when 'Superadmin' then 0 else 1 end limit 1;

  if v_tech is null then
    raise exception 'TEST RESULTS%', E'\n  ABORT: no active Technician account exists. Create one first.';
  end if;
  if v_boss is null then
    raise exception 'TEST RESULTS%', E'\n  ABORT: no active Admin/Superadmin account exists.';
  end if;

  select e.id, e.plant_id into v_eq, v_plant
    from public.equipment e
   where e.status = 'Operational'
     and not exists (select 1 from public.maintenance_logs l
                      where l.equipment_id = e.id and l.end_date is null)
   limit 1;
  if v_eq is null then
    raise exception 'TEST RESULTS%', E'\n  ABORT: no operational equipment without an open work order.';
  end if;

  res := array_append(res, ('fixtures: technician=' || v_tech || ', admin=' || v_boss || ', equipment=' || v_eq));

  -- =========================================================
  -- 1. Creating work orders
  -- =========================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.log_maintenance_start(v_log, v_eq, 'Scheduled', v_today, v_today, 'x', 'test',
                                         'Normal', null::bigint, null::text, v_tech, false);
    res := array_append(res, 'FAIL  a technician was allowed to CREATE a work order');
  exception when others then
    res := array_append(res, 'PASS  technician cannot create work orders');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  begin
    perform public.log_maintenance_start(v_log, v_eq, 'Scheduled', v_today, v_today, 'Test Tech', 'self-test',
                                         'Normal', null::bigint, null::text, v_tech, true);
    res := array_append(res, 'PASS  admin created a work order, assigned, photos required');
  exception when others then
    res := array_append(res, ('FAIL  admin could not create a work order: ' || sqlerrm));
  end;

  select wo_no, wo_state into v_wono, v_state from public.maintenance_logs where id = v_log;
  res := array_append(res, ('      wo_no assigned by trigger = ' || coalesce(v_wono, '(NULL - trigger missing!)')));
  if v_wono is null then res := array_append(res, 'FAIL  work-order number was not assigned (check 38)'); end if;

  select status into v_eqstat from public.equipment where id = v_eq;
  res := array_append(res, ('      equipment status after creation = ' || v_eqstat ||
                 case when v_eqstat = 'In Maintenance' then ' (correct)' else ' (EXPECTED In Maintenance)' end));

  -- =========================================================
  -- 2. Completion: photos required, technician-only, submits not closes
  -- =========================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.log_maintenance_complete(v_log, v_vdate, 'done', null, null);
    res := array_append(res, 'FAIL  completed a photos-required job with no photos attached');
  exception when others then
    res := array_append(res, 'PASS  photos-required job refused completion without a photo');
  end;

  -- Attach a metadata row (the storage object itself needs a browser).
  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  insert into public.work_order_media (log_id, path, uploaded_by) values (v_log, v_log || '/test.jpg', v_tech);

  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.log_maintenance_complete(v_log, v_vdate, 'Serviced and tested OK.', null, null);
    select wo_state into v_state from public.maintenance_logs where id = v_log;
    select status into v_eqstat from public.equipment where id = v_eq;
    if v_state = 'submitted' then
      res := array_append(res, 'PASS  technician completion -> submitted (not closed)');
    else
      res := array_append(res, ('FAIL  expected wo_state=submitted, got ' || v_state));
    end if;
    if v_eqstat = 'Operational' then
      res := array_append(res, 'PASS  machine returned to service at submission (review does not hold it hostage)');
    else
      res := array_append(res, ('FAIL  equipment left as ' || v_eqstat || ' while awaiting review'));
    end if;
  exception when others then
    res := array_append(res, ('FAIL  technician could not complete with a photo: ' || sqlerrm));
  end;

  -- =========================================================
  -- 3. Review loop: return, resubmit, approve
  -- =========================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.review_work_order(v_log, true, null);
    res := array_append(res, 'FAIL  a technician reviewed their own work');
  exception when others then
    res := array_append(res, 'PASS  technician cannot review work orders');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  begin
    perform public.review_work_order(v_log, false, null);
    res := array_append(res, 'FAIL  sent a job back with no note');
  exception when others then
    res := array_append(res, 'PASS  sending back requires a note');
  end;
  begin
    perform public.review_work_order(v_log, false, 'Add a photo of the replaced seal.');
    select wo_state into v_state from public.maintenance_logs where id = v_log;
    res := array_append(res, case when v_state = 'returned' then 'PASS  returned with a note'
                       else 'FAIL  expected returned, got ' || v_state end);
  exception when others then
    res := array_append(res, ('FAIL  could not return: ' || sqlerrm));
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.resubmit_work_order(v_log, 'Photo added, retested OK.');
    select wo_state into v_state from public.maintenance_logs where id = v_log;
    res := array_append(res, case when v_state = 'submitted' then 'PASS  technician resubmitted'
                       else 'FAIL  expected submitted, got ' || v_state end);
  exception when others then
    res := array_append(res, ('FAIL  resubmit failed: ' || sqlerrm));
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  begin
    perform public.review_work_order(v_log, true, null);
    select wo_state into v_state from public.maintenance_logs where id = v_log;
    res := array_append(res, case when v_state = 'done' then 'PASS  approved -> done'
                       else 'FAIL  expected done, got ' || v_state end);
  exception when others then
    res := array_append(res, ('FAIL  approve failed: ' || sqlerrm));
  end;

  -- =========================================================
  -- 4. Issues
  -- =========================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    insert into public.wo_issues (equipment_id, log_id, description, need, raised_name)
    values (v_eq, v_log, 'Self-test: bearing noisy', 'repair', 'Self test')
    returning id into v_issue;
    res := array_append(res, 'PASS  technician raised an issue');
  exception when others then
    res := array_append(res, ('FAIL  technician could not raise an issue: ' || sqlerrm));
  end;

  if v_issue is not null then
    begin
      perform public.triage_issue(v_issue, 'dismissed', null);
      res := array_append(res, 'FAIL  dismissed an issue with no reason');
    exception when others then
      res := array_append(res, 'PASS  dismissing an issue requires a reason');
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
    begin
      perform public.triage_issue(v_issue, 'handled', 'Self-test triage.');
      res := array_append(res, 'PASS  engineer triaged the issue');
    exception when others then
      res := array_append(res, ('FAIL  triage failed: ' || sqlerrm));
    end;
  end if;

  -- =========================================================
  -- 5. Holds
  -- =========================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  perform public.log_maintenance_start(v_log2, v_eq, 'Scheduled', v_today, v_today, 'Test Tech', 'hold test',
                                       'Normal', null::bigint, null::text, v_tech, false);
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.hold_work_order(v_log2, v_today + 7, 'Technician self-pausing', 'vendor', null);
    res := array_append(res, 'FAIL  a technician paused their own overdue clock');
  exception when others then
    res := array_append(res, 'PASS  technician cannot place a hold');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  begin
    perform public.hold_work_order(v_log2, v_today, 'No end date', 'vendor', null);
    res := array_append(res, 'FAIL  accepted a check-back date of today');
  exception when others then
    res := array_append(res, 'PASS  hold requires a future check-back date');
  end;
  begin
    perform public.hold_work_order(v_log2, v_today + 14, 'Seal on order, no ETA.', 'vendor', null);
    perform public.hold_work_order(v_log2, v_today + 28, 'Still no ETA.', 'vendor', null);
    res := array_append(res, ('PASS  hold placed and extended (hold_reviews='
      || (select hold_reviews::text from public.maintenance_logs where id = v_log2) || ', expected 2)'));
  exception when others then
    res := array_append(res, ('FAIL  hold failed: ' || sqlerrm));
  end;

  -- =========================================================
  -- 6. Service report: three signatures, in order, then locked
  -- =========================================================
  -- Leave the hold-test job SUBMITTED, so there is genuinely unreviewed work
  -- from this visit -- otherwise the refusal below would pass vacuously.
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  perform public.log_maintenance_complete(v_log2, v_vdate, 'Hold-test job done.', null, null);

  begin
    perform public.submit_service_report(v_rep, v_plant, v_vdate,
      json_build_object('plant_id', v_plant, 'visit_date', v_vdate, 'jobs', '[]'::json)::jsonb);
    res := array_append(res, 'FAIL  raised a report while a job from that visit is unapproved');
  exception when others then
    res := array_append(res, 'PASS  report refused while the visit has unreviewed work');
  end;

  -- Approve it through the real RPC, then the visit is clean.
  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  perform public.review_work_order(v_log2, true, null);

  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.submit_service_report(v_rep, v_plant, v_vdate,
      json_build_object('plant_id', v_plant, 'visit_date', v_vdate, 'jobs', '[]'::json)::jsonb);
    select status, content_hash into v_status, v_hash from public.service_reports where id = v_rep;
    res := array_append(res, ('PASS  technician submitted the report (status=' || v_status || ')'));
    res := array_append(res, ('      sha256 = ' || coalesce(left(v_hash, 16) || '...', '(NULL - hashing broken!)')));
    if v_hash is null or v_hash = '' then res := array_append(res, 'FAIL  content hash is empty (check 39)'); end if;
  exception when others then
    res := array_append(res, ('FAIL  report submission failed: ' || sqlerrm));
  end;

  -- Client cannot sign before the engineer.
  begin
    perform public.client_sign_report(v_rep, 'Test Client', 'Plant In-charge', v_rep || '/sig.png');
    res := array_append(res, 'FAIL  client signed before the engineer co-signed');
  exception when others then
    res := array_append(res, 'PASS  signature order enforced (engineer must sign first)');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  begin
    perform public.engineer_review_report(v_rep, true, null);
    select status into v_status from public.service_reports where id = v_rep;
    res := array_append(res, case when v_status = 'eng_signed' then 'PASS  engineer co-signed'
                       else 'FAIL  expected eng_signed, got ' || v_status end);
  exception when others then
    res := array_append(res, ('FAIL  engineer signing failed: ' || sqlerrm));
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_tech, 'role', 'authenticated')::text, true);
  begin
    perform public.client_sign_report(v_rep, '', '', v_rep || '/sig.png');
    res := array_append(res, 'FAIL  accepted a client signature with no name');
  exception when others then
    res := array_append(res, 'PASS  client signature requires a name');
  end;
  begin
    perform public.client_sign_report(v_rep, 'Test Client', 'Plant In-charge', v_rep || '/sig.png');
    select status into v_status from public.service_reports where id = v_rep;
    res := array_append(res, case when v_status = 'signed' then 'PASS  client signed -> signed'
                       else 'FAIL  expected signed, got ' || v_status end);
  exception when others then
    res := array_append(res, ('FAIL  client signing failed: ' || sqlerrm));
  end;

  -- The lock.
  begin
    update public.service_reports set review_note = 'tampered' where id = v_rep;
    res := array_append(res, 'FAIL  a SIGNED report was edited (guard trigger not working)');
  exception when others then
    res := array_append(res, 'PASS  signed report is immutable (guard trigger held)');
  end;

  -- =========================================================
  -- 7. Engineer-compiled report path
  -- =========================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_boss, 'role', 'authenticated')::text, true);
  begin
    perform public.engineer_create_report(v_rep || 'B', v_plant, v_today - 400, v_tech,
      json_build_object('jobs', '[]'::json)::jsonb);
    res := array_append(res, 'FAIL  compiled a report for a date with no completed work');
  exception when others then
    res := array_append(res, 'PASS  engineer cannot compile a report for a visit that did not happen');
  end;

  raise exception 'TEST RESULTS%', E'\n  ' || array_to_string(res, E'\n  ') ||
    E'\n\n  (Everything above was rolled back — no data was changed.)';
end $$;
