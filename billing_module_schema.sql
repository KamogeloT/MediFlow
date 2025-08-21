-- BILLING MODULE DATABASE SCHEMA
-- Core tables for MediFlow billing system

-- 1. BILLING PROFILES
CREATE TABLE IF NOT EXISTS public.billing_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('cash', 'medical_aid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id)
);

-- 2. MEDICAL AID DETAILS
CREATE TABLE IF NOT EXISTS public.medical_aid_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_profile_id UUID NOT NULL REFERENCES public.billing_profiles(id) ON DELETE CASCADE,
    provider_name VARCHAR(255) NOT NULL,
    membership_number VARCHAR(100) NOT NULL,
    plan_type VARCHAR(100),
    authorisation_required BOOLEAN DEFAULT false,
    contact_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(billing_profile_id)
);

-- 3. SERVICES
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_cross_department BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DEPARTMENT SERVICES (Junction table)
CREATE TABLE IF NOT EXISTS public.department_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, department_id)
);

-- 5. SERVICE PRICES
CREATE TABLE IF NOT EXISTS public.service_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('cash', 'medical_aid')),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, billing_type, effective_date)
);

-- 6. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    billing_profile_id UUID NOT NULL REFERENCES public.billing_profiles(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'interim', 'closed', 'finalized')),
    total_amount DECIMAL(10,2) DEFAULT 0 CHECK (total_amount >= 0),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ
);

-- 7. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    added_by UUID REFERENCES public.profiles(id),
    added_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MEDICATIONS (Future Pharmacy)
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MEDICATION PRICES
CREATE TABLE IF NOT EXISTS public.medication_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('cash', 'medical_aid')),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(medication_id, billing_type, effective_date)
);

-- 10. UPDATE DEPARTMENTS TABLE
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS billing_enabled BOOLEAN DEFAULT true;

-- 11. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_billing_profiles_patient ON public.billing_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_prices_active ON public.service_prices(is_active);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- 12. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 13. SAMPLE DATA
INSERT INTO public.services (name, description, is_cross_department) VALUES
('General Consultation', 'Standard medical consultation', false),
('Vitals Check', 'Blood pressure, temperature, pulse', false),
('Laboratory Tests', 'Blood tests, urine tests', true),
('X-Ray', 'Radiological examination', true)
ON CONFLICT DO NOTHING;

-- 14. COMPLETION
SELECT 'Billing module schema created successfully!' as status;
