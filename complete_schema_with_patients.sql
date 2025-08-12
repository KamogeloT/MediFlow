-- Complete Medical Flow Database Schema
-- This script creates all necessary tables for the appointment and queue management system

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    date_of_birth DATE,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    blood_type TEXT CHECK (blood_type IN ('a+', 'a-', 'b+', 'b-', 'ab+', 'ab-', 'o+', 'o-', 'unknown')),
    medical_history TEXT,
    current_medications TEXT,
    allergies TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create profiles table (if not exists from auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'front-desk', 'admin')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    specialization TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create queue table
CREATE TABLE IF NOT EXISTS queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in-consultation', 'completed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    appointment_time TIMESTAMPTZ,
    estimated_wait_time INTEGER -- in minutes
);

-- 6. Create indexes for better performance
-- Departments
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_department_id ON appointments(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_time ON appointments(doctor_id, start_time, end_time);

-- Queue
CREATE INDEX IF NOT EXISTS idx_queue_department_id ON queue(department_id);
CREATE INDEX IF NOT EXISTS idx_queue_doctor_id ON queue(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue(priority);
CREATE INDEX IF NOT EXISTS idx_queue_added_at ON queue(added_at);
CREATE INDEX IF NOT EXISTS idx_queue_patient_id ON queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_priority_time ON queue(priority DESC, added_at ASC);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies

-- Departments: Everyone can read
CREATE POLICY "Everyone can view departments" ON departments
    FOR SELECT USING (true);

-- Patients: Front desk can manage all, doctors can view their department's patients
CREATE POLICY "Front desk can manage all patients" ON patients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'front-desk'
        )
    );

CREATE POLICY "Doctors can view patients in their department" ON patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'doctor'
        )
    );

-- Profiles: Users can view their own profile, front desk can view all
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Front desk can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'front-desk'
        )
    );

-- Appointments: Doctors see their own, front desk sees all
CREATE POLICY "Users can view their own appointments" ON appointments
    FOR SELECT USING (
        auth.uid() = doctor_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'front-desk'
        )
    );

CREATE POLICY "Doctors can update their own appointments" ON appointments
    FOR UPDATE USING (auth.uid() = doctor_id);

CREATE POLICY "Front desk can manage all appointments" ON appointments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'front-desk'
        )
    );

-- Queue: Users can view queue items in their department, front desk can manage all
CREATE POLICY "Users can view queue items in their department" ON queue
    FOR SELECT USING (
        auth.uid() = doctor_id OR 
        department_id = (
            SELECT department_id FROM profiles WHERE profiles.id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'front-desk'
        )
    );

CREATE POLICY "Doctors can update their own queue items" ON queue
    FOR UPDATE USING (auth.uid() = doctor_id);

CREATE POLICY "Front desk can manage all queue items" ON queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'front-desk'
        )
    );

-- 9. Create functions for common operations

-- Function to calculate estimated wait time
CREATE OR REPLACE FUNCTION calculate_wait_time(
    p_department_id UUID,
    p_priority TEXT
) RETURNS INTEGER AS $$
DECLARE
    base_wait_time INTEGER;
    position_wait_time INTEGER;
BEGIN
    -- Base wait times for each priority (in minutes)
    CASE p_priority
        WHEN 'urgent' THEN base_wait_time := 0;
        WHEN 'high' THEN base_wait_time := 15;
        WHEN 'normal' THEN base_wait_time := 30;
        WHEN 'low' THEN base_wait_time := 45;
        ELSE base_wait_time := 30;
    END CASE;
    
    -- Calculate position-based wait time
    SELECT COALESCE(COUNT(*) * 20, 0) INTO position_wait_time
    FROM queue 
    WHERE department_id = p_department_id 
    AND status = 'waiting'
    AND priority = p_priority;
    
    RETURN base_wait_time + position_wait_time;
END;
$$ LANGUAGE plpgsql;

-- Function to update queue status with timestamps
CREATE OR REPLACE FUNCTION update_queue_status(
    p_queue_id UUID,
    p_status TEXT,
    p_doctor_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE queue 
    SET 
        status = p_status,
        checked_in_at = CASE WHEN p_status = 'in-consultation' THEN NOW() ELSE checked_in_at END,
        completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END,
        doctor_id = CASE WHEN p_status = 'in-consultation' AND p_doctor_id IS NOT NULL THEN p_doctor_id ELSE doctor_id END
    WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers for automatic updates

-- Apply trigger to appointments table
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to queue table
CREATE TRIGGER update_queue_estimated_wait_time
    BEFORE INSERT OR UPDATE ON queue
    FOR EACH ROW
    EXECUTE FUNCTION update_estimated_wait_time();

-- 11. Insert sample data

-- Insert sample departments
INSERT INTO departments (id, name, description) VALUES
    (gen_random_uuid(), 'Cardiology', 'Heart and cardiovascular care'),
    (gen_random_uuid(), 'Dermatology', 'Skin care and treatment'),
    (gen_random_uuid(), 'Neurology', 'Brain and nervous system care'),
    (gen_random_uuid(), 'Orthopedics', 'Bone and joint care'),
    (gen_random_uuid(), 'Pediatrics', 'Children''s healthcare'),
    (gen_random_uuid(), 'Emergency Medicine', 'Urgent care and emergency treatment')
ON CONFLICT (name) DO NOTHING;

-- Insert sample patients
INSERT INTO patients (id, full_name, email, phone, blood_type) VALUES
    (gen_random_uuid(), 'John Smith', 'john.smith@email.com', '+1-555-0101', 'o+'),
    (gen_random_uuid(), 'Maria Garcia', 'maria.garcia@email.com', '+1-555-0102', 'a+'),
    (gen_random_uuid(), 'Robert Wilson', 'robert.wilson@email.com', '+1-555-0103', 'b+'),
    (gen_random_uuid(), 'Sarah Johnson', 'sarah.johnson@email.com', '+1-555-0104', 'ab+'),
    (gen_random_uuid(), 'Michael Chen', 'michael.chen@email.com', '+1-555-0105', 'o-')
ON CONFLICT DO NOTHING;

-- 12. Create views for common queries

-- View for appointment conflicts
CREATE OR REPLACE VIEW appointment_conflicts AS
SELECT 
    a1.id as appointment1_id,
    a1.doctor_id,
    a1.start_time as start1,
    a1.end_time as end1,
    a2.id as appointment2_id,
    a2.start_time as start2,
    a2.end_time as end2
FROM appointments a1
JOIN appointments a2 ON a1.doctor_id = a2.doctor_id 
    AND a1.id != a2.id
    AND a1.status != 'cancelled' 
    AND a2.status != 'cancelled'
WHERE (a1.start_time < a2.end_time AND a1.end_time > a2.start_time);

-- View for queue statistics
CREATE OR REPLACE VIEW queue_stats AS
SELECT 
    department_id,
    d.name as department_name,
    COUNT(*) as total_patients,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
    COUNT(CASE WHEN status = 'in-consultation' THEN 1 END) as in_consultation,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    AVG(CASE WHEN checked_in_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (checked_in_at - added_at))/60 
        END) as avg_wait_time_minutes
FROM queue q
JOIN departments d ON q.department_id = d.id
GROUP BY department_id, d.name;

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 14. Verification queries
-- Uncomment these to verify the setup:

-- SELECT 'Departments' as table_name, COUNT(*) as count FROM departments
-- UNION ALL
-- SELECT 'Patients', COUNT(*) FROM patients
-- UNION ALL
-- SELECT 'Profiles', COUNT(*) FROM profiles
-- UNION ALL
-- SELECT 'Appointments', COUNT(*) FROM appointments
-- UNION ALL
-- SELECT 'Queue', COUNT(*) FROM queue;

-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('departments', 'patients', 'profiles', 'appointments', 'queue')
-- ORDER BY table_name, ordinal_position;
