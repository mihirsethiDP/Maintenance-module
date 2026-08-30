-- ===================================================================
-- DigitalPaani Maintenance Ops — signature images join the clean-up
-- Run in Supabase → SQL Editor (after 50). No app changes.
--
-- The storage clean-up (47) deliberately excluded SR-*/ files because
-- client signature images have no work_order_media row BY DESIGN — they
-- are referenced from service_reports.client_sign instead. But that
-- blanket exclusion also protected genuine junk: a signature uploaded
-- moments before client_sign_report failed leaves a PNG nothing
-- references, forever.
--
-- The sweep now knows the real rule: an SR-* file is an orphan when NO
-- report's client_sign points at it. The 24-hour guard still protects a
-- signature whose RPC is seconds away. Everything else is unchanged —
-- same functions, same Oversight card, same one-tap clean-up.
-- ===================================================================

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
    where ob.created_at < now() - interval '24 hours'
      and case when ob.name like 'SR-%'
            then not exists (select 1 from public.service_reports r
                              where r.client_sign->>'image_path' = ob.name)
            else not exists (select 1 from public.work_order_media m
                              where m.path = ob.name)
          end
  )
  select
    (select coalesce(sum(objs.bytes), 0)::bigint from objs),
    (select count(*) from objs),
    (select count(*) from orphans),
    (select coalesce(sum(orphans.bytes), 0)::bigint from orphans);
end;
$$;

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
    and o.created_at < now() - interval '24 hours'
    and case when o.name like 'SR-%'
          then not exists (select 1 from public.service_reports r
                            where r.client_sign->>'image_path' = o.name)
          else not exists (select 1 from public.work_order_media m
                            where m.path = o.name)
        end
  order by o.created_at
  limit 200;
end;
$$;

-- ---- Verify: runs clean, and today's counts ----
select * from public.wo_storage_usage();
