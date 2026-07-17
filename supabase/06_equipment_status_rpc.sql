-- ===================================================================
-- DigitalPaani Maintenance Ops — status-change RPC
-- Lets an engineer flip an equipment's STATUS (only) when logging
-- maintenance, without granting them edit rights on equipment.
-- Run in Supabase → SQL Editor.
-- ===================================================================
create or replace function public.set_equipment_status(eq_id text, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_status not in ('Operational','In Maintenance','Broken Down') then
    raise exception 'invalid status %', new_status;
  end if;
  -- caller must have access to the equipment's plant (admins: all; engineers: assigned)
  if not public.has_plant_access((select plant_id from public.equipment where id = eq_id)) then
    raise exception 'no access to equipment %', eq_id;
  end if;
  update public.equipment set status = new_status where id = eq_id;
end;
$$;

revoke all on function public.set_equipment_status(text, text) from public;
grant execute on function public.set_equipment_status(text, text) to authenticated;
