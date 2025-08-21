-- Fix Queue Table Foreign Key Relationships
-- This script fixes the foreign key issues that are causing the 400 errors

-- Step 1: Check current queue table structure
SELECT 'Current queue table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'queue' 
ORDER BY ordinal_position;

-- Step 2: Check current foreign key constraints
SELECT 'Current foreign key constraints:' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'queue';

-- Step 3: Check what tables exist for patients
SELECT 'Available tables for patients:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%patient%' OR table_name LIKE '%profile%'
ORDER BY table_name;

-- Step 4: Check the structure of patients table if it exists
SELECT 'Patients table structure (if exists):' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'patients' 
ORDER BY ordinal_position;

-- Step 5: Drop existing foreign key constraints if they exist
DO $$
BEGIN
    -- Drop patient_id foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'queue_patient_id_fkey'
    ) THEN
        ALTER TABLE public.queue DROP CONSTRAINT queue_patient_id_fkey;
        RAISE NOTICE 'Dropped queue_patient_id_fkey constraint';
    END IF;
    
    -- Drop department_id foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'queue_department_id_fkey'
    ) THEN
        ALTER TABLE public.queue DROP CONSTRAINT queue_department_id_fkey;
        RAISE NOTICE 'Dropped queue_department_id_fkey constraint';
    END IF;
    
    -- Drop doctor_id foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'queue_doctor_id_fkey'
    ) THEN
        ALTER TABLE public.queue DROP CONSTRAINT queue_doctor_id_fkey;
        RAISE NOTICE 'Dropped queue_doctor_id_fkey constraint';
    END IF;
END $$;

-- Step 6: Add correct foreign key constraints
-- Note: We'll reference the actual patients table for patient_id
ALTER TABLE public.queue 
ADD CONSTRAINT queue_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;

ALTER TABLE public.queue 
ADD CONSTRAINT queue_department_id_fkey 
FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;

ALTER TABLE public.queue 
ADD CONSTRAINT queue_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 7: Verify the new foreign key constraints
SELECT 'New foreign key constraints:' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'queue';

-- Step 8: Test the queue query that was failing
SELECT 'Testing queue query with patients join:' as info;
SELECT 
    q.id,
    q.patient_id,
    q.priority,
    q.status,
    q.estimated_wait_time,
    q.added_at,
    p.full_name as patient_name,
    d.name as department_name
FROM public.queue q
LEFT JOIN public.patients p ON q.patient_id = p.id
LEFT JOIN public.departments d ON q.department_id = d.id
WHERE q.status = 'waiting'
ORDER BY q.priority DESC, q.added_at ASC
LIMIT 5;

-- Step 9: Create a view for easier queue management
CREATE OR REPLACE VIEW queue_with_details AS
SELECT 
    q.id,
    q.patient_id,
    q.patient_name,
    q.status,
    q.priority,
    q.added_at,
    q.checked_in_at,
    q.completed_at,
    q.notes,
    q.doctor_id,
    q.doctor_name,
    q.department_id,
    d.name as department_name,
    p.full_name as patient_full_name,
    p.email as patient_email,
    p.phone as patient_phone,
    doc.full_name as assigned_doctor_name
FROM public.queue q
LEFT JOIN public.departments d ON q.department_id = d.id
LEFT JOIN public.patients p ON q.patient_id = p.id
LEFT JOIN public.profiles doc ON q.doctor_id = doc.id;

-- Step 10: Grant permissions
GRANT SELECT ON queue_with_details TO authenticated;

-- Step 11: Final verification
SELECT 'Queue table is now properly configured for joins with patients and departments' as status;
