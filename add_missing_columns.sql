-- Add Missing Columns to Queue Table
-- Run this in your Supabase SQL Editor

-- Add the missing columns one by one
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS is_appointment_based boolean DEFAULT false;
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS appointment_id uuid;
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS appointment_time timestamptz;
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS estimated_wait_time integer DEFAULT 0;
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS is_walk_in boolean DEFAULT false;

-- Success message
SELECT 'Missing columns added successfully!' as message;
