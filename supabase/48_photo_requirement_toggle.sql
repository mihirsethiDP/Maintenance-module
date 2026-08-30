-- ===================================================================
-- DigitalPaani Maintenance Ops — the photo requirement can be changed
-- Run in Supabase → SQL Editor (after 47). No function redeploys.
--
-- photos_required was fixed at creation. When a technician genuinely
-- cannot photograph — camera broken, a dark wet pit, a safety rule —
-- the engineer's only way out was completing the job themselves.
--
-- Engineers and admins can now change the requirement on an OPEN job.
-- Never the technician: waiving your own requirement is not
-- accountability. And a waiver is never silent: who removed it and when
-- is stored, and the review card says so — the reviewer approves a
-- photo-less job knowing it was a decision, not an oversight.
-- ===================================================================

alter table public.maintenance_logs add column if not exists photos_waived_by uuid references auth.users(id) on delete set null;
alter table public.maintenance_logs add column if not exists photos_waived_at timestamptz;

create or replace function public.set_photo_requirement(p_log text, p_required boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; v_end date;
begin
  if coalesce(public.my_role(),'') not in ('Engineer','Admin','Superadmin') then
    raise exception 'Only engineers and admins change the photo requirement.';
  end if;
  select equipment_id, end_date into v_eq, v_end
    from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if v_end is not null then
    raise exception 'This job is already finished — the requirement no longer applies.';
  end if;
  update public.maintenance_logs
    set photos_required = p_required,
        -- Removing the requirement is recorded; restoring it clears the record.
        photos_waived_by = case when p_required then null else auth.uid() end,
        photos_waived_at = case when p_required then null else now() end
    where id = p_log;
end;
$$;
revoke all on function public.set_photo_requirement(text,boolean) from public, anon;
grant execute on function public.set_photo_requirement(text,boolean) to authenticated;

-- ---- Verify ----
select
  (select count(*) from information_schema.columns
   where table_name = 'maintenance_logs'
     and column_name in ('photos_waived_by','photos_waived_at')) as waiver_columns,
  (select count(*) from pg_proc where proname = 'set_photo_requirement') as toggle_fn;
