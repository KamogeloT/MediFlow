-- Test Priority Lookup System
-- Run this after running the migration script to verify everything is working

-- 1. Check if queue_priorities table exists and has data
SELECT 'Testing queue_priorities table:' as test_info;
SELECT * FROM queue_priorities ORDER BY sort_order;

-- 2. Check if queue table has priority_id column
SELECT 'Testing queue table structure:' as test_info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'queue' AND column_name LIKE '%priority%'
ORDER BY ordinal_position;

-- 3. Test the priority lookup functions
SELECT 'Testing get_queue_priority_id function:' as test_info;
SELECT 
  'urgent' as code, 
  get_queue_priority_id('urgent') as id,
  'Expected: 1' as expected;

SELECT 
  'normal' as code, 
  get_queue_priority_id('normal') as id,
  'Expected: 3' as expected;

-- 4. Test the reverse lookup function
SELECT 'Testing get_queue_priority_code function:' as test_info;
SELECT 
  1 as id, 
  get_queue_priority_code(1) as code,
  'Expected: urgent' as expected;

SELECT 
  3 as id, 
  get_queue_priority_code(3) as code,
  'Expected: normal' as expected;

-- 5. Test the queue_with_priority_details view
SELECT 'Testing queue_with_priority_details view:' as test_info;
SELECT 
  id,
  patient_name,
  priority_id,
  priority_code,
  priority_name,
  priority_color,
  wait_time_minutes
FROM queue_with_priority_details 
LIMIT 5;

-- 6. Test the recreated queue_with_details view
SELECT 'Testing recreated queue_with_details view:' as test_info;
SELECT 
  id,
  patient_name,
  priority_id,
  priority_code,
  priority_name,
  priority_color,
  wait_time_minutes
FROM queue_with_details 
LIMIT 5;

-- 7. Test the recreated queue_patient_types view
SELECT 'Testing recreated queue_patient_types view:' as test_info;
SELECT 
  id,
  patient_name,
  priority_id,
  priority_code,
  priority_name,
  patient_type
FROM queue_patient_types 
LIMIT 5;

-- 8. Test inserting a new queue item with priority_id
SELECT 'Testing queue insert with priority_id:' as test_info;
-- This will only work if you have patients and departments in your system
-- Uncomment and modify if you want to test actual insertion
/*
INSERT INTO queue (
  patient_id, 
  department_id, 
  priority_id, 
  status, 
  patient_name
) VALUES (
  (SELECT id FROM patients LIMIT 1),
  (SELECT id FROM departments LIMIT 1),
  2, -- High priority
  'waiting',
  'Test Patient'
) RETURNING id, priority_id;
*/

-- 9. Check foreign key constraint
SELECT 'Testing foreign key constraint:' as test_info;
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
AND tc.table_name = 'queue'
AND kcu.column_name = 'priority_id';

-- 10. Test the updated get_queue_by_doctor_departments function
SELECT 'Testing get_queue_by_doctor_departments function:' as test_info;
-- This will only work if you have doctors assigned to departments
-- Uncomment and modify if you want to test actual function call
/*
SELECT * FROM get_queue_by_doctor_departments(
  (SELECT id FROM profiles WHERE role = 'doctor' LIMIT 1)
) LIMIT 3;
*/

-- 11. Verify all views are accessible
SELECT 'Testing view accessibility:' as test_info;
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('queue_with_priority_details', 'queue_with_details', 'queue_patient_types')
ORDER BY table_name;

SELECT 'Priority system test completed!' as status;
