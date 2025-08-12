-- Consultation BPM System Migration
-- This migration creates the complete consultation workflow management system

-- 1. Consultation Sessions Table
CREATE TABLE IF NOT EXISTS public.consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID NOT NULL REFERENCES public.queue(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_name TEXT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'routed', 'archived')),
  consultation_notes TEXT,
  diagnosis TEXT,
  prescription TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  routing_reason TEXT,
  routed_to_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Consultation Logs Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.consultation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_session_id UUID REFERENCES public.consultation_sessions(id) ON DELETE CASCADE,
  queue_item_id UUID NOT NULL REFERENCES public.queue(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_name TEXT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'consultation_started', 
    'consultation_completed', 
    'routed_to_department', 
    'notes_added', 
    'prescription_added', 
    'diagnosis_added', 
    'test_ordered', 
    'follow_up_scheduled',
    'consultation_archived'
  )),
  action_details JSONB,
  previous_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  new_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  consultation_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Consultation Workflow States Table
CREATE TABLE IF NOT EXISTS public.consultation_workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_session_id UUID NOT NULL REFERENCES public.consultation_sessions(id) ON DELETE CASCADE,
  current_state TEXT NOT NULL DEFAULT 'started' CHECK (current_state IN (
    'started', 'in_progress', 'examination', 'diagnosis', 'prescription', 'routing', 'completed', 'archived'
  )),
  previous_state TEXT,
  state_data JSONB,
  transition_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 4. Department Routing Rules Table
CREATE TABLE IF NOT EXISTS public.department_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  to_department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  routing_condition TEXT NOT NULL,
  routing_reason TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert default routing rules
INSERT INTO public.department_routing_rules (from_department_id, to_department_id, routing_condition, routing_reason) VALUES
  ((SELECT id FROM departments WHERE name = 'General Medicine'), (SELECT id FROM departments WHERE name = 'Cardiology'), 'cardiac_symptoms', 'Cardiac symptoms detected'),
  ((SELECT id FROM departments WHERE name = 'General Medicine'), (SELECT id FROM departments WHERE name = 'Orthopedics'), 'musculoskeletal_symptoms', 'Bone/joint issues detected'),
  ((SELECT id FROM departments WHERE name = 'General Medicine'), (SELECT id FROM departments WHERE name = 'Surgery'), 'surgical_intervention', 'Surgical intervention required'),
  ((SELECT id FROM departments WHERE name = 'Emergency Medicine'), (SELECT id FROM departments WHERE name = 'Surgery'), 'emergency_surgery', 'Emergency surgical procedure needed');

-- 6. Update queue table to support routing
ALTER TABLE public.queue 
DROP CONSTRAINT IF EXISTS queue_status_check;

ALTER TABLE public.queue 
ADD CONSTRAINT queue_status_check 
CHECK (status IN ('waiting', 'in-consultation', 'completed', 'routed'));

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_queue_item ON public.consultation_sessions(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_patient ON public.consultation_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_doctor ON public.consultation_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_department ON public.consultation_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_status ON public.consultation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_consultation_logs_session ON public.consultation_logs(consultation_session_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_queue_item ON public.consultation_logs(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_patient ON public.consultation_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_action_type ON public.consultation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_created_at ON public.consultation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_states_session ON public.consultation_workflow_states(consultation_session_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_current ON public.consultation_workflow_states(current_state);

-- 8. Enable Row Level Security
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_routing_rules ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies
-- Consultation Sessions: Users can see sessions in their department
CREATE POLICY "department_access_consultation_sessions" ON public.consultation_sessions
  FOR ALL USING (
    department_id IN (
      SELECT department_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin')
    )
  );

-- Consultation Logs: Users can see logs in their department
CREATE POLICY "department_access_consultation_logs" ON public.consultation_logs
  FOR ALL USING (
    department_id IN (
      SELECT department_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin')
    )
  );

-- Workflow States: Users can see workflow states in their department
CREATE POLICY "department_access_workflow_states" ON public.consultation_workflow_states
  FOR ALL USING (
    consultation_session_id IN (
      SELECT id FROM public.consultation_sessions 
      WHERE department_id IN (
        SELECT department_id FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin')
      )
    )
  );

-- Routing Rules: All authenticated users can see routing rules
CREATE POLICY "authenticated_access_routing_rules" ON public.department_routing_rules
  FOR SELECT USING (auth.role() = 'authenticated');

-- 10. Create Functions for BPM Operations

-- Function to start consultation
CREATE OR REPLACE FUNCTION start_consultation(
  p_queue_item_id UUID,
  p_doctor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_queue_item RECORD;
  v_doctor_name TEXT;
  v_department_name TEXT;
BEGIN
     -- Get queue item details
   SELECT qi.*, p.full_name as patient_name, d.name as department_name
   INTO v_queue_item
   FROM queue qi
   JOIN patients p ON qi.patient_id = p.id
   JOIN departments d ON qi.department_id = d.id
   WHERE qi.id = p_queue_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found';
  END IF;
  
  -- Get doctor name
  SELECT full_name INTO v_doctor_name
  FROM profiles
  WHERE id = p_doctor_id;
  
  -- Create consultation session
  INSERT INTO consultation_sessions (
    queue_item_id, patient_id, patient_name, doctor_id, doctor_name,
    department_id, department_name, consultation_notes
  ) VALUES (
    p_queue_item_id, v_queue_item.patient_id, v_queue_item.patient_name,
    p_doctor_id, v_doctor_name, v_queue_item.department_id, v_queue_item.department_name,
    p_notes
  ) RETURNING id INTO v_session_id;
  
  -- Log the action
  INSERT INTO consultation_logs (
    consultation_session_id, queue_item_id, patient_id, patient_name,
    doctor_id, doctor_name, department_id, department_name,
    action_type, action_details, created_by
  ) VALUES (
    v_session_id, p_queue_item_id, v_queue_item.patient_id, v_queue_item.patient_name,
    p_doctor_id, v_doctor_name, v_queue_item.department_id, v_queue_item.department_name,
    'consultation_started', jsonb_build_object('notes', p_notes), p_doctor_id
  );
  
  -- Create initial workflow state
  INSERT INTO consultation_workflow_states (
    consultation_session_id, current_state, state_data, created_by
  ) VALUES (
    v_session_id, 'started', jsonb_build_object('notes', p_notes), p_doctor_id
  );
  
     -- Update queue item status
   UPDATE queue 
   SET status = 'in-consultation', checked_in_at = NOW()
   WHERE id = p_queue_item_id;
  
  RETURN v_session_id;
END;
$$;

-- Function to complete consultation
CREATE OR REPLACE FUNCTION complete_consultation(
  p_queue_item_id UUID,
  p_diagnosis TEXT DEFAULT NULL,
  p_prescription TEXT DEFAULT NULL,
  p_follow_up_required BOOLEAN DEFAULT FALSE,
  p_follow_up_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_doctor_id UUID;
  v_duration_minutes INTEGER;
BEGIN
  -- Get consultation session
  SELECT id, doctor_id, EXTRACT(EPOCH FROM (NOW() - started_at))/60
  INTO v_session_id, v_doctor_id, v_duration_minutes
  FROM consultation_sessions
  WHERE queue_item_id = p_queue_item_id AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active consultation session not found';
  END IF;
  
  -- Update consultation session
  UPDATE consultation_sessions
  SET 
    status = 'completed',
    ended_at = NOW(),
    diagnosis = p_diagnosis,
    prescription = p_prescription,
    follow_up_required = p_follow_up_required,
    follow_up_date = p_follow_up_date,
    consultation_notes = COALESCE(consultation_notes, '') || E'\n' || COALESCE(p_notes, ''),
    updated_at = NOW()
  WHERE id = v_session_id;
  
  -- Log the completion
  INSERT INTO consultation_logs (
    consultation_session_id, queue_item_id, patient_id, patient_name,
    doctor_id, doctor_name, department_id, department_name,
    action_type, action_details, consultation_duration_minutes, created_by
  )
  SELECT 
    v_session_id, queue_item_id, patient_id, patient_name,
    doctor_id, doctor_name, department_id, department_name,
    'consultation_completed', 
    jsonb_build_object(
      'diagnosis', p_diagnosis,
      'prescription', p_prescription,
      'follow_up_required', p_follow_up_required,
      'follow_up_date', p_follow_up_date,
      'notes', p_notes
    ),
    v_duration_minutes,
    v_doctor_id
  FROM consultation_sessions
  WHERE id = v_session_id;
  
  -- Update workflow state
  INSERT INTO consultation_workflow_states (
    consultation_session_id, current_state, previous_state, state_data, created_by
  ) VALUES (
    v_session_id, 'completed', 'in_progress', 
    jsonb_build_object('diagnosis', p_diagnosis, 'prescription', p_prescription), 
    v_doctor_id
  );
  
     -- Update queue item status
   UPDATE queue 
   SET status = 'completed', completed_at = NOW()
   WHERE id = p_queue_item_id;
END;
$$;

-- Function to route consultation to new department
CREATE OR REPLACE FUNCTION route_consultation(
  p_queue_item_id UUID,
  p_new_department_id UUID,
  p_routing_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_doctor_id UUID;
  v_patient_id UUID;
  v_patient_name TEXT;
  v_new_department_name TEXT;
  v_current_department_id UUID;
  v_duration_minutes INTEGER;
BEGIN
  -- Get consultation session and new department name
  SELECT 
    cs.id, cs.doctor_id, cs.patient_id, cs.patient_name, cs.department_id,
    EXTRACT(EPOCH FROM (NOW() - cs.started_at))/60
  INTO v_session_id, v_doctor_id, v_patient_id, v_patient_name, v_current_department_id, v_duration_minutes
  FROM consultation_sessions cs
  WHERE cs.queue_item_id = p_queue_item_id AND cs.status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active consultation session not found';
  END IF;
  
  SELECT name INTO v_new_department_name
  FROM departments
  WHERE id = p_new_department_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'New department not found';
  END IF;
  
  -- Update consultation session
  UPDATE consultation_sessions
  SET 
    status = 'routed',
    ended_at = NOW(),
    routing_reason = p_routing_reason,
    routed_to_department_id = p_new_department_id,
    consultation_notes = COALESCE(consultation_notes, '') || E'\n' || COALESCE(p_notes, ''),
    updated_at = NOW()
  WHERE id = v_session_id;
  
  -- Log the routing
  INSERT INTO consultation_logs (
    consultation_session_id, queue_item_id, patient_id, patient_name,
    doctor_id, doctor_name, department_id, department_name,
    action_type, action_details, previous_department_id, new_department_id,
    consultation_duration_minutes, notes, created_by
  )
  SELECT 
    v_session_id, queue_item_id, patient_id, patient_name,
    doctor_id, doctor_name, department_id, department_name,
    'routed_to_department', 
    jsonb_build_object('routing_reason', p_routing_reason, 'notes', p_notes),
    v_current_department_id, p_new_department_id,
    v_duration_minutes, p_notes, v_doctor_id
  FROM consultation_sessions
  WHERE id = v_session_id;
  
  -- Update workflow state
  INSERT INTO consultation_workflow_states (
    consultation_session_id, current_state, previous_state, state_data, created_by
  ) VALUES (
    v_session_id, 'routing', 'in_progress', 
    jsonb_build_object('routing_reason', p_routing_reason, 'new_department', v_new_department_name), 
    v_doctor_id
  );
  
     -- Create new queue item in the new department
   INSERT INTO queue (
     patient_id, patient_name, department_id, priority, notes, status
   ) VALUES (
     v_patient_id, v_patient_name, p_new_department_id, 'normal',
     'Routed from ' || (SELECT name FROM departments WHERE id = v_current_department_id) || ': ' || p_routing_reason,
     'waiting'
   );
  
     -- Update original queue item status
   UPDATE queue 
   SET status = 'completed', completed_at = NOW()
   WHERE id = p_queue_item_id;
END;
$$;

-- Function to archive consultation
CREATE OR REPLACE FUNCTION archive_consultation(
  p_queue_item_id UUID,
  p_archive_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_doctor_id UUID;
BEGIN
  -- Get consultation session
  SELECT id, doctor_id
  INTO v_session_id, v_doctor_id
  FROM consultation_sessions
  WHERE queue_item_id = p_queue_item_id AND status IN ('completed', 'routed');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consultation session not found or not in final state';
  END IF;
  
  -- Update consultation session
  UPDATE consultation_sessions
  SET 
    status = 'archived',
    updated_at = NOW()
  WHERE id = v_session_id;
  
  -- Log the archiving
  INSERT INTO consultation_logs (
    consultation_session_id, queue_item_id, patient_id, patient_name,
    doctor_id, doctor_name, department_id, department_name,
    action_type, action_details, created_by
  )
  SELECT 
    v_session_id, queue_item_id, patient_id, patient_name,
    doctor_id, doctor_name, department_id, department_name,
    'consultation_archived', 
    jsonb_build_object('archive_reason', p_archive_reason),
    v_doctor_id
  FROM consultation_sessions
  WHERE id = v_session_id;
  
  -- Update workflow state
  INSERT INTO consultation_workflow_states (
    consultation_session_id, current_state, previous_state, state_data, created_by
  ) VALUES (
    v_session_id, 'archived', 
    (SELECT current_state FROM consultation_workflow_states WHERE consultation_session_id = v_session_id ORDER BY created_at DESC LIMIT 1),
    jsonb_build_object('archive_reason', p_archive_reason), 
    v_doctor_id
  );
END;
$$;

-- 11. Create views for easy data access

-- Consultation Summary View
CREATE OR REPLACE VIEW consultation_summary AS
SELECT 
  cs.id as session_id,
  cs.queue_item_id,
  cs.patient_name,
  cs.doctor_name,
  cs.department_name,
  cs.started_at,
  cs.ended_at,
  cs.status,
  cs.diagnosis,
  cs.prescription,
  cs.follow_up_required,
  cs.follow_up_date,
  cs.routing_reason,
  d2.name as routed_to_department,
  EXTRACT(EPOCH FROM (cs.ended_at - cs.started_at))/60 as duration_minutes
FROM consultation_sessions cs
LEFT JOIN departments d2 ON cs.routed_to_department_id = d2.id;

-- 12. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
