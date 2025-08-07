-- Departments and Doctors Schema
-- Run this in your Supabase SQL Editor

-- Departments table
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Doctor assignments to departments (many-to-many relationship)
create table if not exists public.doctor_departments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references auth.users(id) on delete cascade,
  department_id uuid references departments(id) on delete cascade,
  created_at timestamptz default now(),
  unique(doctor_id, department_id)
);

-- Insert some default departments
insert into public.departments (name, description) values
  ('Cardiology', 'Heart and cardiovascular system'),
  ('Dermatology', 'Skin conditions and diseases'),
  ('Neurology', 'Nervous system and brain disorders'),
  ('Orthopedics', 'Bones, joints, and musculoskeletal system'),
  ('Pediatrics', 'Children and adolescent medicine'),
  ('Psychiatry', 'Mental health and behavioral disorders'),
  ('Radiology', 'Medical imaging and diagnostics'),
  ('Surgery', 'Surgical procedures and operations'),
  ('Emergency Medicine', 'Urgent and emergency care'),
  ('Internal Medicine', 'Adult general medicine')
on conflict (name) do nothing;

-- Enable RLS on new tables
alter table public.departments enable row level security;
alter table public.doctor_departments enable row level security;

-- Create policies for departments table
create policy "Enable read access for all users" on public.departments
  for select using (true);

create policy "Enable insert for authenticated users" on public.departments
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.departments
  for update using (auth.role() = 'authenticated');

-- Create policies for doctor_departments table
create policy "Enable read access for all users" on public.doctor_departments
  for select using (true);

create policy "Enable insert for authenticated users" on public.doctor_departments
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.doctor_departments
  for update using (auth.role() = 'authenticated');

-- Create indexes
create index if not exists idx_doctor_departments_doctor_id on public.doctor_departments(doctor_id);
create index if not exists idx_doctor_departments_department_id on public.doctor_departments(department_id);
