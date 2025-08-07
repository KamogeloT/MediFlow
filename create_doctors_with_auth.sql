-- Create Doctors with Proper Auth Setup
-- Run this in your Supabase SQL Editor after running departments_and_doctors_schema.sql

-- First, we need to create the auth.users entries
-- Note: In Supabase, you typically create users through the auth.signup() function
-- But for development, we can insert directly into auth.users

-- Insert auth users for doctors
insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  ('11111111-1111-1111-1111-111111111111', 'dr.sarah.johnson@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Sarah Johnson","role":"doctor"}', false, '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', 'dr.michael.chen@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Michael Chen","role":"doctor"}', false, '', '', '', ''),
  ('33333333-3333-3333-3333-333333333333', 'dr.emily.davis@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Emily Davis","role":"doctor"}', false, '', '', '', ''),
  ('44444444-4444-4444-4444-444444444444', 'dr.robert.wilson@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Robert Wilson","role":"doctor"}', false, '', '', '', ''),
  ('55555555-5555-5555-5555-555555555555', 'dr.lisa.rodriguez@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Lisa Rodriguez","role":"doctor"}', false, '', '', '', ''),
  ('66666666-6666-6666-6666-666666666666', 'dr.james.thompson@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. James Thompson","role":"doctor"}', false, '', '', '', ''),
  ('77777777-7777-7777-7777-777777777777', 'dr.maria.garcia@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Maria Garcia","role":"doctor"}', false, '', '', '', ''),
  ('88888888-8888-8888-8888-888888888888', 'dr.david.kim@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. David Kim","role":"doctor"}', false, '', '', '', ''),
  ('99999999-9999-9999-9999-999999999999', 'dr.jennifer.lee@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Jennifer Lee","role":"doctor"}', false, '', '', '', ''),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dr.christopher.brown@mediflow.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Christopher Brown","role":"doctor"}', false, '', '', '', '')
on conflict (id) do nothing;

-- Now insert the profiles
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
