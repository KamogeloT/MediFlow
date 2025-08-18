-- Quick Fix for Queue Table Structure
-- Run these commands one by one in your Supabase SQL editor

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'queue' 
ORDER BY ordinal_position;

-- Step 2: Check what departments exist
SELECT * FROM public.departments;

-- Step 3: Add department_id column
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Step 4: Update existing records (replace 'General Medicine' with your actual department name)
UPDATE public.queue 
SET department_id = (SELECT id FROM public.departments WHERE name = 'General Medicine' LIMIT 1)
WHERE department_id IS NULL;

-- Step 5: Add patient_name column if missing
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- Step 6: Update patient names
UPDATE public.queue 
SET patient_name = (SELECT full_name FROM public.patients WHERE id = public.queue.patient_id)
WHERE patient_name IS NULL AND patient_id IS NOT NULL;

-- Step 7: Verify the fix
SELECT id, patient_name, department_id, status FROM public.queue LIMIT 5;
