-- Create a flexible appointment status system using lookup tables
-- This replaces hardcoded status values with a proper relational structure

-- Step 1: Create the appointment_statuses lookup table
CREATE TABLE IF NOT EXISTS public.appointment_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert the standard appointment statuses
INSERT INTO public.appointment_statuses (code, name, description, sort_order) VALUES
    ('scheduled', 'Scheduled', 'Appointment is scheduled for future date', 1),
    ('checked_in', 'Checked In', 'Patient has checked in and been added to queue', 2),
    ('in_progress', 'In Progress', 'Patient is currently being seen by doctor', 3),
    ('completed', 'Completed', 'Appointment has been completed successfully', 4),
    ('cancelled', 'Cancelled', 'Appointment was cancelled by patient or staff', 5),
    ('no_show', 'No Show', 'Patient did not arrive for scheduled appointment', 6),
    ('rescheduled', 'Rescheduled', 'Appointment was rescheduled to different time', 7),
    ('waiting', 'Waiting', 'Patient is waiting for doctor to be available', 8)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Step 3: Create a function to get status by code
CREATE OR REPLACE FUNCTION get_appointment_status_id(status_code VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
    status_id INTEGER;
BEGIN
    SELECT id INTO status_id 
    FROM public.appointment_statuses 
    WHERE code = status_code AND is_active = true;
    
    IF status_id IS NULL THEN
        RAISE EXCEPTION 'Invalid appointment status code: %', status_code;
    END IF;
    
    RETURN status_id;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a function to get status code by ID
CREATE OR REPLACE FUNCTION get_appointment_status_code(status_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    status_code VARCHAR(50);
BEGIN
    SELECT code INTO status_code 
    FROM public.appointment_statuses 
    WHERE id = status_id AND is_active = true;
    
    IF status_code IS NULL THEN
        RAISE EXCEPTION 'Invalid appointment status ID: %', status_id;
    END IF;
    
    RETURN status_code;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update the appointments table to use foreign key instead of check constraint
DO $$ 
BEGIN
    -- Add status_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'status_id') THEN
        ALTER TABLE public.appointments ADD COLUMN status_id INTEGER;
    END IF;
    
    -- Drop the old status column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'status') THEN
        -- First, migrate existing data from status to status_id
        UPDATE public.appointments 
        SET status_id = get_appointment_status_id(status)
        WHERE status IS NOT NULL AND status_id IS NULL;
        
        -- Then drop the old status column
        ALTER TABLE public.appointments DROP COLUMN status;
    END IF;
    
    -- Add foreign key constraint for status_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_status_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_status_id_fkey 
        FOREIGN KEY (status_id) REFERENCES public.appointment_statuses(id);
    END IF;
    
    -- Set default status_id to 'scheduled' for new appointments
    ALTER TABLE public.appointments ALTER COLUMN status_id SET DEFAULT get_appointment_status_id('scheduled');
    
    -- Make status_id NOT NULL after setting defaults
    ALTER TABLE public.appointments ALTER COLUMN status_id SET NOT NULL;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error during migration: %', SQLERRM;
END $$;

-- Step 6: Create a view for easy appointment status access
CREATE OR REPLACE VIEW public.appointments_with_status AS
SELECT 
    a.*,
    s.code as status_code,
    s.name as status_name,
    s.description as status_description
FROM public.appointments a
JOIN public.appointment_statuses s ON a.status_id = s.id
WHERE s.is_active = true;

-- Step 7: Create a function to update appointment status
CREATE OR REPLACE FUNCTION update_appointment_status(
    appointment_uuid UUID,
    new_status_code VARCHAR(50),
    user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_status_code VARCHAR(50);
    new_status_id INTEGER;
BEGIN
    -- Get the new status ID
    new_status_id := get_appointment_status_id(new_status_code);
    
    -- Get the old status code for logging
    SELECT s.code INTO old_status_code
    FROM public.appointments a
    JOIN public.appointment_statuses s ON a.status_id = s.id
    WHERE a.id = appointment_uuid;
    
    -- Update the appointment status
    UPDATE public.appointments 
    SET status_id = new_status_id, updated_at = NOW()
    WHERE id = appointment_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment not found: %', appointment_uuid;
    END IF;
    
    -- Log the status change if audit_logs table exists
    BEGIN
        INSERT INTO public.audit_logs (
            action, 
            table_name, 
            record_id, 
            old_values, 
            new_values, 
            user_id, 
            description
        ) VALUES (
            'status_update',
            'appointments',
            appointment_uuid,
            jsonb_build_object('status', old_status_code),
            jsonb_build_object('status', new_status_code),
            user_id,
            format('Appointment status changed from %s to %s', old_status_code, new_status_code)
        );
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Failed to log status change: %', SQLERRM;
    END;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create a function to get all active statuses
CREATE OR REPLACE FUNCTION get_active_appointment_statuses()
RETURNS TABLE (
    id INTEGER,
    code VARCHAR(50),
    name VARCHAR(100),
    description TEXT,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.code,
        s.name,
        s.description,
        s.sort_order
    FROM public.appointment_statuses s
    WHERE s.is_active = true
    ORDER BY s.sort_order, s.name;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_status_id ON public.appointments(status_id);
CREATE INDEX IF NOT EXISTS idx_appointment_statuses_code ON public.appointment_statuses(code);
CREATE INDEX IF NOT EXISTS idx_appointment_statuses_active ON public.appointment_statuses(is_active);

-- Step 10: Grant permissions
GRANT ALL ON public.appointment_statuses TO authenticated;
GRANT ALL ON public.appointment_statuses TO service_role;
GRANT SELECT ON public.appointments_with_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_appointment_status_id(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_appointment_status_code(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_appointment_status(UUID, VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_appointment_statuses() TO authenticated;

-- Step 11: Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_appointment_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_appointment_statuses_updated_at'
    ) THEN
        CREATE TRIGGER update_appointment_statuses_updated_at
            BEFORE UPDATE ON public.appointment_statuses
            FOR EACH ROW
            EXECUTE FUNCTION update_appointment_statuses_updated_at();
    END IF;
END $$;

-- Step 12: Show the current status of the system
SELECT 'Appointment Status System Created Successfully!' as message;

-- Display all available statuses
SELECT 
    'Available Statuses:' as info,
    code,
    name,
    description,
    sort_order
FROM public.appointment_statuses 
ORDER BY sort_order;

-- Show appointments table structure
SELECT 
    'Appointments Table Structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;
