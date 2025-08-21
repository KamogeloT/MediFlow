-- Setup script for Front Desk Dashboard
-- Run this script to set up all necessary database structure

-- 1. First, ensure we have the basic tables
\echo 'Setting up appointments table structure...'
\i fix_appointments_table.sql

-- 2. Add sample data for testing
\echo 'Adding sample appointment data...'
\i sample_appointments_data.sql

\echo 'Front Desk Dashboard setup complete!'
\echo 'You can now login to the front desk and see the new dashboard.'
