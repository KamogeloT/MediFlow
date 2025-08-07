-- Complete MediFlow Database Schema
-- Run this in your Supabase SQL Editor

-- Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text,
  created_at timestamptz default now()
);

-- Patients table
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  address text,
  phone text,
  email text,
  allergies text,
  medications text,
  blood_type text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  created_at timestamptz default now()
);

-- Appointments table
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid null,
  department text null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- Queue table for managing patient queue
create table if not exists public.queue (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'in-consultation', 'completed')),
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  added_at timestamptz default now(),
  checked_in_at timestamptz,
  completed_at timestamptz,
  notes text,
  doctor_id uuid null,
  department text null
);

-- Encounters table (for patient history)
create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid null,
  encounter_date timestamptz not null,
  department text,
  notes text,
  created_at timestamptz default now()
);

-- Diagnoses table (linked to encounters)
create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid references encounters(id) on delete cascade,
  description text not null,
  created_at timestamptz default now()
);

-- Prescriptions table (linked to encounters)
create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid references encounters(id) on delete cascade,
  medication text not null,
  dosage text,
  instructions text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.queue enable row level security;
alter table public.encounters enable row level security;
alter table public.diagnoses enable row level security;
alter table public.prescriptions enable row level security;

-- Create policies for profiles table
create policy "Enable read access for all users" on public.profiles
  for select using (true);

create policy "Enable insert for authenticated users" on public.profiles
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.profiles
  for update using (auth.role() = 'authenticated');

-- Create policies for patients table
create policy "Enable read access for all users" on public.patients
  for select using (true);

create policy "Enable insert for authenticated users" on public.patients
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.patients
  for update using (auth.role() = 'authenticated');

-- Create policies for appointments table
create policy "Enable read access for all users" on public.appointments
  for select using (true);

create policy "Enable insert for authenticated users" on public.appointments
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.appointments
  for update using (auth.role() = 'authenticated');

-- Create policies for queue table
create policy "Enable read access for all users" on public.queue
  for select using (true);

create policy "Enable insert for authenticated users" on public.queue
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.queue
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on public.queue
  for delete using (auth.role() = 'authenticated');

-- Create policies for encounters table
create policy "Enable read access for all users" on public.encounters
  for select using (true);

create policy "Enable insert for authenticated users" on public.encounters
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.encounters
  for update using (auth.role() = 'authenticated');

-- Create policies for diagnoses table
create policy "Enable read access for all users" on public.diagnoses
  for select using (true);

create policy "Enable insert for authenticated users" on public.diagnoses
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.diagnoses
  for update using (auth.role() = 'authenticated');

-- Create policies for prescriptions table
create policy "Enable read access for all users" on public.prescriptions
  for select using (true);

create policy "Enable insert for authenticated users" on public.prescriptions
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.prescriptions
  for update using (auth.role() = 'authenticated');

-- Create indexes for better performance
create index if not exists idx_patients_full_name on public.patients(full_name);
create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_appointments_start_time on public.appointments(start_time);
create index if not exists idx_queue_status on public.queue(status);
create index if not exists idx_queue_added_at on public.queue(added_at);
create index if not exists idx_queue_patient_id on public.queue(patient_id);
create index if not exists idx_encounters_patient_id on public.encounters(patient_id);
create index if not exists idx_encounters_encounter_date on public.encounters(encounter_date);

-- Enable realtime for tables that need it
alter publication supabase_realtime add table public.queue;
alter publication supabase_realtime add table public.patients;
alter publication supabase_realtime add table public.appointments;
