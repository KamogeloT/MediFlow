-- Quick fix for appointments status constraint
-- This script fixes the "appointments_status_check" constraint violation

-- First, let's see what the current constraint allows
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'appointments_status_check';

-- Drop the existing restrictive constraint
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'appointments_status_check'
    ) THEN
        ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
        RAISE NOTICE 'Dropped existing appointments_status_check constraint';
    ELSE
        RAISE NOTICE 'No existing appointments_status_check constraint found';
    END IF;
END $$;

-- Add the correct constraint with all valid statuses
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'));

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'appointments_status_check';

-- Test the constraint by trying to insert a valid status
DO $$
BEGIN
    -- This should work now
    UPDATE public.appointments 
    SET status = 'checked_in' 
    WHERE id = '8594cfc8-9c3f-480b-92de-96fad52de42d' 
    AND status = 'scheduled';
    
    IF FOUND THEN
        RAISE NOTICE 'Successfully updated appointment status to checked_in';
    ELSE
        RAISE NOTICE 'Appointment not found or already updated';
    END IF;
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Constraint still violated - check the constraint definition';
    WHEN others THEN
        RAISE NOTICE 'Other error occurred: %', SQLERRM;
END $$;
