-- Simple Doctors Setup (Alternative Approach)
-- This approach creates doctors without auth users for development

-- First, let's create a temporary table to store doctor info
create temp table temp_doctors (
  id uuid,
  full_name text,
  email text
);

-- Insert doctor data into temp table
insert into temp_doctors (id, full_name, email) values
  (gen_random_uuid(), 'Dr. Sarah Johnson', 'dr.sarah.johnson@mediflow.com'),
  (gen_random_uuid(), 'Dr. Michael Chen', 'dr.michael.chen@mediflow.com'),
  (gen_random_uuid(), 'Dr. Emily Davis', 'dr.emily.davis@mediflow.com'),
  (gen_random_uuid(), 'Dr. Robert Wilson', 'dr.robert.wilson@mediflow.com'),
  (gen_random_uuid(), 'Dr. Lisa Rodriguez', 'dr.lisa.rodriguez@mediflow.com'),
  (gen_random_uuid(), 'Dr. James Thompson', 'dr.james.thompson@mediflow.com'),
  (gen_random_uuid(), 'Dr. Maria Garcia', 'dr.maria.garcia@mediflow.com'),
  (gen_random_uuid(), 'Dr. David Kim', 'dr.david.kim@mediflow.com'),
  (gen_random_uuid(), 'Dr. Jennifer Lee', 'dr.jennifer.lee@mediflow.com'),
  (gen_random_uuid(), 'Dr. Christopher Brown', 'dr.christopher.brown@mediflow.com');

-- Insert profiles using the generated UUIDs
insert into public.profiles (id, full_name, role, created_at)
select id, full_name, 'doctor', now() from temp_doctors;

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

-- Clean up temp table
drop table temp_doctors;
