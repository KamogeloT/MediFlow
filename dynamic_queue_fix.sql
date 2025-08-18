-- Dynamic Queue Table Fix - No Hard-coding
-- This migration dynamically handles department assignment and data joins

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'queue' 
ORDER BY ordinal_position;

-- Step 2: Check what departments exist
SELECT id, name, description FROM public.departments ORDER BY name;

-- Step 3: Add the new department_id column if it doesn't exist
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Step 4: Add patient_name column if it doesn't exist
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS patient_name TEXT;

-- Step 5: Add doctor_name column if it doesn't exist
ALTER TABLE public.queue ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- Step 6: Update patient names by joining with patients table
UPDATE public.queue 
SET patient_name = p.full_name
FROM public.patients p
WHERE public.queue.patient_id = p.id 
  AND public.queue.patient_name IS NULL;

-- Step 7: Create a function to dynamically assign departments based on user context
CREATE OR REPLACE FUNCTION assign_queue_departments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_default_dept_id UUID;
    v_queue_item RECORD;
BEGIN
    -- Get the first available department as default (you can modify this logic)
    SELECT id INTO v_default_dept_id 
    FROM public.departments 
    ORDER BY name 
    LIMIT 1;
    
    -- Update queue items that don't have department_id
    FOR v_queue_item IN 
        SELECT id FROM public.queue 
        WHERE department_id IS NULL
    LOOP
        UPDATE public.queue 
        SET department_id = v_default_dept_id
        WHERE id = v_queue_item.id;
    END LOOP;
    
    RAISE NOTICE 'Updated % queue items with default department', v_default_dept_id;
END;
$$;

-- Step 8: Execute the function to assign departments
SELECT assign_queue_departments();

-- Step 9: Create a view for better queue management with joins
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

-- Step 10: Create a function to get queue by user's department
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

-- Step 11: Grant permissions
GRANT EXECUTE ON FUNCTION assign_queue_departments() TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_by_user_department(UUID) TO authenticated;
GRANT SELECT ON queue_with_details TO authenticated;

-- Step 12: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_department_id ON public.queue(department_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON public.queue(priority);
CREATE INDEX IF NOT EXISTS idx_queue_patient_id ON public.queue(patient_id);

-- Step 13: Verify the updated structure
SELECT 
    q.id,
    q.patient_name,
    q.department_id,
    d.name as department_name,
    q.status
FROM public.queue q
LEFT JOIN public.departments d ON q.department_id = d.id
LIMIT 5;

-- Step 14: Test the new function
-- SELECT * FROM get_queue_by_user_department('YOUR_USER_ID_HERE');

-- Step 15: Clean up - drop the temporary function
-- DROP FUNCTION IF EXISTS assign_queue_departments();
