-- ===================================================================
-- DigitalPaani Maintenance Ops — make the daily AI budget unforgeable
-- Run in Supabase → SQL Editor (after 28).
--
-- THE HOLE
-- 19 gave admins full write access to research_usage:
--     create policy usage_write ... using (is_admin()) with check (is_admin())
-- and 22 then made consume_research_call() the authority on spending.
-- But an admin could still UPDATE that row directly -- set calls back to 0
-- from the browser console -- and every subsequent budget check would pass.
-- The cap that exists to stop a 1000-equipment sheet burning the API key was
-- therefore advisory, enforced only against admins who did not look for it.
--
-- THE FIX
-- No client writes the counter at all. consume_research_call() is SECURITY
-- DEFINER, so it keeps working: it runs as the owner and bypasses RLS. The
-- app still reads the row to show "N calls left today".
-- ===================================================================

-- ---- 1. Remove client write access entirely ----
drop policy if exists usage_write on public.research_usage;
-- Reads stay: the import screen shows the remaining budget.
drop policy if exists usage_read on public.research_usage;
create policy usage_read on public.research_usage for select to authenticated
  using (public.is_active());

-- Belt and braces: even with no policy, an explicit revoke states the intent.
revoke insert, update, delete on public.research_usage from anon, authenticated;

-- ---- 2. Only the server may spend ----
-- p_limit is a parameter, so a client calling this directly could pass any
-- ceiling it liked. Nothing but the Edge Function has business calling it.
revoke execute on function public.consume_research_call(integer) from public, anon, authenticated;
grant  execute on function public.consume_research_call(integer) to service_role;

-- ---- 3. Verify ----
-- Expect exactly one row: usage_read / SELECT. No write policies.
select policyname, cmd from pg_policies
where tablename = 'research_usage' order by policyname;

-- Expect service_role only.
select grantee, privilege_type from information_schema.routine_privileges
where routine_name = 'consume_research_call';
