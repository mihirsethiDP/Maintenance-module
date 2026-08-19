-- ===================================================================
-- DigitalPaani Maintenance Ops — technician registry
-- Run in Supabase → SQL Editor (after 14).
--
-- Technicians named on work-orders become records, not throwaway text:
-- the maintenance form suggests existing technicians, new names are
-- saved automatically on submit, and admins manage the list on Team.
-- Names on past logs are snapshots — removing a technician never
-- rewrites history.
-- ===================================================================

create table if not exists public.technicians (
  id         bigserial primary key,
  name       text not null,
  phone      text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
-- One record per name, case-insensitively ("ravi" = "Ravi").
create unique index if not exists technicians_name_uniq
  on public.technicians (lower(trim(name)));

alter table public.technicians enable row level security;
drop policy if exists tech_read   on public.technicians;
drop policy if exists tech_insert on public.technicians;
drop policy if exists tech_update on public.technicians;
drop policy if exists tech_delete on public.technicians;
-- Everyone signed in can read and add (engineers record new technicians
-- while logging maintenance); only admins can edit or remove.
create policy tech_read   on public.technicians for select to authenticated using (true);
create policy tech_insert on public.technicians for insert to authenticated with check (true);
create policy tech_update on public.technicians for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tech_delete on public.technicians for delete to authenticated
  using (public.is_admin());

-- Backfill: every technician already named on a work-order becomes a record.
insert into public.technicians (name)
select distinct on (lower(trim(technician))) trim(technician)
from public.maintenance_logs
where coalesce(trim(technician), '') <> ''
on conflict ((lower(trim(name)))) do nothing;

-- ---- Verify ----
select
  (select count(*) from information_schema.tables where table_name = 'technicians') as tech_table,
  (select count(*) from public.technicians) as technicians_on_record;
