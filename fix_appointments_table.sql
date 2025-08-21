-- Fix appointments table structure for front desk dashboard
-- First, let's check what columns exist and add only the missing ones

-- Check if appointments table exists, if not create it
CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES public.patients(id),
    department_id uuid REFERENCES public.departments(id),
    appointment_date date DEFAULT CURRENT_DATE,
    appointment_time time DEFAULT '09:00:00',
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show')),
    reason text DEFAULT 'General consultation',
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add appointment_date if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_date') THEN
        ALTER TABLE public.appointments ADD COLUMN appointment_date date DEFAULT CURRENT_DATE;
    END IF;
    
    -- Add appointment_time if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_time') THEN
        ALTER TABLE public.appointments ADD COLUMN appointment_time time DEFAULT '09:00:00';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'status') THEN
        ALTER TABLE public.appointments ADD COLUMN status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'));
    END IF;
    
    -- Add reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'reason') THEN
        ALTER TABLE public.appointments ADD COLUMN reason text DEFAULT 'General consultation';
    END IF;
    
    -- Add department_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'department_id') THEN
        ALTER TABLE public.appointments ADD COLUMN department_id uuid;
    END IF;
    
    -- Add created_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'created_at') THEN
        ALTER TABLE public.appointments ADD COLUMN created_at timestamp with time zone DEFAULT NOW();
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'updated_at') THEN
        ALTER TABLE public.appointments ADD COLUMN updated_at timestamp with time zone DEFAULT NOW();
    END IF;
END $$;

-- Fix the status check constraint if it exists and is too restrictive
DO $$ 
BEGIN
    -- Drop the existing constraint if it's too restrictive
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'appointments_status_check'
    ) THEN
        ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
    END IF;
    
    -- Add the correct constraint with all valid statuses
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'));
    
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists with correct values, do nothing
        NULL;
    WHEN others THEN
        -- Other errors, try to add the constraint anyway
        BEGIN
            ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
            CHECK (status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'));
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add patient_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_patient_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES public.patients(id);
    END IF;
    
    -- Add department_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_department_id_fkey'
    ) THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES public.departments(id);
    END IF;
END $$;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_appointments_updated_at'
    ) THEN
        CREATE TRIGGER update_appointments_updated_at
            BEFORE UPDATE ON public.appointments
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Update existing appointments to have a default department if they don't have one
UPDATE public.appointments 
SET department_id = (
    SELECT id FROM public.departments 
    WHERE name = 'General Medicine' 
    LIMIT 1
)
WHERE department_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_department ON public.appointments(department_id);
CREATE INDEX IF NOT EXISTS idx_appointments_updated ON public.appointments(updated_at);

-- Grant permissions
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
