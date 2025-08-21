-- Quick Fix: Assign Current User to Department
-- Run this in your Supabase SQL Editor to quickly fix the access issue

-- First, let's see what departments we have
SELECT id, name FROM public.departments;

-- Then, let's see the current user's profile
SELECT id, full_name, role, department_id FROM public.profiles WHERE id = auth.uid();

-- Now let's assign the current user to a department (replace 'Surgery' with the department you need)
-- Option 1: Assign to Surgery department
INSERT INTO public.doctor_departments (doctor_id, department_id)
SELECT 
  auth.uid() as doctor_id,
  d.id as department_id
FROM public.departments d
WHERE d.name = 'Surgery'
ON CONFLICT (doctor_id, department_id) DO NOTHING;

-- Option 2: Assign to Cardiology department (uncomment if needed)
-- INSERT INTO public.doctor_departments (doctor_id, department_id)
-- SELECT 
--   auth.uid() as doctor_id,
--   d.id as department_id
-- FROM public.departments d
-- WHERE d.name = 'Cardiology'
-- ON CONFLICT (doctor_id, department_id) DO NOTHING;

-- Option 3: Assign to General Medicine department (uncomment if needed)
-- INSERT INTO public.doctor_departments (doctor_id, department_id)
-- SELECT 
--   auth.uid() as doctor_id,
--   d.id as department_id
-- FROM public.departments d
-- WHERE d.name = 'General Medicine'
-- ON CONFLICT (doctor_id, department_id) DO NOTHING;

-- Also update the profiles table to ensure consistency
UPDATE public.profiles 
SET department_id = (
  SELECT d.id 
  FROM public.departments d 
  WHERE d.name = 'Surgery'
)
WHERE id = auth.uid() AND role = 'doctor';

-- Verify the assignment
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.department_id as profile_dept_id,
  d.name as profile_dept_name,
  array_agg(dd.department_id) as assigned_dept_ids,
  array_agg(dept.name) as assigned_dept_names
FROM public.profiles p
LEFT JOIN public.departments d ON p.department_id = d.id
LEFT JOIN public.doctor_departments dd ON p.id = dd.doctor_id
LEFT JOIN public.departments dept ON dd.department_id = dept.id
WHERE p.id = auth.uid()
GROUP BY p.id, p.full_name, p.role, p.department_id, d.name;
