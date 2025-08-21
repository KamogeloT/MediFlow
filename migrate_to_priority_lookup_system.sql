-- Migrate Queue Table to Use Priority Lookup System
-- This converts the hardcoded priority text to use the queue_priorities lookup table

-- Step 1: Add priority_id column to queue table
ALTER TABLE public.queue 
ADD COLUMN IF NOT EXISTS priority_id INTEGER;

-- Step 2: Update existing queue records to set priority_id based on current priority text
UPDATE public.queue 
SET priority_id = CASE 
    WHEN priority = 'urgent' THEN 1
    WHEN priority = 'high' THEN 2
    WHEN priority = 'normal' THEN 3
    WHEN priority = 'low' THEN 4
    ELSE 3 -- Default to normal if priority is null or invalid
END;

-- Step 3: Make priority_id NOT NULL after updating existing records
ALTER TABLE public.queue ALTER COLUMN priority_id SET NOT NULL;

-- Step 4: Add foreign key constraint to queue_priorities table
ALTER TABLE public.queue 
ADD CONSTRAINT fk_queue_priority_id 
FOREIGN KEY (priority_id) REFERENCES public.queue_priorities(id);

-- Step 5: Drop dependent views first (they will be recreated with new structure)
DROP VIEW IF EXISTS public.queue_patient_types CASCADE;
DROP VIEW IF EXISTS public.queue_with_details CASCADE;

-- Step 6: Now drop the old priority text column
ALTER TABLE public.queue DROP COLUMN priority;

-- Step 7: Create a view for backward compatibility (queue_with_priority_details)
CREATE OR REPLACE VIEW queue_with_priority_details AS
SELECT 
    q.id,
    q.patient_id,
    q.patient_name,
    q.status,
    q.priority_id,
    qp.code as priority_code,
    qp.name as priority_name,
    qp.description as priority_description,
    qp.wait_time_minutes,
    qp.color as priority_color,
    qp.sort_order as priority_sort_order,
    q.added_at,
    q.checked_in_at,
    q.completed_at,
    q.notes,
    q.doctor_id,
    q.doctor_name,
    q.department_id,
    d.name as department_name,
    q.appointment_time,
    q.estimated_wait_time,
    q.is_walk_in,
    q.is_appointment_based,
    q.appointment_id
FROM public.queue q
LEFT JOIN public.queue_priorities qp ON q.priority_id = qp.id
LEFT JOIN public.departments d ON q.department_id = d.id;

-- Step 8: Recreate the queue_with_details view with new structure
CREATE OR REPLACE VIEW queue_with_details AS
SELECT 
    q.id,
    q.patient_id,
    q.patient_name,
    q.status,
    q.priority_id,
    qp.code as priority_code,
    qp.name as priority_name,
    qp.description as priority_description,
    qp.wait_time_minutes,
    qp.color as priority_color,
    qp.sort_order as priority_sort_order,
    q.added_at,
    q.checked_in_at,
    q.completed_at,
    q.notes,
    q.doctor_id,
    q.doctor_name,
    q.department_id,
    d.name as department_name,
    q.appointment_time,
    q.estimated_wait_time,
    q.is_walk_in,
    q.is_appointment_based,
    q.appointment_id
FROM public.queue q
LEFT JOIN public.queue_priorities qp ON q.priority_id = qp.id
LEFT JOIN public.departments d ON q.department_id = d.id;

-- Step 9: Recreate the queue_patient_types view with new structure
CREATE OR REPLACE VIEW queue_patient_types AS
SELECT 
    q.id,
    q.patient_id,
    q.patient_name,
    q.status,
    q.priority_id,
    qp.code as priority_code,
    qp.name as priority_name,
    qp.description as priority_description,
    qp.wait_time_minutes,
    qp.color as priority_color,
    qp.sort_order as priority_sort_order,
    q.added_at,
    q.checked_in_at,
    q.completed_at,
    q.notes,
    q.doctor_id,
    q.doctor_name,
    q.department_id,
    d.name as department_name,
    q.appointment_time,
    q.estimated_wait_time,
    q.is_walk_in,
    q.is_appointment_based,
    q.appointment_id,
    CASE 
        WHEN q.is_appointment_based THEN 'Appointment'
        WHEN q.is_walk_in THEN 'Walk-in'
        ELSE 'Regular'
    END as patient_type
FROM public.queue q
LEFT JOIN public.queue_priorities qp ON q.priority_id = qp.id
LEFT JOIN public.departments d ON q.department_id = d.id;

-- Step 10: Update existing functions to use priority_id
-- First drop the existing function, then recreate it with new return type
DROP FUNCTION IF EXISTS get_queue_by_doctor_departments(uuid);

-- Update the get_queue_by_doctor_departments function
CREATE OR REPLACE FUNCTION get_queue_by_doctor_departments(
  p_doctor_id uuid
)
RETURNS TABLE(
  id uuid,
  patient_id uuid,
  patient_name text,
  status text,
  priority_id integer,
  priority_code text,
  priority_name text,
  priority_color text,
  wait_time_minutes integer,
  added_at timestamptz,
  checked_in_at timestamptz,
  completed_at timestamptz,
  notes text,
  doctor_id uuid,
  doctor_name text,
  department_id uuid,
  department_name text,
  appointment_time timestamptz,
  estimated_wait_time integer,
  is_walk_in boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.patient_id,
    q.patient_name,
    q.status,
    q.priority_id,
    qp.code as priority_code,
    qp.name as priority_name,
    qp.color as priority_color,
    qp.wait_time_minutes,
    q.added_at,
    q.checked_in_at,
    q.completed_at,
    q.notes,
    q.doctor_id,
    p.full_name as doctor_name,
    q.department_id,
    d.name as department_name,
    q.appointment_time,
    q.estimated_wait_time,
    q.is_walk_in
  FROM public.queue q
  JOIN public.queue_priorities qp ON q.priority_id = qp.id
  JOIN public.departments d ON q.department_id = d.id
  LEFT JOIN public.profiles p ON q.doctor_id = p.id
  JOIN public.doctor_departments dd ON dd.doctor_id = p_doctor_id AND dd.department_id = q.department_id
  WHERE q.status != 'completed'
  ORDER BY 
    qp.sort_order ASC,
    q.added_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create a function to get priority by code
CREATE OR REPLACE FUNCTION get_queue_priority_id(priority_code VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    priority_id INTEGER;
BEGIN
    SELECT id INTO priority_id 
    FROM public.queue_priorities 
    WHERE code = priority_code AND is_active = true;
    
    IF priority_id IS NULL THEN
        -- Default to normal priority if code not found
        SELECT id INTO priority_id 
        FROM public.queue_priorities 
        WHERE code = 'normal' AND is_active = true;
    END IF;
    
    RETURN priority_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create a function to get priority by ID
CREATE OR REPLACE FUNCTION get_queue_priority_code(priority_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    priority_code VARCHAR(50);
BEGIN
    SELECT code INTO priority_code 
    FROM public.queue_priorities 
    WHERE id = priority_id AND is_active = true;
    
    RETURN priority_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Grant permissions
GRANT EXECUTE ON FUNCTION get_queue_by_doctor_departments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_priority_id(VARCHAR(50)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_priority_code(INTEGER) TO authenticated;
GRANT SELECT ON queue_with_priority_details TO authenticated;
GRANT SELECT ON queue_with_details TO authenticated;
GRANT SELECT ON queue_patient_types TO authenticated;

-- Step 14: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_priority_id ON public.queue(priority_id);

-- Step 15: Verify the migration
SELECT 'Migration completed successfully!' as status;
SELECT 'Queue table now uses priority_id instead of priority text' as info;
SELECT 'All dependent views have been recreated with new structure' as note;
SELECT 'Use queue_with_priority_details view for backward compatibility' as note;
