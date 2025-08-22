-- =====================================================
-- NURSE ROLE SYSTEM IMPLEMENTATION
-- =====================================================
-- This script creates the complete nurse role system for MediFlow
-- Includes: Nurse role, vitals tracking, allergies management, and medical notes

-- =====================================================
-- STEP 1: UPDATE PROFILES TABLE TO INCLUDE NURSE ROLE
-- =====================================================

-- Update the profiles table to allow 'nurse' role
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('doctor', 'front-desk', 'admin', 'nurse'));

-- =====================================================
-- STEP 1.5: ENSURE REQUIRED COLUMNS EXIST IN PATIENTS TABLE
-- =====================================================

-- Add missing columns to patients table if they don't exist
DO $$ 
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'address') THEN
        ALTER TABLE public.patients ADD COLUMN address TEXT;
    END IF;
    
    -- Add blood_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'blood_type') THEN
        ALTER TABLE public.patients ADD COLUMN blood_type TEXT CHECK (blood_type IN ('a+', 'a-', 'b+', 'b-', 'ab+', 'ab-', 'o+', 'o-', 'unknown'));
    END IF;
    
    -- Add medical_history column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'medical_history') THEN
        ALTER TABLE public.patients ADD COLUMN medical_history TEXT;
    END IF;
    
    -- Add current_medications column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'current_medications') THEN
        ALTER TABLE public.patients ADD COLUMN current_medications TEXT;
    END IF;
    
    -- Add allergies column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'allergies') THEN
        ALTER TABLE public.patients ADD COLUMN allergies TEXT;
    END IF;
    
    -- Add emergency_contact_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'emergency_contact_name') THEN
        ALTER TABLE public.patients ADD COLUMN emergency_contact_name TEXT;
    END IF;
    
    -- Add emergency_contact_phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'emergency_contact_phone') THEN
        ALTER TABLE public.patients ADD COLUMN emergency_contact_phone TEXT;
    END IF;
    
    -- Add emergency_contact_relation column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'emergency_contact_relation') THEN
        ALTER TABLE public.patients ADD COLUMN emergency_contact_relation TEXT;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'updated_at') THEN
        ALTER TABLE public.patients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- STEP 2: CREATE VITALS TRACKING SYSTEM
-- =====================================================

-- Vitals table for patient vital signs
CREATE TABLE IF NOT EXISTS public.patient_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    recorded_by UUID NOT NULL REFERENCES auth.users(id), -- Nurse who recorded vitals
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Vital signs
    blood_pressure_systolic INTEGER CHECK (blood_pressure_systolic > 0 AND blood_pressure_systolic < 300),
    blood_pressure_diastolic INTEGER CHECK (blood_pressure_diastolic > 0 AND blood_pressure_diastolic < 200),
    heart_rate INTEGER CHECK (heart_rate > 0 AND heart_rate < 300),
    temperature DECIMAL(3,1) CHECK (temperature > 30.0 AND temperature < 45.0),
    respiratory_rate INTEGER CHECK (respiratory_rate > 0 AND respiratory_rate < 100),
    oxygen_saturation INTEGER CHECK (oxygen_saturation >= 0 AND oxygen_saturation <= 100),
    weight_kg DECIMAL(5,2) CHECK (weight_kg > 0 AND weight_kg < 1000),
    height_cm DECIMAL(5,2) CHECK (height_cm > 0 AND height_cm < 300),
    
    -- Additional measurements
    bmi DECIMAL(4,2),
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    
    -- Notes and context
    notes TEXT,
    is_abnormal BOOLEAN DEFAULT FALSE,
    abnormal_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: ENHANCE ALLERGIES MANAGEMENT
-- =====================================================

-- Allergies table for detailed allergy tracking
CREATE TABLE IF NOT EXISTS public.patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    allergy_type TEXT NOT NULL CHECK (allergy_type IN ('medication', 'food', 'environmental', 'latex', 'other')),
    allergen_name TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
    reaction_description TEXT,
    onset_date DATE,
    last_reaction_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Management details
    management_plan TEXT,
    emergency_medication TEXT,
    notes TEXT,
    
    -- Record keeping
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 4: CREATE MEDICAL NOTES SYSTEM
-- =====================================================

-- Ensure encounters table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS public.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES auth.users(id),
    encounter_date TIMESTAMPTZ DEFAULT NOW(),
    encounter_type TEXT DEFAULT 'consultation',
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical notes table for nurse observations
CREATE TABLE IF NOT EXISTS public.nurse_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES auth.users(id),
    note_type TEXT NOT NULL CHECK (note_type IN (
        'vital_signs', 'patient_assessment', 'medication_administration', 
        'patient_education', 'care_coordination', 'symptom_observation',
        'treatment_response', 'discharge_planning', 'other'
    )),
    note_title TEXT NOT NULL,
    note_content TEXT NOT NULL,
    
    -- Context and priority
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    
    -- Related entities
    related_encounter_id UUID REFERENCES public.encounters(id),
    related_queue_item_id UUID REFERENCES public.queue(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- STEP 5: CREATE NURSE-SPECIFIC VIEWS
-- =====================================================

-- Ensure departments table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure queue table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS public.queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'checked_in', 'in-consultation', 'completed')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    appointment_time TIMESTAMPTZ,
    estimated_wait_time INTEGER -- in minutes
);

-- Add missing columns to queue table if they don't exist
DO $$ 
BEGIN
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'queue' AND column_name = 'priority') THEN
        ALTER TABLE public.queue ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

-- View for nurses to see all patients across departments
-- Only references columns that actually exist in the patients table
CREATE OR REPLACE VIEW nurse_patient_overview AS
SELECT 
    p.id as patient_id,
    p.full_name,
    p.date_of_birth,
    p.address,
    p.email,
    p.phone,
    p.blood_type,
    p.medical_history,
    p.current_medications,
    p.allergies,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    
    -- Latest vitals (if available)
    pv.recorded_at as last_vitals_date,
    pv.blood_pressure_systolic,
    pv.blood_pressure_diastolic,
    pv.heart_rate,
    pv.temperature,
    pv.oxygen_saturation,
    pv.is_abnormal as vitals_abnormal,
    
    -- Queue status (if in queue)
    q.status as current_queue_status,
    q.priority as current_priority,
    q.department_id,
    d.name as department_name,
    q.added_at as queued_at,
    
    -- Recent notes (if available)
    nn.note_title as latest_note_title,
    nn.created_at as latest_note_date,
    nn.priority as latest_note_priority,
    
    p.created_at,
    p.updated_at
FROM public.patients p
LEFT JOIN LATERAL (
    SELECT * FROM public.patient_vitals pv2 
    WHERE pv2.patient_id = p.id 
    ORDER BY pv2.recorded_at DESC 
    LIMIT 1
) pv ON true
LEFT JOIN public.queue q ON q.patient_id = p.id AND q.status IN ('waiting', 'checked_in', 'in-consultation')
LEFT JOIN public.departments d ON q.department_id = d.id
LEFT JOIN LATERAL (
    SELECT * FROM public.nurse_notes nn2 
    WHERE nn2.patient_id = p.id 
    ORDER BY nn2.created_at DESC 
    LIMIT 1
) nn ON true
ORDER BY 
    CASE q.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        WHEN 'low' THEN 4 
        ELSE 5
    END,
    COALESCE(q.added_at, p.created_at);

-- =====================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: CREATE SECURITY POLICIES
-- =====================================================

-- Nurses can view all patients and their data
CREATE POLICY "Nurses can view all patients" ON public.patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can view all vitals
CREATE POLICY "Nurses can view all vitals" ON public.patient_vitals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can insert/update vitals for any patient
CREATE POLICY "Nurses can manage vitals" ON public.patient_vitals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can view all allergies
CREATE POLICY "Nurses can view all allergies" ON public.patient_allergies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can manage allergies for any patient
CREATE POLICY "Nurses can manage allergies" ON public.patient_allergies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can view all notes
CREATE POLICY "Nurses can view all notes" ON public.nurse_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can manage their own notes
CREATE POLICY "Nurses can manage their notes" ON public.nurse_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can view all queue items across departments
CREATE POLICY "Nurses can view all queue items" ON public.queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- Nurses can view all encounters
CREATE POLICY "Nurses can view all encounters" ON public.encounters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'nurse'
        )
    );

-- =====================================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient_id ON public.patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_at ON public.patient_vitals(recorded_at);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_is_abnormal ON public.patient_vitals(is_abnormal);

CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient_id ON public.patient_allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_allergy_type ON public.patient_allergies(allergy_type);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_severity ON public.patient_allergies(severity);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_is_active ON public.patient_allergies(is_active);

CREATE INDEX IF NOT EXISTS idx_nurse_notes_patient_id ON public.nurse_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_notes_nurse_id ON public.nurse_notes(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_notes_note_type ON public.nurse_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_nurse_notes_priority ON public.nurse_notes(priority);
CREATE INDEX IF NOT EXISTS idx_nurse_notes_created_at ON public.nurse_notes(created_at);

-- =====================================================
-- STEP 9: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to calculate BMI
CREATE OR REPLACE FUNCTION calculate_bmi(weight_kg DECIMAL, height_cm DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF weight_kg IS NULL OR height_cm IS NULL OR height_cm = 0 THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND((weight_kg / POWER(height_cm / 100, 2))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to check if vitals are abnormal
CREATE OR REPLACE FUNCTION check_vitals_abnormal(
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL,
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        (bp_systolic IS NOT NULL AND (bp_systolic < 90 OR bp_systolic > 140)) OR
        (bp_diastolic IS NOT NULL AND (bp_diastolic < 60 OR bp_diastolic > 90)) OR
        (heart_rate IS NOT NULL AND (heart_rate < 60 OR heart_rate > 100)) OR
        (temperature IS NOT NULL AND (temperature < 36.0 OR temperature > 37.5)) OR
        (respiratory_rate IS NOT NULL AND (respiratory_rate < 12 OR respiratory_rate > 20)) OR
        (oxygen_saturation IS NOT NULL AND oxygen_saturation < 95)
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 10: INSERT SAMPLE NURSE DATA (OPTIONAL)
-- =====================================================

-- Uncomment and modify the following lines when you have actual nurse user IDs
-- INSERT INTO public.profiles (id, full_name, role, created_at) 
-- VALUES (gen_random_uuid(), 'Nurse Sarah Wilson', 'nurse', NOW());

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Nurse role system created successfully!' as status;
SELECT 'Tables created: patient_vitals, patient_allergies, nurse_notes' as tables_created;
SELECT 'Views created: nurse_patient_overview' as views_created;
SELECT 'Policies created for nurse access across all departments' as policies_created;
