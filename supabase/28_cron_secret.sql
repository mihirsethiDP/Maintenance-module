-- ===================================================================
-- DigitalPaani Maintenance Ops — one home for the cron secret
-- Run in Supabase → SQL Editor (after 27). Supersedes 27's schedule.
--
-- WHY THIS EXISTS
-- 27 pasted the secret straight into the cron command, and repeated the
-- placeholder in its own test block. The test got the real secret, the
-- scheduled job kept the placeholder, and the digest returned
-- 401 "missing authorization" every morning while the test said 200.
--
-- Now the secret lives in one row. The job reads it, the test executes
-- the job's own stored command, and there is nothing left to paste twice.
--
-- YOU EDIT EXACTLY ONE LINE: the value on line marked <<< EDIT below.
-- It must match the CRON_SECRET secret set on the Edge Function.
-- ===================================================================

create extension if not exists pg_net;

-- ---- 1. Private config. Not reachable from the app. ----
create table if not exists public.private_config (
  key   text primary key,
  value text not null
);
-- RLS on with NO policies: anon and authenticated get nothing, ever.
-- The table owner (postgres, which is what pg_cron runs the job as) still
-- reads it, which is the only access this needs.
alter table public.private_config enable row level security;
revoke all on public.private_config from anon, authenticated;

-- ---- 2. The one line you edit ----
insert into public.private_config (key, value)
values ('cron_secret', 'PASTE_CRON_SECRET_HERE')          -- <<< EDIT
on conflict (key) do update set value = excluded.value;

-- ---- 3. Re-schedule, reading the secret instead of embedding it ----
do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-email-digest') then
    perform cron.unschedule('daily-email-digest');
  end if;
end $$;

select cron.schedule(
  'daily-email-digest',
  '30 1 * * *',                                  -- 01:30 UTC = 07:00 IST
  $$
  select net.http_post(
    url     := 'https://agkdhkolqisulbgwzktt.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key',   (select value from public.private_config where key = 'cron_secret')
    ),
    body    := '{"mode":"digest"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ---- 4. Guard: the placeholder must never survive ----
do $$
begin
  if exists (select 1 from public.private_config
             where key = 'cron_secret' and value = 'PASTE_CRON_SECRET_HERE') then
    raise exception 'Replace PASTE_CRON_SECRET_HERE on the <<< EDIT line with your real CRON_SECRET, then run this file again.';
  end if;
end $$;

select jobname, schedule, active from cron.job where jobname = 'daily-email-digest';

-- ---- 5. Test THE JOB, not a copy of it ----
-- Run this block, wait a few seconds, then the select below it.
-- Expect status_code 200. A 401 means the value above does not match the
-- CRON_SECRET on the Edge Function.
--
--   do $$
--   declare c text;
--   begin
--     select command into c from cron.job where jobname = 'daily-email-digest';
--     execute c;
--   end $$;
--
--   select id, status_code, content::text from net._http_response order by id desc limit 3;
