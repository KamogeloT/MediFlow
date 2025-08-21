-- =====================================================
-- BILLING MODULE DATABASE SCHEMA
-- =====================================================
-- This script creates the complete billing system for MediFlow
-- Includes: Billing profiles, services, pricing, invoices, and medication billing

-- =====================================================
-- 1. CORE BILLING TABLES
-- =====================================================

-- Billing profiles table
CREATE TABLE IF NOT EXISTS public.billing_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('cash', 'medical_aid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id)
);

-- Medical aid details table
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

-- Update departments table to include billing capability
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS billing_enabled BOOLEAN DEFAULT true;

-- =====================================================
-- 2. SERVICES & PRICING TABLES
-- =====================================================

-- Services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_cross_department BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Department services junction table
CREATE TABLE IF NOT EXISTS public.department_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, department_id)
);

-- Service prices table
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

-- Service price history for audit
CREATE TABLE IF NOT EXISTS public.service_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_price_id UUID NOT NULL REFERENCES public.service_prices(id) ON DELETE CASCADE,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. BILLING RECORDS TABLES
-- =====================================================

-- Invoices table
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

-- Invoice items table
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

-- =====================================================
-- 4. MEDICATION BILLING TABLES (Future Pharmacy)
-- =====================================================

-- Medications table
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication prices table
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

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Billing profiles indexes
CREATE INDEX IF NOT EXISTS idx_billing_profiles_patient_id ON public.billing_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_type ON public.billing_profiles(billing_type);

-- Medical aid indexes
CREATE INDEX IF NOT EXISTS idx_medical_aid_billing_profile ON public.medical_aid_details(billing_profile_id);
CREATE INDEX IF NOT EXISTS idx_medical_aid_provider ON public.medical_aid_details(provider_name);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_cross_department ON public.services(is_cross_department);

-- Department services indexes
CREATE INDEX IF NOT EXISTS idx_department_services_dept ON public.department_services(department_id);
CREATE INDEX IF NOT EXISTS idx_department_services_service ON public.department_services(service_id);
CREATE INDEX IF NOT EXISTS idx_department_services_active ON public.department_services(is_active);

-- Service prices indexes
CREATE INDEX IF NOT EXISTS idx_service_prices_service ON public.service_prices(service_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_billing_type ON public.service_prices(billing_type);
CREATE INDEX IF NOT EXISTS idx_service_prices_active ON public.service_prices(is_active);
CREATE INDEX IF NOT EXISTS idx_service_prices_effective_date ON public.service_prices(effective_date);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- Invoice items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service ON public.invoice_items(service_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_added_at ON public.invoice_items(added_at);

-- Medications indexes
CREATE INDEX IF NOT EXISTS idx_medications_active ON public.medications(is_active);
CREATE INDEX IF NOT EXISTS idx_medications_name ON public.medications(name);

-- Medication prices indexes
CREATE INDEX IF NOT EXISTS idx_medication_prices_medication ON public.medication_prices(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_prices_billing_type ON public.medication_prices(billing_type);
CREATE INDEX IF NOT EXISTS idx_medication_prices_active ON public.medication_prices(is_active);

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_billing_profiles_updated_at
    BEFORE UPDATE ON public.billing_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_aid_details_updated_at
    BEFORE UPDATE ON public.medical_aid_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_prices_updated_at
    BEFORE UPDATE ON public.service_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
    BEFORE UPDATE ON public.medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_prices_updated_at
    BEFORE UPDATE ON public.medication_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. FUNCTIONS FOR BILLING OPERATIONS
-- =====================================================

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    invoice_number VARCHAR;
BEGIN
    -- Get the next sequential number
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%';
    
    -- Format: INV-YYYY-XXX (e.g., INV-2024-001)
    invoice_number := 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice total
CREATE OR REPLACE FUNCTION calculate_invoice_total(invoice_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(total_price), 0)
    INTO total
    FROM public.invoice_items
    WHERE invoice_id = invoice_uuid;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to add service to invoice
CREATE OR REPLACE FUNCTION add_service_to_invoice(
    p_invoice_id UUID,
    p_service_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_added_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    item_id UUID;
    unit_price DECIMAL;
    total_price DECIMAL;
    billing_type VARCHAR;
BEGIN
    -- Get the billing type from the invoice
    SELECT bp.billing_type
    INTO billing_type
    FROM public.invoices i
    JOIN public.billing_profiles bp ON i.billing_profile_id = bp.id
    WHERE i.id = p_invoice_id;
    
    -- Get the current price for the service
    SELECT price
    INTO unit_price
    FROM public.service_prices
    WHERE service_id = p_service_id
    AND billing_type = billing_type
    AND is_active = true
    AND effective_date <= CURRENT_DATE
    ORDER BY effective_date DESC
    LIMIT 1;
    
    IF unit_price IS NULL THEN
        RAISE EXCEPTION 'No active price found for service % and billing type %', p_service_id, billing_type;
    END IF;
    
    -- Calculate total price
    total_price := unit_price * p_quantity;
    
    -- Insert the invoice item
    INSERT INTO public.invoice_items (
        invoice_id, service_id, quantity, unit_price, total_price, added_by
    ) VALUES (
        p_invoice_id, p_service_id, p_quantity, unit_price, total_price, p_added_by
    ) RETURNING id INTO item_id;
    
    -- Update invoice total
    UPDATE public.invoices
    SET total_amount = calculate_invoice_total(p_invoice_id)
    WHERE id = p_invoice_id;
    
    RETURN item_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. INITIAL DATA INSERTION
-- =====================================================

-- Insert sample services
INSERT INTO public.services (name, description, is_cross_department) VALUES
('General Consultation', 'Standard medical consultation', false),
('Specialist Consultation', 'Specialist medical consultation', false),
('Vitals Check', 'Blood pressure, temperature, pulse, etc.', false),
('Laboratory Tests', 'Blood tests, urine tests, etc.', true),
('X-Ray', 'Radiological examination', true),
('ECG', 'Electrocardiogram', true),
('Ultrasound', 'Ultrasonography examination', true),
('Surgery', 'Surgical procedures', false),
('Emergency Care', 'Emergency medical treatment', false),
('Follow-up Consultation', 'Follow-up medical consultation', false)
ON CONFLICT DO NOTHING;

-- Insert sample service prices (assuming we have departments with IDs)
-- Note: You'll need to adjust department IDs based on your existing data
DO $$
DECLARE
    dept_id UUID;
    service_id UUID;
BEGIN
    -- Get first department for sample data
    SELECT id INTO dept_id FROM public.departments LIMIT 1;
    
    IF dept_id IS NOT NULL THEN
        -- Link services to departments
        FOR service_id IN SELECT id FROM public.services WHERE NOT is_cross_department
        LOOP
            INSERT INTO public.department_services (service_id, department_id)
            VALUES (service_id, dept_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
        
        -- Link cross-department services to all departments
        FOR service_id IN SELECT id FROM public.services WHERE is_cross_department
        LOOP
            INSERT INTO public.department_services (service_id, department_id)
            SELECT service_id, id FROM public.departments
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- Insert sample service prices
INSERT INTO public.service_prices (service_id, billing_type, price) VALUES
((SELECT id FROM public.services WHERE name = 'General Consultation'), 'cash', 500.00),
((SELECT id FROM public.services WHERE name = 'General Consultation'), 'medical_aid', 750.00),
((SELECT id FROM public.services WHERE name = 'Specialist Consultation'), 'cash', 800.00),
((SELECT id FROM public.services WHERE name = 'Specialist Consultation'), 'medical_aid', 1200.00),
((SELECT id FROM public.services WHERE name = 'Vitals Check'), 'cash', 150.00),
((SELECT id FROM public.services WHERE name = 'Vitals Check'), 'medical_aid', 200.00),
((SELECT id FROM public.services WHERE name = 'Laboratory Tests'), 'cash', 300.00),
((SELECT id FROM public.services WHERE name = 'Laboratory Tests'), 'medical_aid', 450.00),
((SELECT id FROM public.services WHERE name = 'X-Ray'), 'cash', 400.00),
((SELECT id FROM public.services WHERE name = 'X-Ray'), 'medical_aid', 600.00),
((SELECT id FROM public.services WHERE name = 'ECG'), 'cash', 250.00),
((SELECT id FROM public.services WHERE name = 'ECG'), 'medical_aid', 350.00),
((SELECT id FROM public.services WHERE name = 'Ultrasound'), 'cash', 800.00),
((SELECT id FROM public.services WHERE name = 'Ultrasound'), 'medical_aid', 1200.00),
((SELECT id FROM public.services WHERE name = 'Surgery'), 'cash', 5000.00),
((SELECT id FROM public.services WHERE name = 'Surgery'), 'medical_aid', 7500.00),
((SELECT id FROM public.services WHERE name = 'Emergency Care'), 'cash', 1000.00),
((SELECT id FROM public.services WHERE name = 'Emergency Care'), 'medical_aid', 1500.00),
((SELECT id FROM public.services WHERE name = 'Follow-up Consultation'), 'cash', 300.00),
((SELECT id FROM public.services WHERE name = 'Follow-up Consultation'), 'medical_aid', 450.00)
ON CONFLICT DO NOTHING;

-- Insert sample medications
INSERT INTO public.medications (name, description, unit) VALUES
('Paracetamol 500mg', 'Pain relief and fever reduction', 'tablet'),
('Amoxicillin 500mg', 'Antibiotic for bacterial infections', 'capsule'),
('Ibuprofen 400mg', 'Anti-inflammatory pain relief', 'tablet'),
('Omeprazole 20mg', 'Acid reflux medication', 'capsule'),
('Metformin 500mg', 'Diabetes medication', 'tablet'),
('Amlodipine 5mg', 'Blood pressure medication', 'tablet'),
('Salbutamol Inhaler', 'Asthma medication', 'inhaler'),
('Insulin Regular', 'Diabetes insulin', 'ml'),
('Morphine 10mg', 'Pain relief', 'ml'),
('Dexamethasone 4mg', 'Anti-inflammatory steroid', 'tablet')
ON CONFLICT DO NOTHING;

-- Insert sample medication prices
INSERT INTO public.medication_prices (medication_id, billing_type, price) VALUES
((SELECT id FROM public.medications WHERE name = 'Paracetamol 500mg'), 'cash', 2.50),
((SELECT id FROM public.medications WHERE name = 'Paracetamol 500mg'), 'medical_aid', 3.75),
((SELECT id FROM public.medications WHERE name = 'Amoxicillin 500mg'), 'cash', 15.00),
((SELECT id FROM public.medications WHERE name = 'Amoxicillin 500mg'), 'medical_aid', 22.50),
((SELECT id FROM public.medications WHERE name = 'Ibuprofen 400mg'), 'cash', 3.00),
((SELECT id FROM public.medications WHERE name = 'Ibuprofen 400mg'), 'medical_aid', 4.50),
((SELECT id FROM public.medications WHERE name = 'Omeprazole 20mg'), 'cash', 25.00),
((SELECT id FROM public.medications WHERE name = 'Omeprazole 20mg'), 'medical_aid', 37.50),
((SELECT id FROM public.medications WHERE name = 'Metformin 500mg'), 'cash', 8.00),
((SELECT id FROM public.medications WHERE name = 'Metformin 500mg'), 'medical_aid', 12.00)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.billing_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.medical_aid_details TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.department_services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.service_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.service_price_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.medications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.medication_prices TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_invoice_total(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_service_to_invoice(UUID, UUID, INTEGER, UUID) TO authenticated;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Show created tables
SELECT 'Tables created successfully:' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'billing_profiles', 'medical_aid_details', 'services', 'department_services',
    'service_prices', 'service_price_history', 'invoices', 'invoice_items',
    'medications', 'medication_prices'
)
ORDER BY table_name;

-- Show sample services
SELECT 'Sample services loaded:' as status;
SELECT name, description, is_cross_department 
FROM public.services 
ORDER BY name;

-- Show sample prices
SELECT 'Sample service prices loaded:' as status;
SELECT s.name as service, sp.billing_type, sp.price
FROM public.service_prices sp
JOIN public.services s ON sp.service_id = s.id
ORDER BY s.name, sp.billing_type;

-- Show sample medications
SELECT 'Sample medications loaded:' as status;
SELECT name, unit 
FROM public.medications 
ORDER BY name;

-- Test invoice number generation
SELECT 'Invoice number generation test:' as status;
SELECT generate_invoice_number() as next_invoice_number;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT '🎉 Billing module database schema created successfully!' as completion_message;
SELECT 'Next steps:' as next_steps;
SELECT '1. Update existing patients with billing profiles' as step1;
SELECT '2. Configure department-specific services' as step2;
SELECT '3. Set up service prices for your facility' as step3;
SELECT '4. Create admin interface for configuration' as step4;
SELECT '5. Integrate billing into consultation panels' as step5;
