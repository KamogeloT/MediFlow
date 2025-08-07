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

-- Enable Row Level Security (RLS)
alter table public.queue enable row level security;

-- Create policies for queue table
create policy "Enable read access for all users" on public.queue
  for select using (true);

create policy "Enable insert for authenticated users" on public.queue
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.queue
  for update using (auth.role() = 'authenticated');

-- Create index for better performance
create index if not exists idx_queue_status on public.queue(status);
create index if not exists idx_queue_added_at on public.queue(added_at);
