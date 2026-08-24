-- ===================================================================
-- DigitalPaani Maintenance Ops — daily email digest schedule
-- Run in Supabase → SQL Editor (after 26).
--
-- BEFORE running:
--   1. supabase functions deploy send-notifications
--   2. supabase secrets set SENDGRID_API_KEY=SG....
--      supabase secrets set MAIL_FROM="DigitalPaani Maintenance <maintenance@digitalpaani.com>"
--      supabase secrets set CRON_SECRET=<long random string>
--   3. Replace PASTE_CRON_SECRET_HERE below with the SAME string.
--
-- Fires at 01:30 UTC = 07:00 IST, after the 06:00 IST PPM work-order
-- generation, so the morning digest already includes the day's new tasks.
-- ===================================================================

create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-email-digest') then
    perform cron.unschedule('daily-email-digest');
  end if;
end $$;

select cron.schedule(
  'daily-email-digest',
  '30 1 * * *',
  $$
  select net.http_post(
    url     := 'https://agkdhkolqisulbgwzktt.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2Roa29scWlzdWxiZ3d6a3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODk4ODcsImV4cCI6MjA5OTg2NTg4N30.sYb9SVHpv6gTRQdVNdeKLST6kjjW7lbAn3liBIO21Uk',
      'x-cron-key',    'PASTE_CRON_SECRET_HERE'
    ),
    body    := '{"mode":"digest"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ---- Verify ----
select jobname, schedule, active from cron.job order by jobname;
