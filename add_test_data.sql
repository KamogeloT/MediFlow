-- Add test patients to the queue
-- This will help test the BPM features

-- First, let's add some test patients to the patients table
INSERT INTO public.patients (id, full_name, email, phone, date_of_birth, gender, address, emergency_contact, medical_history, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'John Smith', 'john.smith@email.com', '+1234567890', '1985-03-15', 'Male', '123 Main St, City', 'Jane Smith +1234567891', 'Hypertension', NOW(), NOW()),
  (gen_random_uuid(), 'Sarah Johnson', 'sarah.j@email.com', '+1234567892', '1990-07-22', 'Female', '456 Oak Ave, Town', 'Mike Johnson +1234567893', 'Diabetes', NOW(), NOW()),
  (gen_random_uuid(), 'Robert Wilson', 'rob.wilson@email.com', '+1234567894', '1978-11-08', 'Male', '789 Pine Rd, Village', 'Lisa Wilson +1234567895', 'Asthma', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Now add them to the queue
INSERT INTO public.queue (id, patient_id, patient_name, status, priority, added_at, notes, department_id, is_walk_in, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.id,
  p.full_name,
  'waiting',
  'normal',
  NOW(),
  'Regular checkup',
  d.id,
  false,
  NOW(),
  NOW()
FROM public.patients p
CROSS JOIN public.departments d
WHERE d.name = 'General Medicine'
LIMIT 3
ON CONFLICT DO NOTHING;

-- Add one patient in consultation status
INSERT INTO public.queue (id, patient_id, patient_name, status, priority, added_at, notes, department_id, is_walk_in, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.id,
  p.full_name,
  'in-consultation',
  'high',
  NOW() - INTERVAL '30 minutes',
  'Patient experiencing chest pain',
  d.id,
  false,
  NOW() - INTERVAL '30 minutes',
  NOW()
FROM public.patients p
CROSS JOIN public.departments d
WHERE d.name = 'Cardiology'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Check what we added
SELECT 'Patients' as table_name, COUNT(*) as count FROM public.patients
UNION ALL
SELECT 'Queue Items' as table_name, COUNT(*) as count FROM public.queue;
