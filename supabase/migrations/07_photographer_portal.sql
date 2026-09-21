-- 07_photographer_portal.sql

-- 1. Update handle_new_user to respect role and require approval for photographers
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  v_role text;
  v_is_active boolean;
begin
  -- Get role from metadata or default to customer
  v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
  
  -- Prevent users from signing up as admin or staff directly
  if v_role in ('admin', 'staff') then
    v_role := 'customer';
  end if;

  -- Photographers must be approved by admin (is_active = false)
  if v_role = 'photographer' then
    v_is_active := false;
  else
    v_is_active := true;
  end if;

  insert into public.profiles (id, first_name, last_name, role, is_active)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    v_role,
    v_is_active
  );
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create Photographer Availability Table
create table if not exists public.photographer_availability (
  id uuid primary key default uuid_generate_v4(),
  photographer_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  start_time time, -- null means all day
  end_time time,
  is_available boolean default false,
  created_at timestamptz default now()
);

-- RLS for availability
alter table public.photographer_availability enable row level security;

drop policy if exists "Photographers can manage their own availability" on public.photographer_availability;
create policy "Photographers can manage their own availability"
on public.photographer_availability for all
using (auth.uid() = photographer_id)
with check (auth.uid() = photographer_id);

drop policy if exists "Staff can view photographer availability" on public.photographer_availability;
create policy "Staff can view photographer availability"
on public.photographer_availability for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  )
);

drop policy if exists "Public can view availability" on public.photographer_availability;
create policy "Public can view availability"
on public.photographer_availability for select
using (true);

-- 3. Modify Photo Outputs RLS to allow Photographers to upload
drop policy if exists "Photographers can insert photo outputs for their bookings" on public.photo_outputs;
create policy "Photographers can insert photo outputs for their bookings"
on public.photo_outputs for insert
with check (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.photographer_id = auth.uid()
  )
);

drop policy if exists "Photographers can view photo outputs for their bookings" on public.photo_outputs;
create policy "Photographers can view photo outputs for their bookings"
on public.photo_outputs for select
using (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.photographer_id = auth.uid()
  )
);

-- 4. Allow Photographers to view their assigned bookings
drop policy if exists "Photographers can view their assigned bookings" on public.bookings;
create policy "Photographers can view their assigned bookings"
on public.bookings for select
using (photographer_id = auth.uid());

