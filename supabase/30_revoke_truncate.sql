-- ===================================================================
-- DigitalPaani Maintenance Ops — take TRUNCATE away from the browser
-- Run in Supabase → SQL Editor (after 29). Run this one promptly.
--
-- THE HOLE
-- Supabase's starting grants hand anon and authenticated ALL privileges on
-- public tables. That includes TRUNCATE, REFERENCES and TRIGGER -- and
-- TRUNCATE IS NOT SUBJECT TO ROW LEVEL SECURITY. Every policy in this
-- project governs SELECT/INSERT/UPDATE/DELETE and is simply not consulted
-- for a TRUNCATE. So the anon key that ships inside app.js was enough to
-- empty any table: research_usage (resetting the AI budget), and equally
-- equipment, maintenance_logs and profiles.
--
-- 29 revoked insert, update and delete on research_usage and missed this,
-- which is exactly the sort of gap naming verbs one at a time produces.
--
-- THE FIX
-- Revoke all three across the schema, and change the DEFAULT privileges so
-- tables created later do not quietly reintroduce it. The client keeps the
-- DML it needs; RLS continues to decide who may do what.
-- ===================================================================

-- ---- 1. Existing tables ----
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, references, trigger on public.%I from anon, authenticated',
      t.tablename);
  end loop;
end $$;

-- ---- 2. Tables created from now on ----
-- Supabase's default-privilege grants are owned by postgres and by the
-- supabase_admin role; alter both so a future migration cannot hand it back.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public
           revoke truncate, references, trigger on tables from anon, authenticated';
exception when others then
  raise notice 'supabase_admin default privileges not alterable here (%), harmless: step 1 still applied', sqlerrm;
end $$;

-- ---- 3. Verify: expect ZERO rows ----
select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and grantee in ('anon','authenticated')
  and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER')
order by table_name, grantee, privilege_type;

-- ---- 4. Confirm the app's own access is untouched ----
-- Expect SELECT/INSERT/UPDATE/DELETE still present per table; RLS decides
-- whether any given row is reachable.
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as remaining
from information_schema.table_privileges
where table_schema = 'public' and grantee in ('anon','authenticated')
group by table_name, grantee order by table_name, grantee;
