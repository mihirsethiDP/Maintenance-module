-- ===================================================================
-- DigitalPaani Maintenance Ops — work-order photo cleanup
-- Run in Supabase → SQL Editor (after 41).
--
-- PART 1 adds a helper so a photo can be removed in ONE call instead of
-- two that can half-fail. The app deletes a photo client-side as
-- storage.remove() then a table delete; if the second fails you get a
-- file with no record, and if the first fails you get a record with no
-- file. This does both in one transaction.
--
-- PART 2 removes two test files Claude uploaded while verifying the
-- storage path on 2026-08-27. Named exactly — nothing to edit.
-- ===================================================================

-- ---- 1. One-call photo delete ----
-- Permission mirrors the wom_delete policy: an admin any time, or the
-- uploader while the work order is not yet closed.
create or replace function public.delete_work_order_photo(p_path text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_row record; v_state text; v_end date;
begin
  select * into v_row from public.work_order_media where path = p_path;
  if v_row.id is null then
    -- No record: allow an admin to clear an orphaned object anyway.
    if not public.is_admin() then
      raise exception 'No such photo.';
    end if;
    delete from storage.objects where bucket_id = 'wo-media' and name = p_path;
    return found;
  end if;

  select wo_state, end_date into v_state, v_end
    from public.maintenance_logs where id = v_row.log_id;

  if not (public.is_admin()
          or (v_row.uploaded_by = auth.uid() and coalesce(v_state,'') <> 'done')) then
    raise exception 'You can only remove your own photos, and only before the job is approved.';
  end if;

  delete from storage.objects where bucket_id = 'wo-media' and name = p_path;
  delete from public.work_order_media where id = v_row.id;
  return true;
end;
$$;
revoke all on function public.delete_work_order_photo(text) from public, anon;
grant execute on function public.delete_work_order_photo(text) to authenticated;

-- ---- 2. Remove Claude's two test uploads ----
-- Both 27,981 bytes, uploaded 2026-08-27 11:24 while verifying that a
-- technician can put a photo in the bucket. The duplicate exists because
-- the browser tool executed the upload twice. The real photos on these
-- jobs (183,393 and 102,902 bytes) are left alone.
select public.delete_work_order_photo('L-1787824767113/1787829756717_0.jpg') as deleted_1,
       public.delete_work_order_photo('L-1787824767113/1787829756435_0.jpg') as deleted_2;

-- ---- 3. Verify: the two test files are gone, real photos remain ----
select o.name, (o.metadata->>'size')::int as bytes, o.created_at::date as uploaded,
       case when (o.metadata->>'size')::int = 27981 then 'TEST FILE — SHOULD BE GONE' else 'real' end as verdict
from storage.objects o
where o.bucket_id = 'wo-media'
order by o.created_at desc;
