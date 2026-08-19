-- ===================================================================
-- DigitalPaani Maintenance Ops — notifications RLS hardening (QA fix)
-- Run in Supabase → SQL Editor (after 15).
--
-- Before: any authenticated user could read, insert, and UPDATE any
-- notification row — an engineer could inject content into the
-- admins' activity feed (stored XSS vector; the app now also escapes
-- at render, but the DB must not be open either) and read activity
-- for plants they aren't assigned to.
--
-- After:
--   read    admins: everything · engineers: only their plants' rows
--   insert  admins: anything   · engineers: only rows tied to their
--           plants (their own actions still feed the activity log)
--   update / delete  admins only
-- ===================================================================

drop policy if exists notif_read   on public.notifications;
drop policy if exists notif_write  on public.notifications;
drop policy if exists notif_update on public.notifications;
drop policy if exists notif_delete on public.notifications;

create policy notif_read on public.notifications for select to authenticated
  using (public.is_admin() or (plant_id is not null and public.has_plant_access(plant_id)));

create policy notif_write on public.notifications for insert to authenticated
  with check (public.is_admin() or (plant_id is not null and public.has_plant_access(plant_id)));

create policy notif_update on public.notifications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy notif_delete on public.notifications for delete to authenticated
  using (public.is_admin());

-- ---- Verify ----
select polname, polcmd from pg_policy
where polrelid = 'public.notifications'::regclass order by polname;
