-- ===================================================================
-- DigitalPaani Maintenance Ops — daily AI research budget
-- Run in Supabase → SQL Editor (after 18).
--
-- One row per day counts how many AI research calls were made
-- (background queue + manual Auto-fill). The app stops researching
-- when today's count reaches its built-in limit (RESEARCH_DAILY_LIMIT
-- in app.js, default 50 calls ≈ ₹300–500/day) and resumes
-- automatically tomorrow. Queued equipment is never lost — it waits.
-- A 1,000-equipment upload therefore spreads over ~20 days instead of
-- burning the key in one afternoon.
-- ===================================================================

create table if not exists public.research_usage (
  day   text primary key,          -- e.g. '2026-08-20'
  calls integer not null default 0
);

alter table public.research_usage enable row level security;
drop policy if exists usage_read  on public.research_usage;
drop policy if exists usage_write on public.research_usage;
-- Everyone signed in may read (the import screen shows the remaining budget);
-- only admins write (research itself is admin-only).
create policy usage_read  on public.research_usage for select to authenticated using (true);
create policy usage_write on public.research_usage for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- Verify ----
select count(*) as usage_table from information_schema.tables where table_name = 'research_usage';
