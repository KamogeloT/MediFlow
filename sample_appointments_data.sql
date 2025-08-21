-- Add sample appointments for testing the front desk dashboard
-- This script assumes the appointments table structure from fix_appointments_table.sql

-- First, let's check if we have any existing appointments for today
DO $$
DECLARE
    today_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO today_count 
    FROM public.appointments 
    WHERE appointment_date = CURRENT_DATE;
    
    -- Only add sample data if we don't have any appointments for today
    IF today_count = 0 THEN
        -- Insert sample appointments for today
        INSERT INTO public.appointments (
            patient_id,
            department_id,
            appointment_date,
            appointment_time,
            status,
            reason,
            created_at
        ) 
        SELECT 
            p.id as patient_id,
            d.id as department_id,
            CURRENT_DATE as appointment_date,
            '09:00:00'::time as appointment_time,
            'scheduled' as status,
            'General checkup' as reason,
            NOW() as created_at
        FROM public.patients p, public.departments d
        WHERE d.name = 'General Medicine'
        LIMIT 3;

        INSERT INTO public.appointments (
            patient_id,
            department_id,
            appointment_date,
            appointment_time,
            status,
            reason,
            created_at
        ) 
        SELECT 
            p.id as patient_id,
            d.id as department_id,
            CURRENT_DATE as appointment_date,
            '10:00:00'::time as appointment_time,
            'scheduled' as status,
            'Follow-up consultation' as reason,
            NOW() as created_at
        FROM public.patients p, public.departments d
        WHERE d.name = 'Cardiology'
        LIMIT 2;

        INSERT INTO public.appointments (
            patient_id,
            department_id,
            appointment_date,
            appointment_time,
            status,
            reason,
            created_at
        ) 
        SELECT 
            p.id as patient_id,
            d.id as department_id,
            CURRENT_DATE as appointment_date,
            '11:00:00'::time as appointment_time,
            'scheduled' as status,
            'Specialist consultation' as reason,
            NOW() as created_at
        FROM public.patients p, public.departments d
        WHERE d.name = 'Pediatrics'
        LIMIT 2;

        -- Add some checked-in appointments (these will appear in queue)
        INSERT INTO public.appointments (
            patient_id,
            department_id,
            appointment_date,
            appointment_time,
            status,
            reason,
            created_at
        ) 
        SELECT 
            p.id as patient_id,
            d.id as department_id,
            CURRENT_DATE as appointment_date,
            '08:00:00'::time as appointment_time,
            'checked_in' as status,
            'Emergency consultation' as reason,
            NOW() as created_at
        FROM public.patients p, public.departments d
        WHERE d.name = 'Emergency Medicine'
        LIMIT 1;

        -- Add corresponding queue items for checked-in appointments
        INSERT INTO public.queue (
            patient_id,
            department_id,
            priority,
            status,
            is_appointment_based,
            estimated_wait_time,
            created_at
        )
        SELECT 
            a.patient_id,
            a.department_id,
            'high' as priority,
            'waiting' as status,
            true as is_appointment_based,
            15 as estimated_wait_time,
            NOW() as created_at
        FROM public.appointments a
        WHERE a.status = 'checked_in' AND a.appointment_date = CURRENT_DATE;
        
        RAISE NOTICE 'Added % sample appointments for today', today_count + 7;
    ELSE
        RAISE NOTICE 'Appointments already exist for today, skipping sample data insertion';
    END IF;
END $$;
