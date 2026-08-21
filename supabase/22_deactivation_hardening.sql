-- ===================================================================
-- DigitalPaani Maintenance Ops — deactivation hardening + server budget
-- Run in Supabase → SQL Editor (after 21). Then REDEPLOY both functions:
--     supabase functions deploy invite-user
--     supabase functions deploy enrich-equipment
--
-- Closes the QA-4 findings:
--   1. Tables readable via plain `using (true)` stayed open to
--      deactivated accounts (profiles/technicians hold personnel PII).
--      Every such policy now requires an ACTIVE account — except that
--      users always see their OWN profile row, which the sign-in flow
--      needs in order to bounce them politely.
--   2. A deactivated (or any) JWT could insert technician rows.
--   3. The AI research budget existed only in the browser. The
--      consume_research_call function is the new authoritative counter:
--      atomic, service-role-only, called by the enrich-equipment
--      function before every AI request.
--   4. Profile owners could rewrite their display email (cosmetic
--      impersonation on the Team page) — now Superadmin-only.
-- ===================================================================

-- ---- 1. Active-account helper ----
create or replace function public.is_active()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and coalesce(status, 'active') = 'active');
$$;

-- ---- 2. Reads (and the one open insert) require an active account ----
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_active());

drop policy if exists plants_read on public.plants;
create policy plants_read on public.plants for select to authenticated
  using (public.is_active());

drop policy if exists tech_read   on public.technicians;
drop policy if exists tech_insert on public.technicians;
create policy tech_read on public.technicians for select to authenticated
  using (public.is_active());
create policy tech_insert on public.technicians for insert to authenticated
  with check (public.is_active());

drop policy if exists ct_read on public.checklist_templates;
create policy ct_read on public.checklist_templates for select to authenticated
  using (public.is_active());

drop policy if exists tc_read on public.type_config;
create policy tc_read on public.type_config for select to authenticated
  using (public.is_active());

drop policy if exists usage_read on public.research_usage;
create policy usage_read on public.research_usage for select to authenticated
  using (public.is_active());

drop policy if exists pa_read on public.plant_assignments;
create policy pa_read on public.plant_assignments for select to authenticated
  using (user_id = auth.uid() and public.is_active());

-- ---- 3. Guard: display email is Superadmin-only (service context exempt) ----
create or replace function public.guard_profiles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service context (SQL editor, service role): auth.uid() is NULL and RLS
  -- is already bypassed there by design -- the guard is for client requests.
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' then
    if old.role = 'Superadmin' then
      raise exception 'The Superadmin profile cannot be deleted.';
    end if;
    return old;
  end if;
  -- UPDATE:
  if new.role is distinct from old.role and not public.is_superadmin() then
    raise exception 'Only the Superadmin can change roles.';
  end if;
  if new.ui_mode is distinct from old.ui_mode and not public.is_superadmin() then
    raise exception 'Only the Superadmin can change interface modes.';
  end if;
  if new.email is distinct from old.email and not public.is_superadmin() then
    raise exception 'The email shown on Team cannot be edited here.';
  end if;
  if old.role = 'Superadmin' and auth.uid() is distinct from old.id then
    raise exception 'Only the Superadmin can modify their own profile.';
  end if;
  if new.status is distinct from old.status then
    if old.id = auth.uid() then
      raise exception 'You cannot change your own account status.';
    end if;
    if old.role = 'Superadmin' then
      raise exception 'The Superadmin cannot be deactivated.';
    end if;
    if old.role = 'Admin' and not public.is_superadmin() then
      raise exception 'Only the Superadmin can deactivate an Admin.';
    end if;
    if not public.is_admin() then
      raise exception 'Only admins can change account status.';
    end if;
  end if;
  return new;
end;
$$;

-- ---- 4. Authoritative daily budget counter (service-role only) ----
create or replace function public.consume_research_call(p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  d text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD');
begin
  insert into public.research_usage (day, calls) values (d, 0)
    on conflict (day) do nothing;
  update public.research_usage set calls = calls + 1
    where day = d and calls < p_limit;
  return found;
end;
$$;
revoke all on function public.consume_research_call(integer) from public, anon, authenticated;

-- ---- Verify ----
select
  (select count(*) from pg_proc where proname = 'is_active')             as is_active_fn,
  (select count(*) from pg_proc where proname = 'consume_research_call') as budget_fn;
