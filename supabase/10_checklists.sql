-- ===================================================================
-- DigitalPaani Maintenance Ops — PPM checklists
-- Run in Supabase → SQL Editor.
-- Per-equipment-type checklist templates; results stored on each
-- completed work-order. Mandatory items must be ticked before closure.
-- ===================================================================

-- 1. Templates: one row per equipment type.
--    items: [{ "text": "...", "mandatory": true|false }, ...]
create table if not exists public.checklist_templates (
  eq_type    text primary key,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.checklist_templates enable row level security;
drop policy if exists ct_read  on public.checklist_templates;
drop policy if exists ct_write on public.checklist_templates;
create policy ct_read  on public.checklist_templates for select to authenticated using (true);
create policy ct_write on public.checklist_templates for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2. Results live on the work-order.
alter table public.maintenance_logs add column if not exists checklist jsonb;

-- 3. Sensible defaults per type (edit later from the app: Plants → PPM Checklists).
insert into public.checklist_templates (eq_type, items) values
  ('Pump', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Check for leaks at seals and glands","mandatory":true},
    {"text":"Grease bearings / check lubrication","mandatory":true},
    {"text":"Check vibration and abnormal noise","mandatory":true},
    {"text":"Verify coupling alignment","mandatory":false},
    {"text":"Clean strainer / impeller if accessible","mandatory":false},
    {"text":"Restore power and verify normal operation","mandatory":true}]'::jsonb),
  ('Blower', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Check oil level and top up if needed","mandatory":true},
    {"text":"Clean / replace intake air filter","mandatory":true},
    {"text":"Check belt tension and wear","mandatory":false},
    {"text":"Check vibration, temperature and noise","mandatory":true},
    {"text":"Restore power and verify airflow","mandatory":true}]'::jsonb),
  ('Motor', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Measure insulation resistance","mandatory":true},
    {"text":"Check terminal tightness and cable condition","mandatory":true},
    {"text":"Grease bearings","mandatory":false},
    {"text":"Verify current draw within rating after restart","mandatory":true}]'::jsonb),
  ('Mixer', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Check gearbox oil level","mandatory":true},
    {"text":"Inspect shaft seal and impeller","mandatory":true},
    {"text":"Check mounting bolts and vibration","mandatory":false},
    {"text":"Restore power and verify rotation","mandatory":true}]'::jsonb),
  ('Screen', '[
    {"text":"Isolate equipment before working","mandatory":true},
    {"text":"Clean mesh / bars of debris","mandatory":true},
    {"text":"Check rake / drive mechanism movement","mandatory":true},
    {"text":"Inspect for corrosion or damage","mandatory":false}]'::jsonb),
  ('Filter', '[
    {"text":"Perform backwash and record duration","mandatory":true},
    {"text":"Check differential pressure within limits","mandatory":true},
    {"text":"Inspect media condition / top up if low","mandatory":false},
    {"text":"Check valves and pipework for leaks","mandatory":true}]'::jsonb),
  ('Centrifuge', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Clean bowl and scroll","mandatory":true},
    {"text":"Check vibration and bearing temperature","mandatory":true},
    {"text":"Inspect wear liners","mandatory":false},
    {"text":"Restore and verify normal operation","mandatory":true}]'::jsonb),
  ('UV System', '[
    {"text":"Isolate power before opening chamber","mandatory":true},
    {"text":"Clean quartz sleeves","mandatory":true},
    {"text":"Check lamp hours / intensity, replace if due","mandatory":true},
    {"text":"Verify alarms and restore operation","mandatory":true}]'::jsonb),
  ('Screw Press', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Inspect screw and screen wear","mandatory":true},
    {"text":"Lubricate drive and bearings","mandatory":true},
    {"text":"Check polymer dosing line","mandatory":false},
    {"text":"Restore and verify cake dryness","mandatory":false}]'::jsonb),
  ('Fan', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Clean impeller and housing","mandatory":true},
    {"text":"Check belt / coupling and bearings","mandatory":true},
    {"text":"Restore power and verify airflow","mandatory":true}]'::jsonb),
  ('Decanter', '[
    {"text":"Isolate power and lock out before starting","mandatory":true},
    {"text":"Clean bowl and check scroll wear","mandatory":true},
    {"text":"Check vibration and bearing temperature","mandatory":true},
    {"text":"Restore and verify normal operation","mandatory":true}]'::jsonb),
  ('Other', '[
    {"text":"Isolate equipment safely before working","mandatory":true},
    {"text":"Perform scheduled service as per manual","mandatory":true},
    {"text":"Restore and verify normal operation","mandatory":true}]'::jsonb)
on conflict (eq_type) do nothing;

-- 4. Completion RPC now stores the checklist results.
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text;
begin
  select equipment_id into v_eq from public.maintenance_logs where id = p_log;
  if v_eq is null then raise exception 'Work-order not found.'; end if;
  if not public.has_plant_access((select plant_id from public.equipment where id = v_eq)) then
    raise exception 'No access to this equipment''s plant.';
  end if;
  update public.maintenance_logs
    set end_date = p_end, completion_notes = coalesce(p_notes,''), wo_state = 'done',
        checklist = p_checklist
    where id = p_log;
  update public.equipment set status = 'Operational' where id = v_eq;
end;
$$;
drop function if exists public.log_maintenance_complete(text, date, text);
