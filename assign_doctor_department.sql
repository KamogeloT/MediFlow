-- Assign Dr. John Doe to a department
-- Run this in your Supabase SQL editor

-- First, let's see what departments exist
SELECT id, name FROM departments;

-- Then, let's see the current doctor's profile
SELECT id, full_name, role, department_id FROM profiles WHERE id = 'c8b5e01e-a9b5-419e-acd5-65996f00edb8';

-- Now assign the doctor to a department (choose one from the list above)
-- Example: Assign to "Internal Medicine" (replace the UUID with actual department ID)
UPDATE profiles 
SET department_id = (
  SELECT id FROM departments WHERE name = 'Internal Medicine' LIMIT 1
)
WHERE id = 'c8b5e01e-a9b5-419e-acd5-65996f00edb8';

-- Verify the update
SELECT id, full_name, role, department_id, departments.name as department_name 
FROM profiles 
LEFT JOIN departments ON profiles.department_id = departments.id
WHERE profiles.id = 'c8b5e01e-a9b5-419e-acd5-65996f00edb8';
