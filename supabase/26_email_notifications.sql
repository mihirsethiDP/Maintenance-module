-- ===================================================================
-- DigitalPaani Maintenance Ops — email notifications
-- Run in Supabase → SQL Editor (after 25). Then:
--     supabase functions deploy send-notifications
--     supabase secrets set SENDGRID_API_KEY=SG....
--     supabase secrets set MAIL_FROM="DigitalPaani Maintenance (do not reply) <support@ecoinnovision.com>"
--        ^ must be a SendGrid VERIFIED SENDER; anything else gets a 403.
--     supabase secrets set CRON_SECRET=<long random string>   (if not already set)
-- ...then run 27_email_cron.sql to schedule the daily digest.
--
-- DESIGN: one DAILY DIGEST per person, not one email per event.
-- 670 PPM work-orders are generated per month, 262 of them on the 4th
-- alone -- per-event mail would be ~1,300/month with a 262-email burst
-- nobody would read. A digest is 1 email per person per day, and days
-- with nothing to report send nothing at all.
--
-- Breakdowns are the exception: they mail immediately, because a
-- machine that has stopped cannot wait for tomorrow's digest.
-- ===================================================================

-- ---- 1. Per-person preferences ----
alter table public.profiles add column if not exists email_digest  boolean not null default true;
alter table public.profiles add column if not exists email_urgent  boolean not null default true;

-- ---- 2. Send log: dedupe, audit, and volume tracking ----
create table if not exists public.email_log (
  id         bigserial primary key,
  sent_on    date        not null default (now() at time zone 'Asia/Kolkata')::date,
  kind       text        not null,          -- 'digest' | 'urgent:<log id>'
  user_id    uuid        references auth.users(id) on delete set null,
  email      text        not null,
  subject    text,
  status     text        not null default 'sent',   -- sent | failed | skipped
  detail     text,
  created_at timestamptz not null default now()
);
-- One digest per person per day, one urgent mail per person per event.
create unique index if not exists email_log_once
  on public.email_log (sent_on, kind, user_id);
create index if not exists email_log_month_idx on public.email_log (sent_on);

alter table public.email_log enable row level security;
drop policy if exists email_log_read on public.email_log;
-- Admins can see what was sent (and how much). Writes happen only through
-- the Edge Function with the service key.
create policy email_log_read on public.email_log for select to authenticated
  using (public.is_admin());

-- ---- 3. Volume so far this month (run any time to check spend) ----
select
  to_char(sent_on, 'YYYY-MM')                as month,
  count(*)                                   as emails,
  count(*) filter (where kind = 'digest')    as digests,
  count(*) filter (where kind like 'urgent%') as urgent,
  count(*) filter (where status = 'failed')  as failed
from public.email_log
group by 1 order by 1 desc;
