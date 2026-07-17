-- ===================================================================
-- DigitalPaani Maintenance Ops — Phase 2: Data tables + RLS
-- Run AFTER 01_auth_profiles.sql. Paste into Supabase → SQL Editor → Run.
-- ===================================================================

-- ---------- Tables ----------
create table if not exists public.plants (
  id            text primary key,          -- e.g. 'PL-01'
  name          text not null,
  location      text default '',
  notifications jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.equipment (
  id         text primary key,             -- e.g. 'PL-01-E001'
  tag        text not null,
  type       text not null,
  make       text default '',
  model      text default '',
  plant_id   text not null references public.plants(id) on delete cascade,
  location   text default '',
  installed  date,
  status     text not null default 'Operational'
             check (status in ('Operational','In Maintenance','Broken Down')),
  slot       text,                          -- PPM slot: W1..W4 / weekly / null
  created_at timestamptz not null default now()
);
create index if not exists equipment_plant_idx on public.equipment(plant_id);

create table if not exists public.maintenance_logs (
  id               text primary key,
  equipment_id     text not null references public.equipment(id) on delete cascade,
  reason           text not null,           -- 'Scheduled' | 'Breakdown'
  start_date       date not null,
  etr              date,
  end_date         date,                    -- null = open work-order
  technician       text,
  notes            text default '',
  completion_notes text default '',
  created_at       timestamptz not null default now()
);
create index if not exists logs_equipment_idx on public.maintenance_logs(equipment_id);
create index if not exists logs_open_idx on public.maintenance_logs(end_date) where end_date is null;

create table if not exists public.notifications (
  id           text primary key,
  ts           timestamptz not null default now(),
  event        text not null,               -- maintenance|breakdown|operational|overdue
  plant_id     text references public.plants(id) on delete cascade,
  equipment_id text references public.equipment(id) on delete cascade,
  channels     jsonb not null default '[]'::jsonb,
  recipients   jsonb not null default '[]'::jsonb,
  message      text,
  read         boolean not null default false
);

-- ---------- Row-Level Security ----------
-- Reference data (plants, equipment) is readable by everyone signed in,
-- writable only by Admins. Maintenance logs are writable by any signed-in
-- user (engineers perform the work); deletes are Admin-only.

alter table public.plants           enable row level security;
alter table public.equipment        enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.notifications    enable row level security;

-- plants
drop policy if exists plants_read       on public.plants;
drop policy if exists plants_admin_write on public.plants;
create policy plants_read        on public.plants for select to authenticated using (true);
create policy plants_admin_write on public.plants for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- equipment
drop policy if exists equipment_read        on public.equipment;
drop policy if exists equipment_admin_write on public.equipment;
create policy equipment_read        on public.equipment for select to authenticated using (true);
create policy equipment_admin_write on public.equipment for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- maintenance_logs
drop policy if exists logs_read          on public.maintenance_logs;
drop policy if exists logs_write         on public.maintenance_logs;
drop policy if exists logs_update        on public.maintenance_logs;
drop policy if exists logs_admin_delete  on public.maintenance_logs;
create policy logs_read         on public.maintenance_logs for select to authenticated using (true);
create policy logs_write        on public.maintenance_logs for insert to authenticated with check (true);
create policy logs_update       on public.maintenance_logs for update to authenticated using (true) with check (true);
create policy logs_admin_delete on public.maintenance_logs for delete to authenticated using (public.is_admin());

-- notifications
drop policy if exists notif_read   on public.notifications;
drop policy if exists notif_write  on public.notifications;
drop policy if exists notif_update on public.notifications;
create policy notif_read   on public.notifications for select to authenticated using (true);
create policy notif_write  on public.notifications for insert to authenticated with check (true);
create policy notif_update on public.notifications for update to authenticated using (true) with check (true);
