-- Dummy Doctors and Department Assignments
-- Run this in your Supabase SQL Editor after running departments_and_doctors_schema.sql

-- First, let's create some dummy doctor profiles
-- Note: These are mock user IDs - in a real scenario, these would be actual auth.users IDs

-- Insert dummy doctor profiles
insert into public.profiles (id, full_name, role, created_at) values
  ('11111111-1111-1111-1111-111111111111', 'Dr. Sarah Johnson', 'doctor', now()),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Michael Chen', 'doctor', now()),
  ('33333333-3333-3333-3333-333333333333', 'Dr. Emily Davis', 'doctor', now()),
  ('44444444-4444-4444-4444-444444444444', 'Dr. Robert Wilson', 'doctor', now()),
  ('55555555-5555-5555-5555-555555555555', 'Dr. Lisa Rodriguez', 'doctor', now()),
  ('66666666-6666-6666-6666-666666666666', 'Dr. James Thompson', 'doctor', now()),
  ('77777777-7777-7777-7777-777777777777', 'Dr. Maria Garcia', 'doctor', now()),
  ('88888888-8888-8888-8888-888888888888', 'Dr. David Kim', 'doctor', now()),
  ('99999999-9999-9999-9999-999999999999', 'Dr. Jennifer Lee', 'doctor', now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dr. Christopher Brown', 'doctor', now())
on conflict (id) do nothing;

-- Get department IDs for assignment
-- We'll use the department names to get their IDs
with dept_ids as (
  select id, name from public.departments
)
-- Assign doctors to departments (many-to-many)
insert into public.doctor_departments (doctor_id, department_id) 
select 
  p.id as doctor_id,
  d.id as department_id
from public.profiles p
cross join dept_ids d
where p.role = 'doctor'
  and (
    -- Cardiology
    (p.full_name = 'Dr. Sarah Johnson' and d.name = 'Cardiology') or
    (p.full_name = 'Dr. Michael Chen' and d.name = 'Cardiology') or
    
    -- Dermatology
    (p.full_name = 'Dr. Emily Davis' and d.name = 'Dermatology') or
    (p.full_name = 'Dr. Lisa Rodriguez' and d.name = 'Dermatology') or
    
    -- Neurology
    (p.full_name = 'Dr. Robert Wilson' and d.name = 'Neurology') or
    (p.full_name = 'Dr. James Thompson' and d.name = 'Neurology') or
    
    -- Orthopedics
    (p.full_name = 'Dr. Maria Garcia' and d.name = 'Orthopedics') or
    (p.full_name = 'Dr. David Kim' and d.name = 'Orthopedics') or
    
    -- Pediatrics
    (p.full_name = 'Dr. Jennifer Lee' and d.name = 'Pediatrics') or
    (p.full_name = 'Dr. Christopher Brown' and d.name = 'Pediatrics') or
    
    -- Psychiatry
    (p.full_name = 'Dr. Sarah Johnson' and d.name = 'Psychiatry') or
    (p.full_name = 'Dr. Emily Davis' and d.name = 'Psychiatry') or
    
    -- Emergency Medicine (multiple doctors)
    (p.full_name = 'Dr. Michael Chen' and d.name = 'Emergency Medicine') or
    (p.full_name = 'Dr. Robert Wilson' and d.name = 'Emergency Medicine') or
    (p.full_name = 'Dr. Lisa Rodriguez' and d.name = 'Emergency Medicine') or
    
    -- Internal Medicine (multiple doctors)
    (p.full_name = 'Dr. James Thompson' and d.name = 'Internal Medicine') or
    (p.full_name = 'Dr. Maria Garcia' and d.name = 'Internal Medicine') or
    (p.full_name = 'Dr. David Kim' and d.name = 'Internal Medicine') or
    (p.full_name = 'Dr. Jennifer Lee' and d.name = 'Internal Medicine') or
    (p.full_name = 'Dr. Christopher Brown' and d.name = 'Internal Medicine')
  )
on conflict (doctor_id, department_id) do nothing;
