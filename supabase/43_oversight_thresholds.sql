-- ===================================================================
-- DigitalPaani Maintenance Ops — oversight clocks become a setting
-- Run in Supabase → SQL Editor (after 42). Then redeploy send-notifications.
--
-- The four ageing thresholds (unreviewed work, sent-back work, untriaged
-- issues, outstanding client signatures) were constants invented by the
-- developer. They define "late" for the team in front of the person
-- holding it accountable, so they belong to that person: stored PER
-- ADMIN, because two admins may legitimately disagree about what late
-- means, and a future customer's admin certainly will.
--
-- Engineers/technicians have no use for the column; the guard trigger
-- already stops nobody from writing junk to their own row, and the
-- reader applies defaults + sanity clamps, so no constraint is needed
-- beyond valid json.
-- ===================================================================

alter table public.profiles add column if not exists oversight_thresholds jsonb;

-- Verify
select count(*) as has_column from information_schema.columns
where table_name = 'profiles' and column_name = 'oversight_thresholds';
