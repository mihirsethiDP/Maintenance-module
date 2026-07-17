-- ===================================================================
-- DigitalPaani Maintenance Ops — Phase 1: Auth + Profiles + RLS
-- Paste this into Supabase → SQL Editor → New query → Run.
-- ===================================================================

-- 1. Profiles table, one row per auth user, holding the app role.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  role       text not null default 'Engineer' check (role in ('Superadmin','Admin','Engineer')),
  phone      text,
  status     text not null default 'active',
  created_at timestamptz not null default now()
);

-- 2. Helper: is the current user an Admin?  SECURITY DEFINER avoids RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('Admin','Superadmin')
  );
$$;

-- 3. Row-Level Security
alter table public.profiles enable row level security;

-- Any signed-in user can read profiles (needed for the Team list & recipient pickers).
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read"
  on public.profiles for select
  to authenticated
  using (true);

-- A user may update their own profile (name/phone) but not their own role.
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Admins can insert / update / delete any profile (role management, remove user).
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Auto-create a profile whenever a new auth user is created.
--    Name/role are read from the invite/signup metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'Engineer'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. AFTER you create your first user (Step 5 in the guide), promote yourself to Admin:
--    update public.profiles set role = 'Admin'
--    where id = (select id from auth.users where email = 'mihir.sethi@digitalpaani.com');
