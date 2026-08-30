-- ===================================================================
-- DigitalPaani Maintenance Ops — storage housekeeping, in the app
-- Run in Supabase → SQL Editor (after 46). No function redeploys.
--
-- Photo FILES can be orphaned (their work-order rows cascade away when
-- equipment is deleted; SQL is forbidden from deleting the files), and
-- until now the only way to even see that was the Supabase dashboard.
-- Deletion through the Storage API is sanctioned, and admins already
-- hold that permission — so the app gets a Storage card on Oversight:
-- how much of the free 1 GB is used, and a one-tap clean-up.
--
-- WHAT COUNTS AS AN ORPHAN — three deliberate exclusions:
--   * client signature images (SR-*/...) have no media row BY DESIGN;
--     they are referenced from service_reports.client_sign instead.
--   * anything younger than 24 hours: an offline flush uploads photos
--     moments before it writes their rows, and a crash in between is
--     healed by the next flush — deleting inside that window would
--     destroy a technician's queued evidence.
--   * anything referenced by a media row, obviously.
-- ===================================================================

-- ---- How full is the bucket? ----
create or replace function public.wo_storage_usage()
returns table (total_bytes bigint, object_count bigint, orphan_count bigint, orphan_bytes bigint)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  return query
  with objs as (
    select o.name, coalesce((o.metadata->>'size')::bigint, 0) as bytes, o.created_at
    from storage.objects o where o.bucket_id = 'wo-media'
  ), orphans as (
    select * from objs ob
    where ob.name not like 'SR-%'
      and ob.created_at < now() - interval '24 hours'
      and not exists (select 1 from public.work_order_media m where m.path = ob.name)
  )
  select
    -- sum(bigint) yields numeric in Postgres; the declared return type is
    -- bigint, so cast — otherwise the function errors on its first call.
    (select coalesce(sum(objs.bytes), 0)::bigint from objs),
    (select count(*) from objs),
    (select count(*) from orphans),
    (select coalesce(sum(orphans.bytes), 0)::bigint from orphans);
end;
$$;
revoke all on function public.wo_storage_usage() from public, anon;
grant execute on function public.wo_storage_usage() to authenticated;

-- ---- Which files are safe to remove? (deleted via the Storage API) ----
create or replace function public.list_orphan_wo_media()
returns table (path text, bytes bigint, uploaded timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  return query
  select o.name, coalesce((o.metadata->>'size')::bigint, 0), o.created_at
  from storage.objects o
  where o.bucket_id = 'wo-media'
    and o.name not like 'SR-%'
    and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.work_order_media m where m.path = o.name)
  order by o.created_at
  limit 200;
end;
$$;
revoke all on function public.list_orphan_wo_media() from public, anon;
grant execute on function public.list_orphan_wo_media() to authenticated;

-- ---- Verify ----
select * from public.wo_storage_usage();
