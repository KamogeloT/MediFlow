-- Migration to fix queue table structure for BPM system compatibility
-- This migration updates the queue table to use department_id instead of department text

-- 1. Add the new department_id column
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 2. Update existing records to set department_id based on department text
-- First, let's see what departments exist
-- SELECT * FROM public.departments;

-- 3. Update existing queue items to have proper department_id
-- This assumes you have a 'General Medicine' department, adjust as needed
UPDATE public.queue 
SET department_id = (SELECT id FROM public.departments WHERE name = 'General Medicine' LIMIT 1)
WHERE department_id IS NULL AND department IS NOT NULL;

-- 4. Make department_id NOT NULL after updating existing records
ALTER TABLE public.queue ALTER COLUMN department_id SET NOT NULL;

-- 5. Drop the old department text column
ALTER TABLE public.queue DROP COLUMN IF EXISTS department;

-- 6. Add any missing columns that the BPM system expects
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- 7. Update patient_name for existing records if it's NULL
UPDATE public.queue 
SET patient_name = (SELECT full_name FROM public.patients WHERE id = public.queue.patient_id)
WHERE patient_name IS NULL AND patient_id IS NOT NULL;

-- 8. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_department_id ON public.queue(department_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON public.queue(priority);

-- 9. Verify the updated structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'queue' 
-- ORDER BY ordinal_position;
