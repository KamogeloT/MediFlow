-- Appointment Check-in Workflow System
-- This system handles the conversion of appointments to queue items on check-in day

-- =====================================================
-- STEP 1: ENHANCE APPOINTMENTS TABLE
-- =====================================================

-- Add check-in status to appointments
ALTER TABLE IF EXISTS public.appointments 
ADD COLUMN IF NOT EXISTS check_in_status text DEFAULT 'scheduled' 
CHECK (check_in_status IN ('scheduled', 'checked_in', 'no_show', 'cancelled'));

-- Add check-in timestamp
ALTER TABLE IF EXISTS public.appointments 
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Add queue item reference
ALTER TABLE IF EXISTS public.appointments 
ADD COLUMN IF NOT EXISTS queue_item_id uuid REFERENCES public.queue(id);

-- =====================================================
-- STEP 2: CREATE APPOINTMENT CHECK-IN FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_in_appointment(
  appointment_id uuid,
  checked_in_by uuid,
  notes text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  appointment_record public.appointments;
  new_queue_item public.queue;
  department_info public.departments;
  patient_info public.patients;
BEGIN
  -- Get appointment details
  SELECT * INTO appointment_record 
  FROM public.appointments 
  WHERE id = appointment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;
  
  -- Check if appointment is already checked in
  IF appointment_record.check_in_status = 'checked_in' THEN
    RAISE EXCEPTION 'Appointment already checked in';
  END IF;
  
  -- Check if appointment is for today
  IF DATE(appointment_record.appointment_time) != CURRENT_DATE THEN
    RAISE EXCEPTION 'Can only check in appointments for today';
  END IF;
  
  -- Get department information
  SELECT * INTO department_info 
  FROM public.departments 
  WHERE id = appointment_record.department_id;
  
  -- Get patient information
  SELECT * INTO patient_info 
  FROM public.patients 
  WHERE id = appointment_record.patient_id;
  
  -- Create new queue item
  INSERT INTO public.queue (
    patient_id,
    patient_name,
    priority,
    notes,
    doctor_id,
    department_id,
    appointment_time,
    status,
    added_at,
    is_walk_in,
    is_appointment_based,
    estimated_wait_time,
    original_appointment_id
  ) VALUES (
    appointment_record.patient_id,
    patient_info.full_name,
    'normal', -- Default priority for appointments
    COALESCE(notes, 'Checked in from appointment'),
    appointment_record.doctor_id,
    appointment_record.department_id,
    appointment_record.appointment_time,
    'waiting',
    NOW(),
    false,
    true,
    0, -- Will be calculated by queue system
    appointment_id
  ) RETURNING * INTO new_queue_item;
  
  -- Update appointment status
  UPDATE public.appointments 
  SET 
    check_in_status = 'checked_in',
    checked_in_at = NOW(),
    queue_item_id = new_queue_item.id
  WHERE id = appointment_id;
  
  -- Archive the appointment (move to appointments_archive)
  INSERT INTO public.appointments_archive (
    id,
    patient_id,
    doctor_id,
    department_id,
    appointment_time,
    status,
    notes,
    created_at,
    check_in_status,
    checked_in_at,
    queue_item_id,
    archived_at
  ) VALUES (
    appointment_record.id,
    appointment_record.patient_id,
    appointment_record.doctor_id,
    appointment_record.department_id,
    appointment_record.appointment_time,
    'completed',
    appointment_record.notes,
    appointment_record.created_at,
    'checked_in',
    NOW(),
    new_queue_item.id,
    NOW()
  );
  
  -- Delete from active appointments
  DELETE FROM public.appointments WHERE id = appointment_id;
  
  -- Log the workflow state change
  INSERT INTO public.workflow_states (
    queue_item_id,
    patient_id,
    current_state,
    previous_state,
    transition_reason,
    created_by
  ) VALUES (
    new_queue_item.id,
    appointment_record.patient_id,
    'checked_in',
    'scheduled',
    'Patient checked in from appointment',
    checked_in_by
  );
  
  -- Log audit trail
  INSERT INTO public.audit_logs (
    action_type,
    table_name,
    record_id,
    old_values,
    new_values,
    user_id,
    user_role,
    user_department_id,
    action_details
  ) VALUES (
    'CHECK_IN',
    'appointments',
    appointment_id,
    jsonb_build_object(
      'check_in_status', 'scheduled',
      'status', appointment_record.status
    ),
    jsonb_build_object(
      'check_in_status', 'checked_in',
      'status', 'completed',
      'queue_item_id', new_queue_item.id
    ),
    checked_in_by,
    'front_desk',
    department_info.id,
    jsonb_build_object(
      'action', 'appointment_check_in',
      'notes', notes,
      'new_queue_item_id', new_queue_item.id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Appointment checked in successfully',
    'queue_item_id', new_queue_item.id,
    'patient_name', patient_info.full_name,
    'department', department_info.name,
    'estimated_wait_time', 0
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to check in appointment'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: CREATE APPOINTMENTS ARCHIVE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.appointments_archive (
  id uuid PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id),
  doctor_id uuid REFERENCES public.profiles(id),
  department_id uuid REFERENCES public.departments(id),
  appointment_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT NOW(),
  check_in_status text DEFAULT 'scheduled',
  checked_in_at timestamptz,
  queue_item_id uuid REFERENCES public.queue(id),
  archived_at timestamptz DEFAULT NOW()
);

-- =====================================================
-- STEP 4: CREATE APPOINTMENT STATUS FUNCTIONS
-- =====================================================

-- Function to get today's appointments that can be checked in
CREATE OR REPLACE FUNCTION public.get_todays_checkin_appointments(
  department_id uuid DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  patient_name text,
  appointment_time timestamptz,
  department_name text,
  doctor_name text,
  status text,
  can_check_in boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    p.full_name as patient_name,
    a.appointment_time,
    d.name as department_name,
    doc.full_name as doctor_name,
    a.status,
    CASE 
      WHEN a.check_in_status = 'scheduled' AND DATE(a.appointment_time) = CURRENT_DATE 
      THEN true 
      ELSE false 
    END as can_check_in
  FROM public.appointments a
  JOIN public.patients p ON a.patient_id = p.id
  JOIN public.departments d ON a.department_id = d.id
  LEFT JOIN public.profiles doc ON a.doctor_id = doc.id
  WHERE DATE(a.appointment_time) = CURRENT_DATE
    AND a.check_in_status = 'scheduled'
    AND (department_id IS NULL OR a.department_id = department_id)
  ORDER BY a.appointment_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get appointment history
CREATE OR REPLACE FUNCTION public.get_appointment_history(
  patient_id uuid DEFAULT NULL,
  days_back integer DEFAULT 30
) RETURNS TABLE (
  id uuid,
  patient_name text,
  appointment_time timestamptz,
  department_name text,
  doctor_name text,
  status text,
  check_in_status text,
  queue_item_id uuid,
  archived_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    p.full_name as patient_name,
    a.appointment_time,
    d.name as department_name,
    doc.full_name as doctor_name,
    a.status,
    a.check_in_status,
    a.queue_item_id,
    a.archived_at
  FROM public.appointments_archive a
  JOIN public.patients p ON a.patient_id = p.id
  JOIN public.departments d ON a.department_id = d.id
  LEFT JOIN public.profiles doc ON a.doctor_id = doc.id
  WHERE (patient_id IS NULL OR a.patient_id = patient_id)
    AND a.archived_at >= NOW() - INTERVAL '1 day' * days_back
  ORDER BY a.archived_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: UPDATE QUEUE FUNCTIONS
-- =====================================================

-- Update the existing get_current_queue_by_doctor function to handle appointment-based queue items
CREATE OR REPLACE FUNCTION public.get_current_queue_by_doctor(
  doctor_id uuid
) RETURNS TABLE (
  id uuid,
  patient_id uuid,
  patient_name text,
  priority text,
  status text,
  added_at timestamptz,
  department_id uuid,
  department_name text,
  doctor_id uuid,
  doctor_name text,
  notes text,
  is_walk_in boolean,
  is_appointment_based boolean,
  appointment_time timestamptz,
  estimated_wait_time integer,
  original_appointment_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.patient_id,
    q.patient_name,
    q.priority,
    q.status,
    q.added_at,
    q.department_id,
    d.name as department_name,
    q.doctor_id,
    doc.full_name as doctor_name,
    q.notes,
    COALESCE(q.is_walk_in, false),
    COALESCE(q.is_appointment_based, false),
    q.appointment_time,
    COALESCE(q.estimated_wait_time, 0),
    q.original_appointment_id
  FROM public.queue q
  JOIN public.departments d ON q.department_id = d.id
  LEFT JOIN public.profiles doc ON q.doctor_id = doc.id
  WHERE q.doctor_id = doctor_id
    AND q.status IN ('waiting', 'in-consultation')
    AND q.added_at >= NOW() - INTERVAL '24 hours'
  ORDER BY 
    CASE q.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    q.added_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.check_in_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_todays_checkin_appointments TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_queue_by_doctor TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments_archive TO authenticated;

-- =====================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_appointments_checkin_status ON public.appointments(check_in_status, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_archive_patient ON public.appointments_archive(patient_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_queue_original_appointment ON public.queue(original_appointment_id);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Appointment Check-in Workflow System created successfully!' as message;
