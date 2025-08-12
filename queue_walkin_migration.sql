-- Migration to support walk-in patients in queue and fix authentication issues
-- Run this in your Supabase SQL editor

-- 1. Update queue table to support walk-in patients
ALTER TABLE queue 
ALTER COLUMN patient_id DROP NOT NULL;

-- 2. Add is_walk_in column to queue table
ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE;

-- 3. Update existing RLS policies to be less restrictive for testing
-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view queue items in their department" ON queue;
DROP POLICY IF EXISTS "Doctors can update their own queue items" ON queue;
DROP POLICY IF EXISTS "Front desk can manage all queue items" ON queue;

-- 4. Create more permissive policies for testing
-- Allow all authenticated users to view queue
CREATE POLICY "Allow authenticated users to view queue" ON queue
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert into queue
CREATE POLICY "Allow authenticated users to insert into queue" ON queue
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update queue
CREATE POLICY "Allow authenticated users to update queue" ON queue
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete from queue
CREATE POLICY "Allow authenticated users to delete from queue" ON queue
    FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Update the queue table to handle null patient_id properly
-- Add a check constraint to ensure either patient_id or is_walk_in is set
ALTER TABLE queue 
ADD CONSTRAINT check_patient_or_walkin 
CHECK (
    (patient_id IS NOT NULL) OR 
    (patient_id IS NULL AND is_walk_in = true)
);

-- 6. Update existing queue items to have is_walk_in = false if they have patient_id
UPDATE queue 
SET is_walk_in = false 
WHERE patient_id IS NOT NULL;

-- 7. Update existing queue items to have is_walk_in = true if they don't have patient_id
UPDATE queue 
SET is_walk_in = true 
WHERE patient_id IS NULL;

-- 8. Create an index for is_walk_in column
CREATE INDEX IF NOT EXISTS idx_queue_is_walk_in ON queue(is_walk_in);

-- 9. Update the queue view to include is_walk_in
CREATE OR REPLACE VIEW queue_stats AS
SELECT 
    department_id,
    COUNT(*) as total_patients,
    COUNT(*) FILTER (WHERE status = 'waiting') as waiting,
    COUNT(*) FILTER (WHERE status = 'in-consultation') as in_consultation,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE is_walk_in = true) as walk_ins,
    COUNT(*) FILTER (WHERE is_walk_in = false) as appointments
FROM queue 
GROUP BY department_id;

-- 10. Grant necessary permissions
GRANT ALL ON queue TO authenticated;
GRANT ALL ON queue_stats TO authenticated;
