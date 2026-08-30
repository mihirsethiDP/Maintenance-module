-- ===================================================================
-- DigitalPaani Maintenance Ops — make offline replays harmless
-- Run in Supabase → SQL Editor (after 44).
--
-- The app is gaining an offline outbox: a technician in a signal-dead
-- plant can complete jobs and report issues, and the device sends them
-- when the connection returns. Sending can be interrupted and retried,
-- so every replayed write must land exactly once:
--
--   * work_order_media.path gets a UNIQUE index. The outbox uses
--     deterministic paths (outbox-item id + index), so a retry that
--     re-inserts the same photo record conflicts instead of duplicating,
--     and the client upserts with ignoreDuplicates.
--   * wo_issues gains client_key: a device-generated id. A retried issue
--     insert with the same key is dropped by ON CONFLICT instead of
--     filing the same problem twice.
--
-- Existing rows: media paths are already unique in practice (timestamped
-- names), and client_key is NULL for everything raised online, which the
-- unique index ignores.
-- ===================================================================

create unique index if not exists wom_path_uniq on public.work_order_media (path);

alter table public.wo_issues add column if not exists client_key text;
create unique index if not exists issues_client_key_uniq
  on public.wo_issues (client_key) where client_key is not null;

-- Verify
select
  (select count(*) from pg_indexes where indexname = 'wom_path_uniq') as media_unique,
  (select count(*) from pg_indexes where indexname = 'issues_client_key_uniq') as issue_key_unique,
  (select count(*) from information_schema.columns
    where table_name = 'wo_issues' and column_name = 'client_key') as client_key_column;
