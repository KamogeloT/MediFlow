-- Quick fix: Assign Dr. John Doe to Internal Medicine department
-- Run this in your Supabase SQL editor

UPDATE profiles 
SET department_id = (
  SELECT id FROM departments WHERE name = 'Internal Medicine' LIMIT 1
)
WHERE id = 'c8b5e01e-a9b5-419e-acd5-65996f00edb8';

-- Verify it worked
SELECT 
  p.id, 
  p.full_name, 
  p.role, 
  p.department_id, 
  d.name as department_name
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
WHERE p.id = 'c8b5e01e-a9b5-419e-acd5-65996f00edb8';
