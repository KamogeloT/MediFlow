-- Workflow and Audit Logging System for Queue Items
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 1: CREATE WORKFLOW LOGGING TABLES
-- =====================================================

-- Workflow states table to track patient journey
CREATE TABLE IF NOT EXISTS public.workflow_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_item_id uuid REFERENCES public.queue(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  current_state text NOT NULL CHECK (current_state IN (
    'registered', 'queued', 'checked_in', 'in_consultation', 
    'consultation_completed', 'prescribed', 'referred', 'discharged'
  )),
  previous_state text,
  state_data jsonb, -- Additional data for the state
  transition_reason text, -- Why the state changed
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Audit log table for all system actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb, -- Previous state
  new_values jsonb, -- New state
  user_id uuid REFERENCES auth.users(id),
  user_role text,
  user_department_id uuid REFERENCES public.departments(id),
  ip_address text,
  user_agent text,
  action_details jsonb, -- Additional context
  created_at timestamptz DEFAULT NOW()
);

-- Patient journey timeline table
CREATE TABLE IF NOT EXISTS public.patient_journey (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  queue_item_id uuid REFERENCES public.queue(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_description text NOT NULL,
  event_data jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_by_role text,
  performed_by_department_id uuid REFERENCES public.departments(id),
  event_timestamp timestamptz DEFAULT NOW()
);

-- =====================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_workflow_states_queue_item ON public.workflow_states(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_patient ON public.workflow_states(patient_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_current_state ON public.workflow_states(current_state);
CREATE INDEX IF NOT EXISTS idx_workflow_states_created_at ON public.workflow_states(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_patient_journey_patient_id ON public.patient_journey(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_journey_queue_item ON public.patient_journey(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_patient_journey_event_type ON public.patient_journey(event_type);
CREATE INDEX IF NOT EXISTS idx_patient_journey_event_timestamp ON public.patient_journey(event_timestamp);

-- =====================================================
-- STEP 3: CREATE WORKFLOW MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create initial workflow state when queue item is created
CREATE OR REPLACE FUNCTION create_workflow_state_for_queue_item()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id uuid;
  v_created_by uuid;
  v_user_role text;
  v_user_department_id uuid;
BEGIN
  -- Get patient ID from the queue item
  v_patient_id := NEW.patient_id;
  
  -- Get the user who created the queue item (from auth context)
  v_created_by := auth.uid();
  
  -- Get user role and department
  SELECT role, department_id INTO v_user_role, v_user_department_id
  FROM public.profiles 
  WHERE id = v_created_by;
  
  -- Create initial workflow state
  INSERT INTO public.workflow_states (
    queue_item_id,
    patient_id,
    current_state,
    transition_reason,
    created_by,
    state_data
  ) VALUES (
    NEW.id,
    v_patient_id,
    'queued',
    'Patient added to queue by front desk',
    v_created_by,
    jsonb_build_object(
      'priority', NEW.priority,
      'is_walk_in', COALESCE(NEW.is_walk_in, false),
      'is_appointment_based', COALESCE(NEW.is_appointment_based, false),
      'notes', NEW.notes
    )
  );
  
  -- Create patient journey entry
  INSERT INTO public.patient_journey (
    patient_id,
    queue_item_id,
    event_type,
    event_description,
    event_data,
    performed_by,
    performed_by_role,
    performed_by_department_id
  ) VALUES (
    v_patient_id,
    NEW.id,
    'queued',
    'Patient added to queue',
    jsonb_build_object(
      'priority', NEW.priority,
      'department_id', NEW.department_id,
      'is_walk_in', COALESCE(NEW.is_walk_in, false),
      'is_appointment_based', COALESCE(NEW.is_appointment_based, false)
    ),
    v_created_by,
    v_user_role,
    v_user_department_id
  );
  
  -- Create audit log entry
  INSERT INTO public.audit_logs (
    action_type,
    table_name,
    record_id,
    new_values,
    user_id,
    user_role,
    user_department_id,
    action_details
  ) VALUES (
    'INSERT',
    'queue',
    NEW.id,
    to_jsonb(NEW),
    v_created_by,
    v_user_role,
    v_user_department_id,
    jsonb_build_object(
      'source', 'front_desk',
      'operation', 'add_to_queue',
      'patient_name', NEW.patient_name,
      'priority', NEW.priority
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update workflow state
CREATE OR REPLACE FUNCTION update_workflow_state(
  p_queue_item_id uuid,
  p_new_state text,
  p_transition_reason text DEFAULT NULL,
  p_state_data jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_workflow_id uuid;
  v_current_state text;
  v_patient_id uuid;
  v_created_by uuid;
  v_user_role text;
  v_user_department_id uuid;
BEGIN
  -- Get current workflow state
  SELECT current_state, patient_id INTO v_current_state, v_patient_id
  FROM public.workflow_states 
  WHERE queue_item_id = p_queue_item_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Get current user info
  v_created_by := auth.uid();
  SELECT role, department_id INTO v_user_role, v_user_department_id
  FROM public.profiles 
  WHERE id = v_created_by;
  
  -- Create new workflow state
  INSERT INTO public.workflow_states (
    queue_item_id,
    patient_id,
    current_state,
    previous_state,
    transition_reason,
    state_data,
    created_by
  ) VALUES (
    p_queue_item_id,
    v_patient_id,
    p_new_state,
    v_current_state,
    p_transition_reason,
    p_state_data
  ) RETURNING id INTO v_workflow_id;
  
  -- Create patient journey entry
  INSERT INTO public.patient_journey (
    patient_id,
    queue_item_id,
    event_type,
    event_description,
    event_data,
    performed_by,
    performed_by_role,
    performed_by_department_id
  ) VALUES (
    v_patient_id,
    p_queue_item_id,
    p_new_state,
    'State changed from ' || COALESCE(v_current_state, 'none') || ' to ' || p_new_state,
    p_state_data,
    v_created_by,
    v_user_role,
    v_user_department_id
  );
  
  RETURN v_workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log queue status changes
CREATE OR REPLACE FUNCTION log_queue_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_user_department_id uuid;
  v_action_type text;
  v_action_details jsonb;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  SELECT role, department_id INTO v_user_role, v_user_department_id
  FROM public.profiles 
  WHERE id = v_user_id;
  
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'INSERT';
    v_action_details := jsonb_build_object(
      'source', 'front_desk',
      'operation', 'add_to_queue'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action_type := 'UPDATE';
    v_action_details := jsonb_build_object(
      'operation', 'update_queue_status',
      'status_changed_from', OLD.status,
      'status_changed_to', NEW.status
    );
    
    -- Update workflow state if status changed
    IF OLD.status != NEW.status THEN
      PERFORM update_workflow_state(
        NEW.id,
        NEW.status,
        'Status updated from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'updated_by', v_user_id
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action_type := 'DELETE';
    v_action_details := jsonb_build_object(
      'operation', 'remove_from_queue'
    );
  END IF;
  
  -- Create audit log entry
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
    v_action_type,
    'queue',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    v_user_id,
    v_user_role,
    v_user_department_id,
    v_action_details
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: CREATE TRIGGERS
-- =====================================================

-- Trigger to create workflow state when queue item is created
DROP TRIGGER IF EXISTS create_workflow_state_trigger ON public.queue;
CREATE TRIGGER create_workflow_state_trigger
  AFTER INSERT ON public.queue
  FOR EACH ROW
  EXECUTE FUNCTION create_workflow_state_for_queue_item();

-- Trigger to log all queue changes
DROP TRIGGER IF EXISTS log_queue_changes_trigger ON public.queue;
CREATE TRIGGER log_queue_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.queue
  FOR EACH ROW
  EXECUTE FUNCTION log_queue_status_change();

-- =====================================================
-- STEP 5: CREATE REPORTING FUNCTIONS
-- =====================================================

-- Function to get patient workflow history
CREATE OR REPLACE FUNCTION get_patient_workflow_history(
  p_patient_id uuid,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE(
  event_type text,
  event_description text,
  event_timestamp timestamptz,
  performed_by_role text,
  performed_by_department text,
  event_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pj.event_type,
    pj.event_description,
    pj.event_timestamp,
    pj.performed_by_role,
    d.name as performed_by_department,
    pj.event_data
  FROM public.patient_journey pj
  LEFT JOIN public.departments d ON pj.performed_by_department_id = d.id
  WHERE pj.patient_id = p_patient_id
    AND pj.event_timestamp >= NOW() - (p_days_back || ' days')::interval
  ORDER BY pj.event_timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get queue item workflow
CREATE OR REPLACE FUNCTION get_queue_item_workflow(
  p_queue_item_id uuid
)
RETURNS TABLE(
  current_state text,
  previous_state text,
  transition_reason text,
  state_data jsonb,
  created_at timestamptz,
  created_by_role text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.current_state,
    ws.previous_state,
    ws.transition_reason,
    ws.state_data,
    ws.created_at,
    p.role as created_by_role
  FROM public.workflow_states ws
  LEFT JOIN public.profiles p ON ws.created_by = p.id
  WHERE ws.queue_item_id = p_queue_item_id
  ORDER BY ws.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit trail for a specific record
CREATE OR REPLACE FUNCTION get_audit_trail(
  p_table_name text,
  p_record_id uuid,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE(
  action_type text,
  old_values jsonb,
  new_values jsonb,
  user_role text,
  user_department text,
  action_details jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.action_type,
    al.old_values,
    al.new_values,
    al.user_role,
    d.name as user_department,
    al.action_details,
    al.created_at
  FROM public.audit_logs al
  LEFT JOIN public.departments d ON al.user_department_id = d.id
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
    AND al.created_at >= NOW() - (p_days_back || ' days')::interval
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON public.workflow_states TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.patient_journey TO authenticated;

GRANT EXECUTE ON FUNCTION update_workflow_state(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_workflow_history(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_queue_item_workflow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_trail(text, uuid, integer) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Workflow and Audit Logging System created successfully!' as message;
