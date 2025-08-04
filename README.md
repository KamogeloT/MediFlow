# MediFlow

A React + TypeScript + Vite application.

## Supabase Setup

This project uses [Supabase](https://supabase.com) for authentication.

1. Create a Supabase project.
2. Copy your project's URL and anonymous key.
3. Create a `.env` file based on `.env.example` and set the following variables:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Development

Install dependencies and start the development server:

```
npm install
npm run dev
```

Run type checking and build for production:

```
npm run build
```

Run linting:

```
npm run lint
```

## Appointments Table

The calendar uses a Supabase table named `appointments` with realtime updates enabled. A minimal schema looks like:

```sql
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  doctor_id uuid null,
  department text null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled'
);
```

Enable Realtime on the table to receive live updates in the UI.
