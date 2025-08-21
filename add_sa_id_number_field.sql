-- Add South African ID Number field to patients table
-- This field will be used as the primary identifier for patient lookups

-- Step 1: Add the ID number column
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS sa_id_number VARCHAR(13);

-- Step 2: Add a comment explaining the field
COMMENT ON COLUMN public.patients.sa_id_number IS 'South African ID Number (13 digits, format: YYMMDD0000000) - Unique identifier for each citizen';

-- Step 3: Create an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_patients_sa_id_number ON public.patients(sa_id_number);

-- Step 4: Add a check constraint to validate SA ID number format
-- Only validation: exactly 13 digits
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_sa_id_number_format'
    ) THEN
        ALTER TABLE public.patients DROP CONSTRAINT check_sa_id_number_format;
    END IF;
    
    -- Add the constraint - only checks for 13 digits
    ALTER TABLE public.patients 
    ADD CONSTRAINT check_sa_id_number_format 
    CHECK (sa_id_number ~ '^[0-9]{13}$');
    
    RAISE NOTICE 'Added check_sa_id_number_format constraint (13 digits only)';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists, skipping...';
    WHEN others THEN
        RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;

-- Step 5: Add unique constraint if it doesn't exist
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'patients_sa_id_number_key'
    ) THEN
        -- Add unique constraint
        ALTER TABLE public.patients 
        ADD CONSTRAINT patients_sa_id_number_key UNIQUE (sa_id_number);
        RAISE NOTICE 'Added unique constraint on sa_id_number';
    ELSE
        RAISE NOTICE 'Unique constraint already exists, skipping...';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Unique constraint already exists, skipping...';
    WHEN others THEN
        RAISE NOTICE 'Error adding unique constraint: %', SQLERRM;
END $$;

-- Step 6: Create a function to extract date of birth from SA ID number
CREATE OR REPLACE FUNCTION extract_dob_from_sa_id(id_number VARCHAR(13))
RETURNS DATE AS $$
DECLARE
    year_part INTEGER;
    month_part INTEGER;
    day_part INTEGER;
    full_year INTEGER;
    extracted_date DATE;
BEGIN
    -- Extract YY, MM, DD from YYMMDD0000000 format
    year_part := CAST(SUBSTRING(id_number, 1, 2) AS INTEGER);
    month_part := CAST(SUBSTRING(id_number, 3, 2) AS INTEGER);
    day_part := CAST(SUBSTRING(id_number, 5, 2) AS INTEGER);
    
    -- Convert 2-digit year to 4-digit year (assume 1900s for years 00-99)
    -- This is a common approach for SA ID numbers
    IF year_part >= 0 AND year_part <= 99 THEN
        full_year := 1900 + year_part;
    ELSE
        full_year := year_part; -- Fallback if somehow not 2 digits
    END IF;
    
    -- Validate date components
    IF month_part < 1 OR month_part > 12 THEN
        RAISE EXCEPTION 'Invalid month in ID number: %', month_part;
    END IF;
    
    IF day_part < 1 OR day_part > 31 THEN
        RAISE EXCEPTION 'Invalid day in ID number: %', day_part;
    END IF;
    
    -- Try to create the date
    BEGIN
        extracted_date := MAKE_DATE(full_year, month_part, day_part);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid date from ID number: %-%-%', full_year, month_part, day_part;
    END;
    
    RETURN extracted_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create a simple validation function (13 digits + basic date validation)
CREATE OR REPLACE FUNCTION validate_sa_id_number(id_number VARCHAR(13))
RETURNS BOOLEAN AS $$
DECLARE
    test_date DATE;
BEGIN
    -- Check if it's exactly 13 digits
    IF id_number !~ '^[0-9]{13}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Try to extract and validate the date of birth
    BEGIN
        test_date := extract_dob_from_sa_id(id_number);
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create a trigger function for validation
CREATE OR REPLACE FUNCTION validate_sa_id_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validation: exactly 13 digits + valid date
    IF NEW.sa_id_number IS NOT NULL THEN
        IF NOT validate_sa_id_number(NEW.sa_id_number) THEN
            RAISE EXCEPTION 'South African ID Number must be exactly 13 digits with valid date format (YYMMDD0000000)';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create the trigger
DROP TRIGGER IF EXISTS trigger_validate_sa_id_number ON public.patients;
CREATE TRIGGER trigger_validate_sa_id_number
    BEFORE INSERT OR UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION validate_sa_id_number_trigger();

-- Step 10: Create a search function for ID number lookups
CREATE OR REPLACE FUNCTION search_patients_by_id_number(search_id VARCHAR(13))
RETURNS TABLE(
    id UUID,
    full_name TEXT,
    sa_id_number VARCHAR(13),
    email TEXT,
    phone TEXT,
    date_of_birth DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.sa_id_number,
        p.email,
        p.phone,
        p.date_of_birth
    FROM public.patients p
    WHERE p.sa_id_number = search_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create a function to get date of birth from SA ID number
CREATE OR REPLACE FUNCTION get_dob_from_sa_id(id_number VARCHAR(13))
RETURNS DATE AS $$
BEGIN
    RETURN extract_dob_from_sa_id(id_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Grant permissions
GRANT EXECUTE ON FUNCTION validate_sa_id_number(VARCHAR(13)) TO authenticated;
GRANT EXECUTE ON FUNCTION search_patients_by_id_number(VARCHAR(13)) TO authenticated;
GRANT EXECUTE ON FUNCTION extract_dob_from_sa_id(VARCHAR(13)) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dob_from_sa_id(VARCHAR(13)) TO authenticated;

-- Step 13: Show the updated table structure
SELECT 'Updated patients table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'patients' AND column_name = 'sa_id_number';

-- Step 14: Test the validation function with your example
SELECT 'Testing validation function with your example:' as test_info;
SELECT 
    '9001095679089' as test_id,
    validate_sa_id_number('9001095679089') as is_valid,
    'Expected: true' as expected;

SELECT 
    'Date extraction test:' as test_info,
    '9001095679089' as id_number,
    extract_dob_from_sa_id('9001095679089') as extracted_dob,
    'Expected: 1990-01-09' as expected;

-- Step 15: Test other examples
SELECT 'Testing other examples:' as test_info;
SELECT 
    '8001015009087' as test_id,
    validate_sa_id_number('8001015009087') as is_valid,
    extract_dob_from_sa_id('8001015009087') as extracted_dob,
    'Expected: 1980-01-01' as expected;

SELECT 
    '9503151234567' as test_id,
    validate_sa_id_number('9503151234567') as is_valid,
    extract_dob_from_sa_id('9503151234567') as extracted_dob,
    'Expected: 1995-03-15' as expected;

SELECT 'SA ID Number field setup completed with date extraction and validation!' as status;
