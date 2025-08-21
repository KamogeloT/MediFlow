-- Test script to verify the new appointment status system
-- Run this after the migration to ensure everything is working

-- Test 1: Check if appointment_statuses table exists and has data
SELECT 'Test 1: Checking appointment_statuses table' as test;
SELECT COUNT(*) as status_count FROM public.appointment_statuses;

-- Test 2: Check if appointments table has status_id column
SELECT 'Test 2: Checking appointments table structure' as test;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name IN ('status_id', 'status')
ORDER BY column_name;

-- Test 3: Check if appointments_with_status view works
SELECT 'Test 3: Testing appointments_with_status view' as test;
SELECT COUNT(*) as view_count FROM public.appointments_with_status;

-- Test 4: Check if we can get status by code
SELECT 'Test 4: Testing get_appointment_status_id function' as test;
SELECT get_appointment_status_id('scheduled') as scheduled_id,
       get_appointment_status_id('checked_in') as checked_in_id,
       get_appointment_status_id('completed') as completed_id;

-- Test 5: Check if we can get status code by ID
SELECT 'Test 5: Testing get_appointment_status_code function' as test;
SELECT get_appointment_status_code(1) as status_code_1,
       get_appointment_status_code(2) as status_code_2,
       get_appointment_status_code(3) as status_code_3;

-- Test 6: Check if we can update appointment status
SELECT 'Test 6: Testing update_appointment_status function' as test;
-- This will only work if you have an appointment to test with
-- SELECT update_appointment_status('some-appointment-id', 'checked_in');

-- Test 7: Show sample data from the view
SELECT 'Test 7: Sample data from appointments_with_status view' as test;
SELECT id, patient_name, status_code, status_name, status_description
FROM public.appointments_with_status
LIMIT 5;

-- Test 8: Check foreign key constraint
SELECT 'Test 8: Checking foreign key constraint' as test;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'appointments'
AND kcu.column_name = 'status_id';

-- Test 9: Check if all appointments have valid status_id
SELECT 'Test 9: Checking data integrity' as test;
SELECT 
    'Appointments with valid status_id' as info,
    COUNT(*) as count
FROM public.appointments a
JOIN public.appointment_statuses s ON a.status_id = s.id
UNION ALL
SELECT 
    'Appointments with NULL status_id' as info,
    COUNT(*) as count
FROM public.appointments
WHERE status_id IS NULL;

-- Test 10: Show all available statuses
SELECT 'Test 10: All available statuses' as test;
SELECT id, code, name, description, sort_order, is_active
FROM public.appointment_statuses
ORDER BY sort_order;
