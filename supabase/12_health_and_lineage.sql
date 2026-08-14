-- ===================================================================
-- DigitalPaani Maintenance Ops — Health score foundation + valve lineage
-- Run in Supabase → SQL Editor (after 11).
-- ===================================================================

-- ---- 1. Equipment: expected life, lineage, retirement ----
alter table public.equipment add column if not exists expected_life_years integer;
alter table public.equipment add column if not exists lineage_id text;
alter table public.equipment add column if not exists retired_at date;
alter table public.equipment add column if not exists replaced_by text;

-- Every equipment is its own lineage root until replaced.
update public.equipment set lineage_id = id where lineage_id is null;

-- Allow the 'Retired' status.
alter table public.equipment drop constraint if exists equipment_status_check;
alter table public.equipment add constraint equipment_status_check
  check (status in ('Operational','In Maintenance','Broken Down','Retired'));

-- ---- 2. Work-orders: affected part (BOM-weighted score) + severity fallback ----
alter table public.maintenance_logs add column if not exists affected_part_id bigint
  references public.equipment_parts(id) on delete set null;
alter table public.maintenance_logs add column if not exists severity text
  check (severity is null or severity in ('Minor','Major','Critical'));

-- ---- 3. Per-type expected service life defaults (fallback chain:
--      equipment.expected_life_years -> type_config -> 10 years) ----
create table if not exists public.type_config (
  eq_type             text primary key,
  expected_life_years integer not null default 10
);
alter table public.type_config enable row level security;
drop policy if exists tc_read  on public.type_config;
drop policy if exists tc_write on public.type_config;
create policy tc_read  on public.type_config for select to authenticated using (true);
create policy tc_write on public.type_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.type_config (eq_type, expected_life_years) values
  ('Pump',10),('Blower',12),('Motor',12),('Mixer',10),('Screen',15),('Filter',12),
  ('Centrifuge',12),('UV System',8),('Screw Press',12),('Decanter',12),('Fan',10),
  ('Valve',5),('NRV',5),('Other',10)
on conflict (eq_type) do nothing;

-- ---- 4. Maintenance start RPC now records affected part / severity ----
create or replace function public.log_maintenance_start(
  p_id text, p_eq text, p_reason text, p_start date, p_etr date, p_tech text, p_notes text,
  p_priority text default 'Normal', p_part_id bigint default null, p_severity text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_plant_access((select plant_id from public.equipment where id = p_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  if exists (select 1 from public.maintenance_logs where equipment_id = p_eq and end_date is null) then
    raise exception 'This equipment already has an open work-order.';
  end if;
  insert into public.maintenance_logs
    (id, equipment_id, reason, start_date, etr, technician, notes, wo_state, priority, affected_part_id, severity)
  values (p_id, p_eq, p_reason, p_start, p_etr, p_tech, coalesce(p_notes,''), 'active',
          case when p_priority in ('Critical','High','Normal') then p_priority else 'Normal' end,
          p_part_id,
          case when p_severity in ('Minor','Major','Critical') then p_severity else null end);
  update public.equipment
    set status = case when p_reason = 'Breakdown' then 'Broken Down' else 'In Maintenance' end
    where id = p_eq;
end;
$$;
drop function if exists public.log_maintenance_start(text,text,text,date,date,text,text,text);
revoke all on function public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text) from public, anon;
grant execute on function public.log_maintenance_start(text,text,text,date,date,text,text,text,bigint,text) to authenticated;

-- ---- 5. Valve replacement: retire old (tag preserved in history),
--      create successor with a NEW tag, same lineage/position. ----
create or replace function public.replace_valve(
  p_old text, p_new_id text, p_new_tag text, p_make text, p_model text,
  p_installed date, p_notes text
) returns void language plpgsql security definer set search_path = public as $$
declare old_row public.equipment%rowtype;
begin
  select * into old_row from public.equipment where id = p_old;
  if old_row.id is null then raise exception 'Equipment not found.'; end if;
  if old_row.type not in ('Valve','NRV') then raise exception 'Replace is only for valves / NRVs.'; end if;
  if old_row.status = 'Retired' then raise exception 'This valve is already retired.'; end if;
  if not public.has_plant_access(old_row.plant_id) then
    raise exception 'No access to this equipment''s plant.';
  end if;

  -- Record the failure/replacement on the OLD valve's history (closed immediately).
  insert into public.maintenance_logs
    (id, equipment_id, reason, start_date, etr, end_date, technician, notes, completion_notes, wo_state, severity)
  values ('L-REPL-' || p_old || '-' || to_char(now(),'YYYYMMDDHH24MISS'),
          p_old, 'Breakdown', coalesce(p_installed, current_date), null, coalesce(p_installed, current_date),
          coalesce((select name from public.profiles where id = auth.uid()), ''),
          coalesce(p_notes, 'Valve replaced.'), 'Replaced with ' || p_new_tag || '.', 'done', 'Critical');

  -- Close any other open work-order on the old valve.
  update public.maintenance_logs set end_date = current_date, wo_state = 'done',
    completion_notes = coalesce(nullif(completion_notes,''),'Closed on valve replacement.')
    where equipment_id = p_old and end_date is null;

  -- New generation inherits the position (lineage, plant, location, PPM slot).
  insert into public.equipment (id, tag, type, make, model, plant_id, location, installed, status, slot, lineage_id)
  values (p_new_id, p_new_tag, old_row.type, coalesce(p_make,''), coalesce(p_model,''),
          old_row.plant_id, old_row.location, coalesce(p_installed, current_date),
          'Operational', old_row.slot, coalesce(old_row.lineage_id, old_row.id));

  -- Retire the old valve; its tag stays on the record for history.
  update public.equipment
    set status = 'Retired', retired_at = coalesce(p_installed, current_date), replaced_by = p_new_id, slot = null
    where id = p_old;
end;
$$;
revoke all on function public.replace_valve(text,text,text,text,text,date,text) from public, anon;
grant execute on function public.replace_valve(text,text,text,text,text,date,text) to authenticated;

-- ---- 6. Verify ----
select
  (select count(*) from public.type_config) as type_defaults,
  (select count(*) from information_schema.columns
     where table_name='equipment' and column_name in ('expected_life_years','lineage_id','retired_at','replaced_by')) as new_eq_cols;
