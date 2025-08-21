-- Simple step-by-step migration to appointment status system
-- This script handles cases where the status column may not exist

-- Step 1: Create appointment_statuses table
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

-- Step 2: Insert standard statuses
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

-- Step 3: Add status_id column to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS status_id INTEGER;

-- Step 4: Set default status_id for existing appointments
UPDATE public.appointments 
SET status_id = (SELECT id FROM public.appointment_statuses WHERE code = 'scheduled')
WHERE status_id IS NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE public.appointments 
ADD CONSTRAINT IF NOT EXISTS appointments_status_id_fkey 
FOREIGN KEY (status_id) REFERENCES public.appointment_statuses(id);

-- Step 6: Make status_id NOT NULL and set default
ALTER TABLE public.appointments ALTER COLUMN status_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN status_id SET DEFAULT 
    (SELECT id FROM public.appointment_statuses WHERE code = 'scheduled');

-- Step 7: Create the view
CREATE OR REPLACE VIEW public.appointments_with_status AS
SELECT 
    a.*,
    s.code as status_code,
    s.name as status_name,
    s.description as status_description
FROM public.appointments a
JOIN public.appointment_statuses s ON a.status_id = s.id
WHERE s.is_active = true;

-- Step 8: Grant permissions
GRANT ALL ON public.appointment_statuses TO authenticated;
GRANT ALL ON public.appointment_statuses TO service_role;
GRANT SELECT ON public.appointments_with_status TO authenticated;

-- Step 9: Show results
SELECT 'Migration completed successfully!' as message;
SELECT 'Available statuses:' as info;
SELECT code, name, description FROM public.appointment_statuses ORDER BY sort_order;
