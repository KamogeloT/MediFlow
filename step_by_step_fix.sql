-- Step-by-Step Queue Table Fix (No Hard-coding)
-- Run these commands one by one in your Supabase SQL editor

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'queue' 
ORDER BY ordinal_position;

-- Step 2: Check what departments exist
SELECT id, name, description FROM public.departments ORDER BY name;

-- Step 3: Add the new department_id column
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Step 4: Add patient_name column if missing
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- Step 5: Add doctor_name column if missing
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- Step 6: Update patient names by joining with patients table
UPDATE public.queue 
SET patient_name = p.full_name
FROM public.patients p
WHERE public.queue.patient_id = p.id 
  AND public.queue.patient_name IS NULL;

-- Step 7: Get the first available department ID dynamically
-- (This will be used as a default for existing records)
DO $$
DECLARE
    v_default_dept_id UUID;
BEGIN
    SELECT id INTO v_default_dept_id 
    FROM public.departments 
    ORDER BY name 
    LIMIT 1;
    
    -- Update queue items that don't have department_id
    UPDATE public.queue 
    SET department_id = v_default_dept_id
    WHERE department_id IS NULL;
    
    RAISE NOTICE 'Updated queue items with default department: %', v_default_dept_id;
END $$;

-- Step 8: Create a view for better queue management
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
    p.phone as patient_phone
FROM public.queue q
LEFT JOIN public.departments d ON q.department_id = d.id
LEFT JOIN public.patients p ON q.patient_id = p.id;

-- Step 9: Create function to get queue by user's department
CREATE OR REPLACE FUNCTION get_queue_by_user_department(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    patient_id UUID,
    patient_name TEXT,
    status TEXT,
    priority TEXT,
    added_at TIMESTAMPTZ,
    department_id UUID,
    department_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.patient_id,
        q.patient_name,
        q.status,
        q.priority,
        q.added_at,
        q.department_id,
        d.name as department_name
    FROM public.queue q
    JOIN public.departments d ON q.department_id = d.id
    JOIN public.profiles p ON p.id = p_user_id
    WHERE q.department_id = p.department_id
      AND q.status IN ('waiting', 'in-consultation')
    ORDER BY 
        CASE q.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
        END,
        q.added_at ASC;
END;
$$;

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION get_queue_by_user_department(UUID) TO authenticated;
GRANT SELECT ON queue_with_details TO authenticated;

-- Step 11: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_department_id ON public.queue(department_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON public.queue(priority);

-- Step 12: Verify the fix
SELECT 
    q.id,
    q.patient_name,
    q.department_id,
    d.name as department_name,
    q.status
FROM public.queue q
LEFT JOIN public.departments d ON q.department_id = d.id
LIMIT 5;

-- Step 13: Test the new function (replace with your actual user ID)
-- SELECT * FROM get_queue_by_user_department('YOUR_USER_ID_HERE');
