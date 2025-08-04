create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor text not null,
  department text not null,
  encounter_date date not null default current_date,
  notes text
);

create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  description text not null
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  medication text not null,
  dosage text,
  instructions text
);

alter table public.encounters enable row level security;
alter table public.diagnoses enable row level security;
alter table public.prescriptions enable row level security;

create policy "staff_access" on public.encounters
  for all using (auth.jwt() ->> 'role' = 'staff');

create policy "staff_access" on public.diagnoses
  for all using (auth.jwt() ->> 'role' = 'staff');

create policy "staff_access" on public.prescriptions
  for all using (auth.jwt() ->> 'role' = 'staff');
