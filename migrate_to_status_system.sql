-- Migration script to transition from hardcoded status to lookup table system
-- Run this after creating the appointment_statuses table

-- Step 1: Check current appointments table structure
SELECT 'Current appointments table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;

-- Step 2: Check if status column exists and what values it contains
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'status'
    ) THEN
        RAISE NOTICE 'Status column exists. Current status values:';
        
        -- Create a temporary table to store the results
        CREATE TEMP TABLE temp_status_counts AS
        SELECT DISTINCT status, COUNT(*) as count
        FROM public.appointments 
        WHERE status IS NOT NULL
        GROUP BY status;
        
        -- Display the results
        RAISE NOTICE 'Status distribution: %', (
            SELECT string_agg(format('%s: %s', status, count), ', ')
            FROM temp_status_counts
        );
        
        -- Drop the temporary table
        DROP TABLE temp_status_counts;
    ELSE
        RAISE NOTICE 'Status column does not exist. Table may already be using status_id.';
    END IF;
END $$;

-- Step 3: Check if appointment_statuses table exists
SELECT 'Checking appointment_statuses table:' as info;
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'appointment_statuses'
) as table_exists;

-- Step 4: If appointment_statuses table doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointment_statuses'
    ) THEN
        RAISE NOTICE 'Creating appointment_statuses table...';
        
        -- Create the table
        CREATE TABLE public.appointment_statuses (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Insert standard statuses
        INSERT INTO public.appointment_statuses (code, name, description, sort_order) VALUES
            ('scheduled', 'Scheduled', 'Appointment is scheduled for future date', 1),
            ('checked_in', 'Checked In', 'Patient has checked in and been added to queue', 2),
            ('in_progress', 'In Progress', 'Patient is currently being seen by doctor', 3),
            ('completed', 'Completed', 'Appointment has been completed successfully', 4),
            ('cancelled', 'Cancelled', 'Appointment was cancelled by patient or staff', 5),
            ('no_show', 'No Show', 'Patient did not arrive for scheduled appointment', 6),
            ('rescheduled', 'Rescheduled', 'Appointment was rescheduled to different time', 7),
            ('waiting', 'Waiting', 'Patient is waiting for doctor to be available', 8);
            
        RAISE NOTICE 'appointment_statuses table created successfully!';
    ELSE
        RAISE NOTICE 'appointment_statuses table already exists';
    END IF;
END $$;

-- Step 5: Add status_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'status_id'
    ) THEN
        RAISE NOTICE 'Adding status_id column...';
        ALTER TABLE public.appointments ADD COLUMN status_id INTEGER;
        RAISE NOTICE 'status_id column added successfully!';
    ELSE
        RAISE NOTICE 'status_id column already exists';
    END IF;
END $$;

-- Step 6: Migrate existing status data to status_id (only if status column exists)
DO $$
DECLARE
    status_record RECORD;
    status_id_val INTEGER;
    status_column_exists BOOLEAN;
BEGIN
    -- Check if status column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'status'
    ) INTO status_column_exists;
    
    IF status_column_exists THEN
        RAISE NOTICE 'Migrating existing status data...';
        
        -- For each existing status value, find or create the corresponding status_id
        FOR status_record IN 
            SELECT DISTINCT status 
            FROM public.appointments 
            WHERE status IS NOT NULL AND status_id IS NULL
        LOOP
            -- Get the status_id for this status code
            SELECT id INTO status_id_val 
            FROM public.appointment_statuses 
            WHERE code = status_record.status;
            
            IF status_id_val IS NOT NULL THEN
                -- Update all appointments with this status
                UPDATE public.appointments 
                SET status_id = status_id_val 
                WHERE status = status_record.status AND status_id IS NULL;
                
                RAISE NOTICE 'Migrated % appointments from status "%" to status_id %', 
                    (SELECT COUNT(*) FROM public.appointments WHERE status_id = status_id_val), 
                    status_record.status, 
                    status_id_val;
            ELSE
                RAISE NOTICE 'WARNING: No matching status found for "%" - appointments with this status will not be migrated', 
                    status_record.status;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Status migration completed!';
    ELSE
        RAISE NOTICE 'No status column found. Skipping migration step.';
    END IF;
END $$;

-- Step 7: Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_status_id_fkey'
    ) THEN
        RAISE NOTICE 'Adding foreign key constraint...';
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_status_id_fkey 
        FOREIGN KEY (status_id) REFERENCES public.appointment_statuses(id);
        RAISE NOTICE 'Foreign key constraint added successfully!';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 8: Set default value for new appointments
DO $$
BEGIN
    -- Set default to 'scheduled' status
    UPDATE public.appointments 
    SET status_id = (SELECT id FROM public.appointment_statuses WHERE code = 'scheduled')
    WHERE status_id IS NULL;
    
    -- Make status_id NOT NULL
    ALTER TABLE public.appointments ALTER COLUMN status_id SET NOT NULL;
    
    -- Set default for new appointments
    ALTER TABLE public.appointments ALTER COLUMN status_id SET DEFAULT 
        (SELECT id FROM public.appointment_statuses WHERE code = 'scheduled');
        
    RAISE NOTICE 'Default values and constraints set successfully!';
END $$;

-- Step 9: Create the view for easy access
CREATE OR REPLACE VIEW public.appointments_with_status AS
SELECT 
    a.*,
    s.code as status_code,
    s.name as status_name,
    s.description as status_description
FROM public.appointments a
JOIN public.appointment_statuses s ON a.status_id = s.id
WHERE s.is_active = true;

-- Step 10: Show migration results
SELECT 'Migration Results:' as info;

SELECT 'Appointments with status_id:' as info, COUNT(*) as count
FROM public.appointments 
WHERE status_id IS NOT NULL;

SELECT 'Appointments without status_id:' as info, COUNT(*) as count
FROM public.appointments 
WHERE status_id IS NULL;

SELECT 'Status distribution:' as info, s.name, COUNT(*) as count
FROM public.appointments a
JOIN public.appointment_statuses s ON a.status_id = s.id
GROUP BY s.name, s.sort_order
ORDER BY s.sort_order;

-- Step 11: Show final table structure
SELECT 'Final appointments table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;

SELECT 'Migration completed successfully!' as message;
