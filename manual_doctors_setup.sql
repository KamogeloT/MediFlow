-- Manual Doctors Setup
-- Run these commands one by one in your Supabase SQL Editor

-- Step 1: First, let's see what departments we have
select id, name from public.departments;

-- Step 2: Create a few doctors manually (replace the UUIDs with real ones from your auth.users table)
-- You can get UUIDs from your existing users or create new ones

-- Example: If you have an existing user, use their UUID
-- insert into public.profiles (id, full_name, role, created_at) 
-- values ('your-existing-user-uuid', 'Dr. Sarah Johnson', 'doctor', now());

-- Step 3: Assign doctors to departments (replace the UUIDs with actual ones)
-- insert into public.doctor_departments (doctor_id, department_id)
-- select 
--   'your-doctor-uuid' as doctor_id,
--   d.id as department_id
-- from public.departments d
-- where d.name = 'Cardiology';

-- Alternative: Create a simple test setup
-- This creates one doctor profile without auth user (for testing only)
insert into public.profiles (id, full_name, role, created_at) 
values (gen_random_uuid(), 'Dr. Test Doctor', 'doctor', now())
on conflict (id) do nothing;

-- Then assign this doctor to a department
insert into public.doctor_departments (doctor_id, department_id)
select 
  p.id as doctor_id,
  d.id as department_id
from public.profiles p, public.departments d
where p.full_name = 'Dr. Test Doctor' and d.name = 'Cardiology'
on conflict (doctor_id, department_id) do nothing;
