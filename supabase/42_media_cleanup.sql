-- ===================================================================
-- DigitalPaani Maintenance Ops — work-order photo housekeeping
-- Run in Supabase → SQL Editor (after 41). Safe to re-run.
--
-- CORRECTION: the first version of this file added a function that
-- deleted straight from storage.objects. Supabase blocks that with a
-- storage.protect_delete() trigger, deliberately — deleting the row
-- would orphan the underlying file. Deletion must go through the
-- Storage API, which means the app's existing two-call pattern
-- (storage.remove() then a row delete) was already correct and my
-- "improvement" was a mistake. This file drops that function and keeps
-- only what SQL is actually allowed to do.
--
-- FILES STILL TO REMOVE BY HAND (Storage API only):
--   L-1787824767113/1787829756717_0.jpg   27,981 bytes
--   L-1787824767113/1787829756435_0.jpg   27,981 bytes
-- Both are Claude test uploads from 2026-08-27 11:24. Delete them in
-- Dashboard → Storage → wo-media → L-1787824767113 → tick both → Delete.
-- Then run this file to clear the records they leave behind.
-- ===================================================================

-- ---- 1. Remove the function that could never work ----
drop function if exists public.delete_work_order_photo(text);

-- ---- 2. Clear metadata rows whose file is gone ----
-- Legitimate: work_order_media is our own table. This is the other half of
-- a Storage-API delete, and it also self-heals any half-finished delete the
-- app may have left behind (storage.remove() succeeded, row delete failed).
create or replace function public.purge_orphan_wo_media()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  with gone as (
    delete from public.work_order_media m
     where not exists (select 1 from storage.objects o
                        where o.bucket_id = 'wo-media' and o.name = m.path)
    returning 1
  )
  select count(*) into n from gone;
  return n;
end;
$$;
revoke all on function public.purge_orphan_wo_media() from public, anon;
grant execute on function public.purge_orphan_wo_media() to authenticated;

select public.purge_orphan_wo_media() as orphan_records_cleared;

-- ---- 3. What is left in the bucket ----
-- Anything at 27,981 bytes is a Claude test file and still needs deleting
-- through the Storage UI; everything else is real.
select o.name, (o.metadata->>'size')::int as bytes, o.created_at::date as uploaded,
       case when (o.metadata->>'size')::int = 27981 then 'TEST FILE — delete via Storage UI' else 'real' end as verdict,
       exists (select 1 from public.work_order_media m where m.path = o.name) as has_record
from storage.objects o
where o.bucket_id = 'wo-media'
order by o.created_at desc;
