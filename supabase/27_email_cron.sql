-- ===================================================================
-- DigitalPaani Maintenance Ops — daily email digest schedule
-- Run in Supabase → SQL Editor (after 26).
--
-- BEFORE running:
--   1. supabase functions deploy send-notifications
--   2. Secrets (Edge Functions → Secrets):
--        SENDGRID_API_KEY = SG....
--        MAIL_FROM        = DigitalPaani Maintenance (do not reply) <verified@address>
--        CRON_SECRET      = <long random string>
--   3. Dashboard → Edge Functions → send-notifications → Settings:
--        turn OFF "Verify JWT" .
--      Why: the scheduler would otherwise have to carry a 208-character
--      anon JWT inside this SQL, and a single stray newline in that paste
--      makes the gateway reject every run with INVALID_JWT_FORMAT before
--      the function is even reached. With it off, the only credential is
--      x-cron-key below — short, and safe to paste.
--      This does NOT open the function up: without a matching cron key it
--      falls through to a signed-in-admin check and returns 401, and the
--      app's own calls keep working (they send a real user token, which
--      the function validates itself).
--   4. Replace PASTE_CRON_SECRET_HERE below with the SAME string as step 2.
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
      'Content-Type', 'application/json',
      'x-cron-key',   'PASTE_CRON_SECRET_HERE'
    ),
    body    := '{"mode":"digest"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ---- Verify the schedule ----
select jobname, schedule, active from cron.job order by jobname;

-- ---- Prove it end to end, without waiting for 07:00 ----
-- Run these two separately. The first returns a request id; the second shows
-- what the function answered. Expect status_code 200 and a body containing
-- "sent" — 0 sent is correct on a day with nothing outstanding.
--
--   select net.http_post(
--     url     := 'https://agkdhkolqisulbgwzktt.supabase.co/functions/v1/send-notifications',
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-key','PASTE_CRON_SECRET_HERE'),
--     body    := '{"mode":"digest"}'::jsonb);
--
--   select id, status_code, content::text, error_msg
--   from net._http_response order by id desc limit 3;
