-- ===================================================================
-- DigitalPaani Maintenance Ops — Phase 2: photos + the review step
-- Run in Supabase → SQL Editor (after 32). No function redeploys needed.
--
-- THE LOOP
-- When a TECHNICIAN completes a work order it does not close: it becomes
-- 'submitted' and lands in the engineer's Review tab. The engineer either
-- approves (→ 'done') or sends it back with a note (→ 'returned'); the
-- technician fixes and resubmits. Engineers/admins completing their own
-- work skip all of this and close straight to 'done', exactly as today.
--
-- Crucially, submission NEVER holds the machine hostage: end_date is set
-- and the equipment returns to service at submission. The review loop is
-- bookkeeping on top — dashboards and overdue clocks never show a running
-- machine as down because paperwork is pending.
--
-- Photos ride along: a work order can require them (breakdowns always
-- do), technicians attach them at completion, and the engineer reviews
-- with the evidence in front of them.
-- ===================================================================

-- ---- 1. Review fields on the work order ----
alter table public.maintenance_logs add column if not exists photos_required boolean not null default false;
alter table public.maintenance_logs add column if not exists submitted_at timestamptz;
alter table public.maintenance_logs add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.maintenance_logs add column if not exists reviewed_at timestamptz;
alter table public.maintenance_logs add column if not exists review_note text;

-- ---- 2. Photo metadata ----
create table if not exists public.work_order_media (
  id          bigserial primary key,
  log_id      text not null references public.maintenance_logs(id) on delete cascade,
  path        text not null,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists wom_log_idx on public.work_order_media (log_id);
alter table public.work_order_media enable row level security;
revoke truncate, references, trigger on public.work_order_media from anon, authenticated;

drop policy if exists wom_read on public.work_order_media;
create policy wom_read on public.work_order_media for select to authenticated
  using (public.is_active());

-- Add photos: the assigned technician, or an engineer/admin with plant access.
drop policy if exists wom_insert on public.work_order_media;
create policy wom_insert on public.work_order_media for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.maintenance_logs l
      where l.id = log_id
        and ((public.my_role() = 'Technician' and l.assigned_to = auth.uid())
          or (coalesce(public.my_role(),'') not in ('Technician')
              and public.has_plant_access(
                (select e.plant_id from public.equipment e where e.id = l.equipment_id))))));

-- Remove: your own photo while the job is not yet approved; admins any time.
drop policy if exists wom_delete on public.work_order_media;
create policy wom_delete on public.work_order_media for delete to authenticated
  using (
    public.is_admin()
    or (uploaded_by = auth.uid() and exists (select 1 from public.maintenance_logs l
        where l.id = log_id and coalesce(l.wo_state,'') <> 'done')));

-- ---- 3. Storage bucket (private; the app uses short-lived signed URLs) ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wo-media', 'wo-media', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object paths are '<log id>/<file>' — the first folder ties every object
-- to its work order, and the policies lean on that.
drop policy if exists "wo media read" on storage.objects;
create policy "wo media read" on storage.objects for select to authenticated
  using (bucket_id = 'wo-media' and public.is_active());

drop policy if exists "wo media insert" on storage.objects;
create policy "wo media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'wo-media'
    and exists (select 1 from public.maintenance_logs l
      where l.id = (storage.foldername(name))[1]
        and ((public.my_role() = 'Technician' and l.assigned_to = auth.uid())
          or (coalesce(public.my_role(),'') not in ('Technician')
              and public.has_plant_access(
                (select e.plant_id from public.equipment e where e.id = l.equipment_id))))));

drop policy if exists "wo media delete" on storage.objects;
create policy "wo media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'wo-media' and (owner = auth.uid() or public.is_admin()));

-- ---- 4. Starting a work order can demand photos ----
create or replace function public.log_maintenance_start(
  p_id text, p_eq text, p_reason text, p_start date, p_etr date, p_tech text, p_notes text,
  p_priority text default 'Normal', p_part_id bigint default null, p_severity text default null,
  p_assigned uuid default null, p_photos boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_plant_access((select plant_id from public.equipment where id = p_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if coalesce(public.my_role(),'') = 'Technician' then
    raise exception 'Technicians complete work orders; engineers create them.';
  end if;
  if p_assigned is not null and not exists (
    select 1 from public.profiles
    where id = p_assigned and coalesce(status,'active') = 'active') then
    raise exception 'The assigned person''s account is not active.';
  end if;
  if exists (select 1 from public.maintenance_logs where equipment_id = p_eq and end_date is null) then
    raise exception 'This equipment already has an open work-order.';
  end if;
  insert into public.maintenance_logs
    (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority,
     affected_part_id, severity, assigned_to, assigned_by, photos_required)
  values (p_id, p_eq, p_reason, p_start, p_etr, p_tech, coalesce(p_notes,''), 'active',
          case when p_priority in ('Critical','High','Normal') then p_priority else 'Normal' end,
          p_part_id,
          case when p_severity in ('Minor','Major','Critical') then p_severity else null end,
          p_assigned, case when p_assigned is not null then auth.uid() end,
          -- Breakdowns always demand photographic evidence.
          coalesce(p_photos, false) or p_reason = 'Breakdown');
  update public.equipment
    set status = case when p_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = p_eq;
end;
$$;
drop function if exists public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text,uuid);
revoke all on function public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text,uuid,boolean) from public, anon;
grant execute on function public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text,uuid,boolean) to authenticated;

-- ---- 5. Completion: technicians submit, everyone else closes ----
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null,
  p_part_actions jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_assigned uuid; v_photos boolean; v_is_tech boolean; pa jsonb;
begin
  select equipment_id, assigned_to, photos_required into v_eq, v_assigned, v_photos
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

  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,''),
        wo_state = case when v_is_tech then 'submitted' else 'done' end,
        submitted_at = case when v_is_tech then now() end,
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

  -- The machine is back in service the moment the work is done — review is
  -- bookkeeping, never a reason to show a running machine as down.
  update public.equipment set status = 'Operational' where id = v_eq;
end;
$$;

-- ---- 6. The engineer's verdict ----
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
  if v_state <> 'submitted' then
    raise exception 'This work-order is not awaiting review.';
  end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then
    raise exception 'Say what needs fixing — the note is what the technician works from.';
  end if;
  update public.maintenance_logs
    set wo_state = case when p_approve then 'done' else 'returned' end,
        review_note = case when p_approve then null else trim(p_note) end,
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_log;
end;
$$;
revoke all on function public.review_work_order(text,boolean,text) from public, anon;
grant execute on function public.review_work_order(text,boolean,text) to authenticated;

-- ---- 7. The technician's fix ----
create or replace function public.resubmit_work_order(p_log text, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare v_assigned uuid; v_state text;
begin
  select assigned_to, coalesce(wo_state,'') into v_assigned, v_state
    from public.maintenance_logs where id = p_log;
  if v_assigned is null and v_state = '' then raise exception 'Work-order not found.'; end if;
  if v_assigned is distinct from auth.uid() then
    raise exception 'This work-order is not assigned to you.';
  end if;
  if v_state <> 'returned' then
    raise exception 'Only a returned work-order can be resubmitted.';
  end if;
  update public.maintenance_logs
    set completion_notes = coalesce(trim(p_notes), completion_notes),
        wo_state = 'submitted', submitted_at = now()
    where id = p_log;
end;
$$;
revoke all on function public.resubmit_work_order(text,text) from public, anon;
grant execute on function public.resubmit_work_order(text,text) to authenticated;

-- ---- 8. Verify: every row ok = 1 ----
select 'review columns' as what,
       (select count(*) = 5 from information_schema.columns
        where table_name = 'maintenance_logs'
          and column_name in ('photos_required','submitted_at','reviewed_by','reviewed_at','review_note'))::int as ok
union all
select 'media table', (select count(*) from information_schema.tables where table_name = 'work_order_media')
union all
select 'bucket', (select count(*) from storage.buckets where id = 'wo-media')
union all
select 'storage policies', (select count(*) = 3 from pg_policies
        where schemaname = 'storage' and policyname like 'wo media%')::int
union all
select 'review fn', (select count(*) from pg_proc where proname = 'review_work_order');
