-- Migration to add consultation logging and routing capabilities
-- Run this in your Supabase SQL editor

-- 1. Create consultation_logs table to track all consultation activities
CREATE TABLE IF NOT EXISTS consultation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_item_id UUID NOT NULL REFERENCES queue(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT NOT NULL,
    doctor_id UUID REFERENCES profiles(id),
    doctor_name TEXT,
    department_id UUID NOT NULL REFERENCES departments(id),
    department_name TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'consultation_started',
        'consultation_completed',
        'routed_to_department',
        'notes_added',
        'prescription_added',
        'diagnosis_added',
        'test_ordered',
        'follow_up_scheduled'
    )),
    action_details JSONB,
    previous_department_id UUID REFERENCES departments(id),
    new_department_id UUID REFERENCES departments(id),
    consultation_duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 2. Create consultation_sessions table to track active consultations
CREATE TABLE IF NOT EXISTS consultation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_item_id UUID NOT NULL REFERENCES queue(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id),
    patient_name TEXT NOT NULL,
    doctor_id UUID REFERENCES profiles(id),
    doctor_name TEXT,
    department_id UUID NOT NULL REFERENCES departments(id),
    department_name TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'routed')),
    consultation_notes TEXT,
    diagnosis TEXT,
    prescription TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMPTZ,
    routing_reason TEXT,
    routed_to_department_id UUID REFERENCES departments(id)
);

-- 3. Add new columns to queue table for enhanced routing
ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS consultation_session_id UUID REFERENCES consultation_sessions(id),
ADD COLUMN IF NOT EXISTS routing_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consultation_ended_at TIMESTAMPTZ;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consultation_logs_queue_item_id ON consultation_logs(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_patient_id ON consultation_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_doctor_id ON consultation_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_department_id ON consultation_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_action_type ON consultation_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_created_at ON consultation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_queue_item_id ON consultation_sessions(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_patient_id ON consultation_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_doctor_id ON consultation_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_department_id ON consultation_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_status ON consultation_sessions(status);

-- 5. Create RLS policies for consultation tables
ALTER TABLE consultation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view consultation logs
CREATE POLICY "Allow authenticated users to view consultation logs" ON consultation_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert consultation logs
CREATE POLICY "Allow authenticated users to insert consultation logs" ON consultation_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to view consultation sessions
CREATE POLICY "Allow authenticated users to view consultation sessions" ON consultation_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage consultation sessions
CREATE POLICY "Allow authenticated users to manage consultation sessions" ON consultation_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. Create functions for consultation management

-- Function to start a consultation
CREATE OR REPLACE FUNCTION start_consultation(
    p_queue_item_id UUID,
    p_doctor_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_patient_id UUID;
    v_patient_name TEXT;
    v_department_id UUID;
    v_department_name TEXT;
    v_doctor_name TEXT;
BEGIN
    -- Get queue item details
    SELECT q.patient_id, q.patient_name, q.department_id, d.name, p.full_name
    INTO v_patient_id, v_patient_name, v_department_id, v_department_name, v_doctor_name
    FROM queue q
    JOIN departments d ON q.department_id = d.id
    JOIN profiles p ON p.id = p_doctor_id
    WHERE q.id = p_queue_item_id;
    
    -- Create consultation session
    INSERT INTO consultation_sessions (
        queue_item_id, patient_id, patient_name, doctor_id, doctor_name,
        department_id, department_name, consultation_notes
    ) VALUES (
        p_queue_item_id, v_patient_id, v_patient_name, p_doctor_id, v_doctor_name,
        v_department_id, v_department_name, p_notes
    ) RETURNING id INTO v_session_id;
    
    -- Update queue item
    UPDATE queue 
    SET status = 'in-consultation',
        consultation_session_id = v_session_id,
        consultation_started_at = NOW(),
        checked_in_at = NOW()
    WHERE id = p_queue_item_id;
    
    -- Log the action
    INSERT INTO consultation_logs (
        queue_item_id, patient_id, patient_name, doctor_id, doctor_name,
        department_id, department_name, action_type, action_details
    ) VALUES (
        p_queue_item_id, v_patient_id, v_patient_name, p_doctor_id, v_doctor_name,
        v_department_id, v_department_name, 'consultation_started', 
        jsonb_build_object('session_id', v_session_id, 'notes', p_notes)
    );
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a consultation
CREATE OR REPLACE FUNCTION complete_consultation(
    p_queue_item_id UUID,
    p_diagnosis TEXT DEFAULT NULL,
    p_prescription TEXT DEFAULT NULL,
    p_follow_up_required BOOLEAN DEFAULT FALSE,
    p_follow_up_date TIMESTAMPTZ DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_session_id UUID;
    v_patient_id UUID;
    v_patient_name TEXT;
    v_doctor_id UUID;
    v_doctor_name TEXT;
    v_department_id UUID;
    v_department_name TEXT;
    v_started_at TIMESTAMPTZ;
BEGIN
    -- Get consultation session details
    SELECT cs.id, cs.patient_id, cs.patient_name, cs.doctor_id, cs.doctor_name,
           cs.department_id, cs.department_name, cs.started_at
    INTO v_session_id, v_patient_id, v_patient_name, v_doctor_id, v_doctor_name,
         v_department_id, v_department_name, v_started_at
    FROM consultation_sessions cs
    WHERE cs.queue_item_id = p_queue_item_id AND cs.status = 'active';
    
    -- Update consultation session
    UPDATE consultation_sessions 
    SET status = 'completed',
        ended_at = NOW(),
        diagnosis = p_diagnosis,
        prescription = p_prescription,
        follow_up_required = p_follow_up_required,
        follow_up_date = p_follow_up_date,
        consultation_notes = p_notes
    WHERE id = v_session_id;
    
    -- Update queue item
    UPDATE queue 
    SET status = 'completed',
        consultation_ended_at = NOW(),
        completed_at = NOW()
    WHERE id = p_queue_item_id;
    
    -- Calculate consultation duration
    DECLARE
        v_duration_minutes INTEGER;
    BEGIN
        v_duration_minutes := EXTRACT(EPOCH FROM (NOW() - v_started_at)) / 60;
        
        -- Log the completion
        INSERT INTO consultation_logs (
            queue_item_id, patient_id, patient_name, doctor_id, doctor_name,
            department_id, department_name, action_type, action_details,
            consultation_duration_minutes, notes
        ) VALUES (
            p_queue_item_id, v_patient_id, v_patient_name, v_doctor_id, v_doctor_name,
            v_department_id, v_department_name, 'consultation_completed',
            jsonb_build_object(
                'session_id', v_session_id,
                'diagnosis', p_diagnosis,
                'prescription', p_prescription,
                'follow_up_required', p_follow_up_required,
                'follow_up_date', p_follow_up_date
            ),
            v_duration_minutes, p_notes
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to route consultation to new department
CREATE OR REPLACE FUNCTION route_consultation(
    p_queue_item_id UUID,
    p_new_department_id UUID,
    p_routing_reason TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_session_id UUID;
    v_patient_id UUID;
    v_patient_name TEXT;
    v_doctor_id UUID;
    v_doctor_name TEXT;
    v_old_department_id UUID;
    v_old_department_name TEXT;
    v_new_department_name TEXT;
    v_routing_history JSONB;
BEGIN
    -- Get current consultation details
    SELECT cs.id, cs.patient_id, cs.patient_name, cs.doctor_id, cs.doctor_name,
           cs.department_id, d.name
    INTO v_session_id, v_patient_id, v_patient_name, v_doctor_id, v_doctor_name,
         v_old_department_id, v_old_department_name
    FROM consultation_sessions cs
    JOIN departments d ON cs.department_id = d.id
    WHERE cs.queue_item_id = p_queue_item_id AND cs.status = 'active';
    
    -- Get new department name
    SELECT name INTO v_new_department_name
    FROM departments WHERE id = p_new_department_id;
    
    -- Get current routing history
    SELECT COALESCE(routing_history, '[]'::jsonb) INTO v_routing_history
    FROM queue WHERE id = p_queue_item_id;
    
    -- Add new routing entry to history
    v_routing_history := v_routing_history || jsonb_build_object(
        'from_department_id', v_old_department_id,
        'from_department_name', v_old_department_name,
        'to_department_id', p_new_department_id,
        'to_department_name', v_new_department_name,
        'routing_reason', p_routing_reason,
        'routed_at', NOW(),
        'routed_by_doctor_id', v_doctor_id,
        'routed_by_doctor_name', v_doctor_name,
        'notes', p_notes
    );
    
    -- Update consultation session
    UPDATE consultation_sessions 
    SET status = 'routed',
        ended_at = NOW(),
        routing_reason = p_routing_reason,
        routed_to_department_id = p_new_department_id
    WHERE id = v_session_id;
    
    -- Update queue item
    UPDATE queue 
    SET status = 'waiting',
        department_id = p_new_department_id,
        consultation_ended_at = NOW(),
        routing_history = v_routing_history,
        consultation_session_id = NULL
    WHERE id = p_queue_item_id;
    
    -- Log the routing action
    INSERT INTO consultation_logs (
        queue_item_id, patient_id, patient_name, doctor_id, doctor_name,
        department_id, department_name, action_type, action_details,
        previous_department_id, new_department_id, notes
    ) VALUES (
        p_queue_item_id, v_patient_id, v_patient_name, v_doctor_id, v_doctor_name,
        v_old_department_id, v_old_department_name, 'routed_to_department',
        jsonb_build_object(
            'session_id', v_session_id,
            'routing_reason', p_routing_reason,
            'old_department', v_old_department_name,
            'new_department', v_new_department_name
        ),
        v_old_department_id, p_new_department_id, p_notes
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Grant permissions
GRANT ALL ON consultation_logs TO authenticated;
GRANT ALL ON consultation_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION start_consultation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_consultation(UUID, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION route_consultation(UUID, UUID, TEXT, TEXT) TO authenticated;

-- 8. Create views for easy access to consultation data
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
    EXTRACT(EPOCH FROM (cs.ended_at - cs.started_at)) / 60 as duration_minutes
FROM consultation_sessions cs
LEFT JOIN departments d2 ON cs.routed_to_department_id = d2.id;

GRANT SELECT ON consultation_summary TO authenticated;
