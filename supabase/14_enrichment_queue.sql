-- ===================================================================
-- DigitalPaani Maintenance Ops — background parts-research queue
-- Run in Supabase → SQL Editor (after 13).
--
-- PPM imports create many equipment at once. Instead of forcing the
-- admin to enrich each one by hand, every imported (non-valve)
-- equipment is enqueued here. A background runner in the app works
-- through the queue (make/model → datasheet → draft parts list),
-- and admins get one notification when the run completes, plus a
-- Review workspace to approve drafts / resolve variants / fill in
-- missing make & model. Admin-only end to end.
-- ===================================================================

create table if not exists public.enrichment_queue (
  id           bigserial primary key,
  equipment_id text not null references public.equipment(id) on delete cascade,
  status       text not null default 'pending' check (status in
                 ('needs_info','pending','running','ambiguous','ready','done','failed','skipped')),
  variant      text,          -- variant chosen by the admin when disambiguating
  variants     jsonb,         -- options returned when the search was ambiguous
  draft        jsonb,         -- {parts:[...], power, expected_life_years, sources} awaiting approval
  error        text,
  batch_id     text,          -- groups one import run
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (equipment_id)
);
create index if not exists eq_queue_status_idx on public.enrichment_queue(status);

alter table public.enrichment_queue enable row level security;
drop policy if exists queue_admin_all on public.enrichment_queue;
create policy queue_admin_all on public.enrichment_queue for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- Verify ----
select
  (select count(*) from information_schema.tables where table_name = 'enrichment_queue') as queue_table;
