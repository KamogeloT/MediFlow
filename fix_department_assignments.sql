-- Fix Department Assignments - Comprehensive Solution
-- Run this in your Supabase SQL Editor

-- Step 1: Ensure the doctor_departments table exists and is properly structured
CREATE TABLE IF NOT EXISTS public.doctor_departments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references auth.users(id) on delete cascade,
  department_id uuid references departments(id) on delete cascade,
  created_at timestamptz default now(),
  unique(doctor_id, department_id)
);

-- Step 2: Create a function to sync department assignments
CREATE OR REPLACE FUNCTION sync_doctor_departments()
RETURNS TRIGGER AS $$
BEGIN
  -- If profiles.department_id is being set, also add to doctor_departments
  IF NEW.department_id IS NOT NULL AND NEW.role = 'doctor' THEN
    INSERT INTO public.doctor_departments (doctor_id, department_id)
    VALUES (NEW.id, NEW.department_id)
    ON CONFLICT (doctor_id, department_id) DO NOTHING;
  END IF;
  
  -- If profiles.department_id is being cleared, remove from doctor_departments
  IF OLD.department_id IS NOT NULL AND NEW.department_id IS NULL AND NEW.role = 'doctor' THEN
    DELETE FROM public.doctor_departments 
    WHERE doctor_id = NEW.id AND department_id = OLD.department_id;
  END IF;
  
  -- If department_id is changing, update doctor_departments
  IF OLD.department_id IS NOT NULL AND NEW.department_id IS NOT NULL 
     AND OLD.department_id != NEW.department_id AND NEW.role = 'doctor' THEN
    -- Remove old assignment
    DELETE FROM public.doctor_departments 
    WHERE doctor_id = NEW.id AND department_id = OLD.department_id;
    -- Add new assignment
    INSERT INTO public.doctor_departments (doctor_id, department_id)
    VALUES (NEW.id, NEW.department_id)
    ON CONFLICT (doctor_id, department_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to automatically sync department assignments
DROP TRIGGER IF EXISTS sync_doctor_departments_trigger ON public.profiles;
CREATE TRIGGER sync_doctor_departments_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_doctor_departments();

-- Step 4: Migrate existing data - ensure all doctors in profiles have entries in doctor_departments
INSERT INTO public.doctor_departments (doctor_id, department_id)
SELECT id, department_id 
FROM public.profiles 
WHERE role = 'doctor' AND department_id IS NOT NULL
ON CONFLICT (doctor_id, department_id) DO NOTHING;

-- Step 5: Create a view for easy access to doctor department assignments
CREATE OR REPLACE VIEW doctor_department_view AS
SELECT 
  p.id as doctor_id,
  p.full_name as doctor_name,
  p.role,
  p.department_id as primary_department_id,
  d.name as primary_department_name,
  array_agg(dd.department_id) as all_department_ids,
  array_agg(dept.name) as all_department_names
FROM public.profiles p
LEFT JOIN public.departments d ON p.department_id = d.id
LEFT JOIN public.doctor_departments dd ON p.id = dd.doctor_id
LEFT JOIN public.departments dept ON dd.department_id = dept.id
WHERE p.role = 'doctor'
GROUP BY p.id, p.full_name, p.role, p.department_id, d.name;

-- Step 6: Create a function to check if a doctor has access to a department
CREATE OR REPLACE FUNCTION check_doctor_department_access(
  p_doctor_id uuid,
  p_department_id uuid
)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := FALSE;
BEGIN
  -- Check if doctor has access to the department
  SELECT EXISTS(
    SELECT 1 FROM public.doctor_departments 
    WHERE doctor_id = p_doctor_id AND department_id = p_department_id
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant necessary permissions
GRANT SELECT ON public.doctor_departments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.doctor_departments TO authenticated;
GRANT SELECT ON doctor_department_view TO authenticated;
GRANT EXECUTE ON FUNCTION check_doctor_department_access TO authenticated;

-- Step 8: Create RLS policies for doctor_departments
ALTER TABLE public.doctor_departments ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own department assignments
CREATE POLICY "Doctors can view their own department assignments" ON public.doctor_departments
  FOR SELECT USING (auth.uid() = doctor_id);

-- Doctors can insert their own department assignments
CREATE POLICY "Doctors can insert their own department assignments" ON public.doctor_departments
  FOR INSERT WITH CHECK (auth.uid() = doctor_id);

-- Doctors can update their own department assignments
CREATE POLICY "Doctors can update their own department assignments" ON public.doctor_departments
  FOR UPDATE USING (auth.uid() = doctor_id);

-- Doctors can delete their own department assignments
CREATE POLICY "Doctors can delete their own department assignments" ON public.doctor_departments
  FOR DELETE USING (auth.uid() = doctor_id);

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctor_departments_doctor_id ON public.doctor_departments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_departments_department_id ON public.doctor_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_doctor_departments_doctor_dept ON public.doctor_departments(doctor_id, department_id);

-- Step 10: Update the verifyDoctorAccess function in the database
-- This will be called from the application code
CREATE OR REPLACE FUNCTION verify_doctor_access_db(
  p_queue_item_id uuid,
  p_doctor_id uuid
)
RETURNS BOOLEAN AS $$
DECLARE
  queue_dept_id uuid;
  has_access BOOLEAN := FALSE;
BEGIN
  -- Get the queue item's department
  SELECT department_id INTO queue_dept_id
  FROM public.queue
  WHERE id = p_queue_item_id;
  
  IF queue_dept_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if doctor has access to this department
  SELECT check_doctor_department_access(p_doctor_id, queue_dept_id) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_doctor_access_db TO authenticated;

-- Step 11: Create a function to assign doctor to department
CREATE OR REPLACE FUNCTION assign_doctor_to_department_db(
  p_doctor_id uuid,
  p_department_id uuid
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert into doctor_departments
  INSERT INTO public.doctor_departments (doctor_id, department_id)
  VALUES (p_doctor_id, p_department_id)
  ON CONFLICT (doctor_id, department_id) DO NOTHING;
  
  -- Also update profiles.department_id if it's not set
  UPDATE public.profiles 
  SET department_id = p_department_id
  WHERE id = p_doctor_id AND (department_id IS NULL OR department_id != p_department_id);
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_doctor_to_department_db TO authenticated;

-- Step 12: Create a function to get doctor's departments
CREATE OR REPLACE FUNCTION get_doctor_departments_db(
  p_doctor_id uuid
)
RETURNS TABLE(department_id uuid, department_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT dd.department_id, d.name
  FROM public.doctor_departments dd
  JOIN public.departments d ON dd.department_id = d.id
  WHERE dd.doctor_id = p_doctor_id
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_doctor_departments_db TO authenticated;

-- Step 13: Verify the setup
SELECT 'Department assignment system setup complete' as status;
