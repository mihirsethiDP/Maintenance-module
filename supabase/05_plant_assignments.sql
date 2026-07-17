-- ===================================================================
-- DigitalPaani Maintenance Ops — Phase 2: Plant assignments + scoped RLS
-- Run AFTER 04. Paste into Supabase → SQL Editor → Run.
-- Engineers only see the plants assigned to them; Admins/Superadmin see all.
-- ===================================================================

-- 1. Which engineer is assigned to which plant.
create table if not exists public.plant_assignments (
  user_id  uuid not null references auth.users(id) on delete cascade,
  plant_id text not null references public.plants(id) on delete cascade,
  primary key (user_id, plant_id)
);

alter table public.plant_assignments enable row level security;

-- A user can read their own assignments; admins can read all.
drop policy if exists pa_read on public.plant_assignments;
create policy pa_read on public.plant_assignments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Only admins can assign / unassign.
drop policy if exists pa_write on public.plant_assignments;
create policy pa_write on public.plant_assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2. Access helper: admins → every plant; engineers → assigned plants only.
create or replace function public.has_plant_access(p text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.plant_assignments
    where user_id = auth.uid() and plant_id = p
  );
$$;

-- 2b. Store email on profiles so the app's Team page can show it
--     (auth.users isn't directly queryable from the browser client).
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email
  from auth.users u where u.id = p.id and (p.email is null or p.email = '');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'Engineer'),
    new.raw_user_meta_data->>'phone',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Re-scope equipment & logs reads to the caller's accessible plants.
--    (Admins keep full access via has_plant_access → is_admin.)
drop policy if exists equipment_read on public.equipment;
create policy equipment_read on public.equipment for select to authenticated
  using (public.has_plant_access(plant_id));

drop policy if exists logs_read on public.maintenance_logs;
create policy logs_read on public.maintenance_logs for select to authenticated
  using (public.has_plant_access(
    (select e.plant_id from public.equipment e where e.id = maintenance_logs.equipment_id)
  ));
