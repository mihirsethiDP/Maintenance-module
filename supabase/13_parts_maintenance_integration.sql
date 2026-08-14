-- ===================================================================
-- DigitalPaani Maintenance Ops — integrate parts with maintenance
-- Run in Supabase → SQL Editor (after 12).
--
-- Maintenance of an equipment = maintaining its parts. Every completed
-- work-order now records, per part: serviced or replaced. That updates
-- each part's service history and feeds the health score.
-- ===================================================================

-- ---- 1. Per-part service history (denormalized for fast display) ----
alter table public.equipment_parts add column if not exists last_serviced date;
alter table public.equipment_parts add column if not exists last_replaced date;

-- ---- 2. What each work-order did to each part ----
create table if not exists public.maintenance_log_parts (
  log_id    text   not null references public.maintenance_logs(id) on delete cascade,
  part_id   bigint references public.equipment_parts(id) on delete set null,
  part_name text   not null,                    -- snapshot: history survives BOM edits
  action    text   not null check (action in ('serviced','replaced')),
  primary key (log_id, part_name)
);
create index if not exists mlp_part_idx on public.maintenance_log_parts(part_id);

alter table public.maintenance_log_parts enable row level security;
drop policy if exists mlp_read  on public.maintenance_log_parts;
drop policy if exists mlp_write on public.maintenance_log_parts;
create policy mlp_read on public.maintenance_log_parts for select to authenticated
  using (public.has_plant_access(
    (select e.plant_id from public.maintenance_logs l
       join public.equipment e on e.id = l.equipment_id
     where l.id = log_id)));
-- Writes happen only through the completion RPC (security definer) — no direct policy needed,
-- but allow admin corrections:
create policy mlp_write on public.maintenance_log_parts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- 3. Completion RPC: one transaction — close the work-order, record the
--      part actions, stamp each part's last_serviced / last_replaced. ----
create or replace function public.log_maintenance_complete(
  p_log text, p_end date, p_notes text, p_checklist jsonb default null,
  p_part_actions jsonb default null   -- [{"part_id":11,"name":"Motor","action":"replaced"}, ...]
) returns void language plpgsql security definer set search_path = public as $$
declare v_eq text; pa jsonb;
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

  update public.equipment set status = 'Operational' where id = v_eq;
end;
$$;
drop function if exists public.log_maintenance_complete(text, date, text, jsonb);
drop function if exists public.log_maintenance_complete(text, date, text);

-- ---- 4. Verify ----
select
  (select count(*) from information_schema.tables where table_name = 'maintenance_log_parts') as junction_table,
  (select count(*) from information_schema.columns
     where table_name = 'equipment_parts' and column_name in ('last_serviced','last_replaced')) as part_history_cols;
