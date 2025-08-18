-- Enhanced Department Filtering - Permanent Solution
-- This replaces the need for redundant access control in consultation functions
-- Run this in your Supabase SQL Editor

-- Step 1: Create a comprehensive function to get queue items for a doctor's assigned departments
CREATE OR REPLACE FUNCTION get_queue_by_doctor_departments(
  p_doctor_id uuid
)
RETURNS TABLE(
  id uuid,
  patient_id uuid,
  patient_name text,
  status text,
  priority text,
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
    q.priority,
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
  JOIN public.departments d ON q.department_id = d.id
  LEFT JOIN public.profiles p ON q.doctor_id = p.id
  JOIN public.doctor_departments dd ON dd.doctor_id = p_doctor_id AND dd.department_id = q.department_id
  WHERE q.status != 'completed'
  ORDER BY 
    CASE q.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    q.added_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_queue_by_doctor_departments TO authenticated;

-- Step 2: Create a function to get queue stats for a doctor's departments
CREATE OR REPLACE FUNCTION get_queue_stats_by_doctor_departments(
  p_doctor_id uuid
)
RETURNS TABLE(
  department_id uuid,
  department_name text,
  total_patients bigint,
  waiting_patients bigint,
  in_consultation_patients bigint,
  completed_patients bigint,
  average_wait_time numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as department_id,
    d.name as department_name,
    COUNT(*) as total_patients,
    COUNT(*) FILTER (WHERE q.status = 'waiting') as waiting_patients,
    COUNT(*) FILTER (WHERE q.status = 'in-consultation') as in_consultation_patients,
    COUNT(*) FILTER (WHERE q.status = 'completed') as completed_patients,
    AVG(EXTRACT(EPOCH FROM (COALESCE(q.checked_in_at, NOW()) - q.added_at))/60) as average_wait_time
  FROM public.queue q
  JOIN public.departments d ON q.department_id = d.id
  JOIN public.doctor_departments dd ON dd.doctor_id = p_doctor_id AND dd.department_id = q.department_id
  GROUP BY d.id, d.name
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_queue_stats_by_doctor_departments TO authenticated;

-- Step 3: Create a function to check if a doctor can access a specific queue item
-- This is now just a simple verification since the queue is already filtered
CREATE OR REPLACE FUNCTION can_doctor_access_queue_item(
  p_doctor_id uuid,
  p_queue_item_id uuid
)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := FALSE;
BEGIN
  -- Check if the doctor has access to the queue item's department
  SELECT EXISTS(
    SELECT 1 FROM public.queue q
    JOIN public.doctor_departments dd ON dd.doctor_id = p_doctor_id AND dd.department_id = q.department_id
    WHERE q.id = p_queue_item_id
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_doctor_access_queue_item TO authenticated;

-- Step 4: Create a view for doctor's department assignments with queue counts
CREATE OR REPLACE VIEW doctor_department_queue_view AS
SELECT 
  dd.doctor_id,
  p.full_name as doctor_name,
  dd.department_id,
  d.name as department_name,
  d.description as department_description,
  COUNT(q.id) FILTER (WHERE q.status = 'waiting') as waiting_patients,
  COUNT(q.id) FILTER (WHERE q.status = 'in-consultation') as in_consultation_patients,
  COUNT(q.id) FILTER (WHERE q.status = 'completed') as completed_patients,
  COUNT(q.id) as total_patients
FROM public.doctor_departments dd
JOIN public.profiles p ON dd.doctor_id = p.id
JOIN public.departments d ON dd.department_id = d.id
LEFT JOIN public.queue q ON dd.department_id = q.department_id
WHERE p.role = 'doctor'
GROUP BY dd.doctor_id, p.full_name, dd.department_id, d.name, d.description
ORDER BY p.full_name, d.name;

-- Grant select permission
GRANT SELECT ON doctor_department_queue_view TO authenticated;

-- Step 5: Create a function to get all departments a doctor can work in
CREATE OR REPLACE FUNCTION get_doctor_accessible_departments(
  p_doctor_id uuid
)
RETURNS TABLE(
  department_id uuid,
  department_name text,
  department_description text,
  waiting_patients bigint,
  in_consultation_patients bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as department_id,
    d.name as department_name,
    d.description as department_description,
    COUNT(q.id) FILTER (WHERE q.status = 'waiting') as waiting_patients,
    COUNT(q.id) FILTER (WHERE q.status = 'in-consultation') as in_consultation_patients
  FROM public.doctor_departments dd
  JOIN public.departments d ON dd.department_id = d.id
  LEFT JOIN public.queue q ON dd.department_id = q.department_id AND q.status IN ('waiting', 'in-consultation')
  WHERE dd.doctor_id = p_doctor_id
  GROUP BY d.id, d.name, d.description
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_doctor_accessible_departments TO authenticated;

-- Step 6: Update the existing verify_doctor_access_db function to use the new approach
CREATE OR REPLACE FUNCTION verify_doctor_access_db(
  p_queue_item_id uuid,
  p_doctor_id uuid
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Simply call the new function
  RETURN can_doctor_access_queue_item(p_doctor_id, p_queue_item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a function to get queue items by department for a specific doctor
CREATE OR REPLACE FUNCTION get_queue_by_department_for_doctor(
  p_doctor_id uuid,
  p_department_id uuid
)
RETURNS TABLE(
  id uuid,
  patient_id uuid,
  patient_name text,
  status text,
  priority text,
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
  -- First verify the doctor has access to this department
  IF NOT EXISTS(
    SELECT 1 FROM public.doctor_departments 
    WHERE doctor_id = p_doctor_id AND department_id = p_department_id
  ) THEN
    RETURN; -- Return empty result if no access
  END IF;

  RETURN QUERY
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
    p.full_name as doctor_name,
    q.department_id,
    d.name as department_name,
    q.appointment_time,
    q.estimated_wait_time,
    q.is_walk_in
  FROM public.queue q
  JOIN public.departments d ON q.department_id = d.id
  LEFT JOIN public.profiles p ON q.doctor_id = p.id
  WHERE q.department_id = p_department_id AND q.status != 'completed'
  ORDER BY 
    CASE q.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    q.added_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_queue_by_department_for_doctor TO authenticated;

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_department_status ON public.queue(department_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_priority_added ON public.queue(priority, added_at);
CREATE INDEX IF NOT EXISTS idx_doctor_departments_doctor_dept ON public.doctor_departments(doctor_id, department_id);

-- Step 9: Verify the setup
SELECT 'Enhanced department filtering system setup complete' as status;
