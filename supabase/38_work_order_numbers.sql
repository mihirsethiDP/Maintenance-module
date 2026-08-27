-- ===================================================================
-- DigitalPaani Maintenance Ops — human-readable work-order numbers
-- Run in Supabase → SQL Editor (after 37).
--
-- Work orders had only their internal id (L-1787583471334, a raw
-- millisecond timestamp) — unusable as a reference: nobody reads that
-- over a phone, and it is about to appear on client-signed reports.
--
-- Format: WO-2026-0147 — year, then a gapless per-year sequence.
-- Assigned by a BEFORE INSERT trigger, so every path gets one: the
-- start RPC, the nightly PPM generator (09), and anything added later.
--
-- NOT backfilled, by decision: the ~700 historical work orders keep a
-- blank number and the app simply shows nothing for them.
-- ===================================================================

-- ---- 1. The number ----
alter table public.maintenance_logs add column if not exists wo_no text;
create unique index if not exists logs_wo_no_uniq on public.maintenance_logs (wo_no)
  where wo_no is not null;

-- Per-year counter. A row-level upsert is atomic, so two concurrent
-- work orders can never take the same number.
create table if not exists public.wo_counters (
  year    int primary key,
  last_no int not null default 0
);
alter table public.wo_counters enable row level security;
revoke all on public.wo_counters from anon, authenticated;   -- server-side only

create or replace function public.next_wo_no()
returns text language plpgsql security definer set search_path = public as $$
declare
  -- IST, so a work order created at 01:00 on 1 January belongs to the new
  -- year the way the people using it would say it does.
  y int := extract(year from (now() at time zone 'Asia/Kolkata'))::int;
  n int;
begin
  insert into public.wo_counters (year, last_no) values (y, 1)
    on conflict (year) do update set last_no = public.wo_counters.last_no + 1
    returning last_no into n;
  return 'WO-' || y::text || '-' || lpad(n::text, 4, '0');
end;
$$;
revoke all on function public.next_wo_no() from public, anon, authenticated;

-- ---- 2. Assign on insert, whatever created the row ----
create or replace function public.assign_wo_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.wo_no is null then
    new.wo_no := public.next_wo_no();
  end if;
  return new;
end;
$$;
drop trigger if exists assign_wo_no on public.maintenance_logs;
create trigger assign_wo_no
  before insert on public.maintenance_logs
  for each row execute function public.assign_wo_no();

-- ---- 3. Verify ----
-- The counter starts empty; the next work order created in the app takes
-- WO-<this year>-0001. Existing rows stay blank, as decided.
select
  (select count(*) from information_schema.columns
   where table_name = 'maintenance_logs' and column_name = 'wo_no') as has_column,
  (select count(*) from pg_trigger where tgname = 'assign_wo_no') as has_trigger,
  (select count(*) from public.maintenance_logs where wo_no is not null) as numbered_so_far,
  (select count(*) from public.maintenance_logs) as total_work_orders;
