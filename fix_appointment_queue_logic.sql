-- Fix Appointment vs Queue Logic
-- This script separates appointments from queue items and implements proper lifecycle management
-- Run this in your Supabase SQL Editor

-- Step 1: Add missing columns to queue table if they don't exist
DO $$ 
BEGIN
  -- Add is_appointment_based column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queue' AND column_name = 'is_appointment_based') THEN
    ALTER TABLE public.queue ADD COLUMN is_appointment_based boolean DEFAULT false;
  END IF;
  
  -- Add appointment_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queue' AND column_name = 'appointment_id') THEN
    ALTER TABLE public.queue ADD COLUMN appointment_id uuid REFERENCES public.appointments(id);
  END IF;
  
  -- Add appointment_time column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queue' AND column_name = 'appointment_time') THEN
    ALTER TABLE public.queue ADD COLUMN appointment_time timestamptz;
  END IF;
END $$;

-- Step 2: Create a function to convert appointments to queue items for current date
CREATE OR REPLACE FUNCTION convert_appointments_to_queue()
RETURNS void AS $$
BEGIN
  -- Insert appointments for today that don't already have queue items
  INSERT INTO public.queue (
    patient_id,
    patient_name,
    department_id,
    status,
    priority,
    added_at,
    is_appointment_based,
    appointment_id,
    appointment_time,
    estimated_wait_time,
    is_walk_in
  )
  SELECT 
    a.patient_id,
    p.full_name as patient_name,
    a.department_id,
    'waiting' as status,
    CASE 
      WHEN a.priority = 'high' THEN 'high'
      WHEN a.priority = 'medium' THEN 'medium'
      ELSE 'low'
    END as priority,
    NOW() as added_at,
    true as is_appointment_based,
    a.id as appointment_id,
    a.appointment_time,
    0 as estimated_wait_time,
    false as is_walk_in
  FROM public.appointments a
  JOIN public.patients p ON a.patient_id = p.id
  LEFT JOIN public.queue q ON a.id = q.appointment_id
  WHERE 
    DATE(a.appointment_time) = CURRENT_DATE
    AND a.status = 'confirmed'
    AND q.id IS NULL; -- Only if no queue item exists yet
    
  -- Update appointment status to 'in_queue'
  UPDATE public.appointments 
  SET status = 'in_queue'
  WHERE 
    DATE(appointment_time) = CURRENT_DATE
    AND status = 'confirmed'
    AND id IN (
      SELECT a.id FROM public.appointments a
      LEFT JOIN public.queue q ON a.id = q.appointment_id
      WHERE q.id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a function to archive expired queue items (older than 24 hours)
CREATE OR REPLACE FUNCTION archive_expired_queue_items()
RETURNS void AS $$
BEGIN
  -- Archive queue items older than 24 hours
  INSERT INTO public.queue_archive (
    queue_id,
    patient_id,
    patient_name,
    department_id,
    status,
    priority,
    added_at,
    archived_at,
    archive_reason,
    is_appointment_based,
    appointment_id,
    appointment_time,
    notes,
    doctor_id,
    checked_in_at,
    completed_at
  )
  SELECT 
    q.id,
    q.patient_id,
    q.patient_name,
    q.department_id,
    q.status,
    q.priority,
    q.added_at,
    NOW() as archived_at,
    'Expired - older than 24 hours' as archive_reason,
    q.is_appointment_based,
    q.appointment_id,
    q.appointment_time,
    q.notes,
    q.doctor_id,
    q.checked_in_at,
    q.completed_at
  FROM public.queue q
  WHERE 
    q.added_at < NOW() - INTERVAL '24 hours'
    AND q.status NOT IN ('completed', 'in-consultation');
    
  -- Delete expired queue items
  DELETE FROM public.queue 
  WHERE added_at < NOW() - INTERVAL '24 hours'
    AND status NOT IN ('completed', 'in-consultation');
    
  -- Update appointments that were in queue but expired
  UPDATE public.appointments 
  SET status = 'expired'
  WHERE 
    status = 'in_queue'
    AND appointment_time < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a function to get current queue items (filtered by doctor's departments)
CREATE OR REPLACE FUNCTION get_current_queue_by_doctor(
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
  is_walk_in boolean,
  is_appointment_based boolean
) AS $$
BEGIN
  -- First, ensure appointments are converted to queue items for today
  PERFORM convert_appointments_to_queue();
  
  -- Then, archive expired items
  PERFORM archive_expired_queue_items();
  
  -- Return current queue items for doctor's departments
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
    COALESCE(q.estimated_wait_time, 0) as estimated_wait_time,
    COALESCE(q.is_walk_in, false) as is_walk_in,
    COALESCE(q.is_appointment_based, false) as is_appointment_based
  FROM public.queue q
  JOIN public.departments d ON q.department_id = d.id
  LEFT JOIN public.profiles p ON q.doctor_id = p.id
  WHERE 
    -- Only show items from doctor's assigned departments
    q.department_id IN (
      SELECT department_id FROM public.doctor_departments 
      WHERE doctor_id = p_doctor_id
      UNION
      SELECT department_id FROM public.profiles 
      WHERE id = p_doctor_id AND department_id IS NOT NULL
    )
    -- Only show current items (not expired)
    AND q.added_at >= NOW() - INTERVAL '24 hours'
    -- Only show waiting or in-consultation items
    AND q.status IN ('waiting', 'in-consultation')
  ORDER BY 
    q.priority DESC,
    q.added_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to get upcoming appointments (not yet in queue)
CREATE OR REPLACE FUNCTION get_upcoming_appointments_by_doctor(
  p_doctor_id uuid
)
RETURNS TABLE(
  id uuid,
  patient_id uuid,
  patient_name text,
  appointment_time timestamptz,
  department_id uuid,
  department_name text,
  priority text,
  status text,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.patient_id,
    p.full_name as patient_name,
    a.appointment_time,
    a.department_id,
    d.name as department_name,
    a.priority,
    a.status,
    a.reason
  FROM public.appointments a
  JOIN public.patients p ON a.patient_id = p.id
  JOIN public.departments d ON a.department_id = d.id
  WHERE 
    -- Only show appointments for doctor's assigned departments
    a.department_id IN (
      SELECT department_id FROM public.doctor_departments 
      WHERE doctor_id = p_doctor_id
      UNION
      SELECT department_id FROM public.profiles 
      WHERE id = p_doctor_id AND department_id IS NOT NULL
    )
    -- Only show future appointments
    AND a.appointment_time > NOW()
    -- Only show confirmed appointments
    AND a.status = 'confirmed'
  ORDER BY a.appointment_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a function to get past appointments (for archiving)
CREATE OR REPLACE FUNCTION get_past_appointments_by_doctor(
  p_doctor_id uuid,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE(
  id uuid,
  patient_id uuid,
  patient_name text,
  appointment_time timestamptz,
  department_id uuid,
  department_name text,
  status text,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.patient_id,
    p.full_name as patient_name,
    a.appointment_time,
    a.department_id,
    d.name as department_name,
    a.status,
    a.reason
  FROM public.appointments a
  JOIN public.patients p ON a.patient_id = p.id
  JOIN public.departments d ON a.department_id = d.id
  WHERE 
    -- Only show appointments for doctor's assigned departments
    a.department_id IN (
      SELECT department_id FROM public.doctor_departments 
      WHERE doctor_id = p_doctor_id
      UNION
      SELECT department_id FROM public.profiles 
      WHERE id = p_doctor_id AND department_id IS NOT NULL
    )
    -- Only show past appointments
    AND a.appointment_time < NOW()
    -- Only show appointments within specified days back
    AND a.appointment_time >= NOW() - (p_days_back || ' days')::interval
  ORDER BY a.appointment_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create a function to manually add walk-in patients to queue
CREATE OR REPLACE FUNCTION add_walk_in_to_queue(
  p_patient_id uuid,
  p_department_id uuid,
  p_priority text DEFAULT 'medium',
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_queue_id uuid;
  v_patient_name text;
BEGIN
  -- Get patient name
  SELECT full_name INTO v_patient_name 
  FROM public.patients 
  WHERE id = p_patient_id;
  
  -- Insert walk-in patient into queue
  INSERT INTO public.queue (
    patient_id,
    patient_name,
    department_id,
    status,
    priority,
    added_at,
    notes,
    is_appointment_based,
    is_walk_in
  ) VALUES (
    p_patient_id,
    v_patient_name,
    p_department_id,
    'waiting',
    p_priority,
    NOW(),
    p_notes,
    false,
    true
  ) RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_added_at ON public.queue(added_at);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_department ON public.queue(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Step 9: Create queue_archive table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.queue_archive (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id uuid,
  patient_id uuid,
  patient_name text,
  department_id uuid,
  status text,
  priority text,
  added_at timestamptz,
  archived_at timestamptz DEFAULT NOW(),
  archive_reason text,
  is_appointment_based boolean DEFAULT false,
  appointment_id uuid,
  appointment_time timestamptz,
  notes text,
  doctor_id uuid,
  checked_in_at timestamptz,
  completed_at timestamptz
);

-- Step 10: Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL,
  action_details jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Step 11: Update existing queue items to mark them as non-appointment based
UPDATE public.queue 
SET is_appointment_based = false 
WHERE is_appointment_based IS NULL;

-- Step 12: Create a scheduled job to run cleanup (optional - can be run manually)
CREATE OR REPLACE FUNCTION daily_queue_maintenance()
RETURNS void AS $$
BEGIN
  -- Convert today's appointments to queue items
  PERFORM convert_appointments_to_queue();
  
  -- Archive expired queue items
  PERFORM archive_expired_queue_items();
  
  -- Log the maintenance
  INSERT INTO public.system_logs (
    action_type,
    action_details,
    created_at
  ) VALUES (
    'daily_queue_maintenance',
    jsonb_build_object(
      'appointments_converted', (SELECT COUNT(*) FROM public.queue WHERE is_appointment_based = true AND DATE(added_at) = CURRENT_DATE),
      'expired_items_archived', (SELECT COUNT(*) FROM public.queue_archive WHERE DATE(archived_at) = CURRENT_DATE)
    ),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Step 13: Grant necessary permissions
GRANT EXECUTE ON FUNCTION convert_appointments_to_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION archive_expired_queue_items() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_queue_by_doctor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_appointments_by_doctor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_past_appointments_by_doctor(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION add_walk_in_to_queue(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_queue_maintenance() TO authenticated;

-- Step 14: Run initial maintenance
SELECT daily_queue_maintenance();

-- Success message
SELECT 'Appointment vs Queue logic has been fixed successfully!' as message;
