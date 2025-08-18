-- BILLING MODULE SAMPLE DATA
-- Initial setup with common medical services and pricing

-- 1. INSERT SAMPLE SERVICES
INSERT INTO public.services (name, description, is_cross_department) VALUES
-- Consultation Services
('General Consultation', 'Standard medical consultation with general practitioner', false),
('Specialist Consultation', 'Specialist medical consultation', false),
('Follow-up Consultation', 'Follow-up medical consultation', false),
('Emergency Consultation', 'Emergency medical consultation', false),

-- Diagnostic Services
('Vitals Check', 'Blood pressure, temperature, pulse, respiratory rate', false),
('Laboratory Tests', 'Blood tests, urine tests, stool tests', true),
('X-Ray', 'Radiological examination and interpretation', true),
('ECG', 'Electrocardiogram and interpretation', true),
('Ultrasound', 'Ultrasonography examination and interpretation', true),
('MRI Scan', 'Magnetic Resonance Imaging scan', true),
('CT Scan', 'Computed Tomography scan', true),

-- Treatment Services
('Surgery', 'Surgical procedures', false),
('Minor Procedures', 'Minor medical procedures and treatments', false),
('Emergency Care', 'Emergency medical treatment and stabilization', false),
('Wound Care', 'Wound cleaning, dressing, and treatment', false),
('Injection', 'Intramuscular, subcutaneous, or intravenous injection', false),
('IV Therapy', 'Intravenous therapy and medication administration', false),

-- Administrative Services
('Administration Fee', 'General administrative and facility fee', false),
('Medical Certificate', 'Medical certificate and documentation', false),
('Referral Letter', 'Medical referral letter to specialist', false)
ON CONFLICT DO NOTHING;

-- 2. LINK SERVICES TO DEPARTMENTS
-- Note: Adjust department IDs based on your existing data
DO $$
DECLARE
    dept_id UUID;
    service_id UUID;
BEGIN
    -- Get all departments
    FOR dept_id IN SELECT id FROM public.departments
    LOOP
        -- Link department-specific services
        FOR service_id IN 
            SELECT id FROM public.services 
            WHERE NOT is_cross_department
        LOOP
            INSERT INTO public.department_services (service_id, department_id)
            VALUES (service_id, dept_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
        
        -- Link cross-department services to all departments
        FOR service_id IN 
            SELECT id FROM public.services 
            WHERE is_cross_department
        LOOP
            INSERT INTO public.department_services (service_id, department_id)
            VALUES (service_id, dept_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 3. INSERT SAMPLE SERVICE PRICES
-- Cash prices (typically lower)
INSERT INTO public.service_prices (service_id, billing_type, price)
SELECT s.id, 'cash',
  CASE s.name
    WHEN 'General Consultation' THEN 500.00
    WHEN 'Specialist Consultation' THEN 800.00
    WHEN 'Follow-up Consultation' THEN 300.00
    WHEN 'Emergency Consultation' THEN 1000.00
    WHEN 'Vitals Check' THEN 150.00
    WHEN 'Laboratory Tests' THEN 300.00
    WHEN 'X-Ray' THEN 400.00
    WHEN 'ECG' THEN 250.00
    WHEN 'Ultrasound' THEN 800.00
    WHEN 'MRI Scan' THEN 2500.00
    WHEN 'CT Scan' THEN 1500.00
    WHEN 'Surgery' THEN 5000.00
    WHEN 'Minor Procedures' THEN 800.00
    WHEN 'Emergency Care' THEN 1200.00
    WHEN 'Wound Care' THEN 200.00
    WHEN 'Injection' THEN 100.00
    WHEN 'IV Therapy' THEN 300.00
    WHEN 'Administration Fee' THEN 100.00
    WHEN 'Medical Certificate' THEN 50.00
    WHEN 'Referral Letter' THEN 75.00
  END
FROM public.services s
WHERE s.name IN (
  'General Consultation', 'Specialist Consultation', 'Follow-up Consultation', 'Emergency Consultation',
  'Vitals Check', 'Laboratory Tests', 'X-Ray', 'ECG', 'Ultrasound', 'MRI Scan', 'CT Scan',
  'Surgery', 'Minor Procedures', 'Emergency Care', 'Wound Care', 'Injection', 'IV Therapy',
  'Administration Fee', 'Medical Certificate', 'Referral Letter'
)
ON CONFLICT DO NOTHING;

-- Medical Aid prices (typically higher)
INSERT INTO public.service_prices (service_id, billing_type, price)
SELECT s.id, 'medical_aid',
  CASE s.name
    WHEN 'General Consultation' THEN 750.00
    WHEN 'Specialist Consultation' THEN 1200.00
    WHEN 'Follow-up Consultation' THEN 450.00
    WHEN 'Emergency Consultation' THEN 1500.00
    WHEN 'Vitals Check' THEN 200.00
    WHEN 'Laboratory Tests' THEN 450.00
    WHEN 'X-Ray' THEN 600.00
    WHEN 'ECG' THEN 350.00
    WHEN 'Ultrasound' THEN 1200.00
    WHEN 'MRI Scan' THEN 3750.00
    WHEN 'CT Scan' THEN 2250.00
    WHEN 'Surgery' THEN 7500.00
    WHEN 'Minor Procedures' THEN 1200.00
    WHEN 'Emergency Care' THEN 1800.00
    WHEN 'Wound Care' THEN 300.00
    WHEN 'Injection' THEN 150.00
    WHEN 'IV Therapy' THEN 450.00
    WHEN 'Administration Fee' THEN 150.00
    WHEN 'Medical Certificate' THEN 75.00
    WHEN 'Referral Letter' THEN 100.00
  END
FROM public.services s
WHERE s.name IN (
  'General Consultation', 'Specialist Consultation', 'Follow-up Consultation', 'Emergency Consultation',
  'Vitals Check', 'Laboratory Tests', 'X-Ray', 'ECG', 'Ultrasound', 'MRI Scan', 'CT Scan',
  'Surgery', 'Minor Procedures', 'Emergency Care', 'Wound Care', 'Injection', 'IV Therapy',
  'Administration Fee', 'Medical Certificate', 'Referral Letter'
)
ON CONFLICT DO NOTHING;

-- 4. INSERT SAMPLE MEDICATIONS
INSERT INTO public.medications (name, description, unit) VALUES
-- Pain Relief
('Paracetamol 500mg', 'Pain relief and fever reduction medication', 'tablet'),
('Ibuprofen 400mg', 'Anti-inflammatory pain relief medication', 'tablet'),
('Morphine 10mg/ml', 'Strong pain relief medication', 'ml'),
('Tramadol 50mg', 'Moderate pain relief medication', 'tablet'),

-- Antibiotics
('Amoxicillin 500mg', 'Broad-spectrum antibiotic for bacterial infections', 'capsule'),
('Azithromycin 500mg', 'Macrolide antibiotic for respiratory infections', 'tablet'),
('Ciprofloxacin 500mg', 'Fluoroquinolone antibiotic for various infections', 'tablet'),
('Doxycycline 100mg', 'Tetracycline antibiotic for various infections', 'tablet'),

-- Cardiovascular
('Amlodipine 5mg', 'Calcium channel blocker for blood pressure', 'tablet'),
('Lisinopril 10mg', 'ACE inhibitor for blood pressure and heart failure', 'tablet'),
('Metoprolol 50mg', 'Beta blocker for blood pressure and heart conditions', 'tablet'),
('Atorvastatin 20mg', 'Statin for cholesterol management', 'tablet'),

-- Diabetes
('Metformin 500mg', 'First-line medication for type 2 diabetes', 'tablet'),
('Gliclazide 80mg', 'Sulfonylurea for diabetes management', 'tablet'),
('Insulin Regular', 'Short-acting insulin for diabetes', 'ml'),
('Insulin NPH', 'Intermediate-acting insulin for diabetes', 'ml'),

-- Respiratory
('Salbutamol Inhaler', 'Bronchodilator for asthma and COPD', 'inhaler'),
('Ipratropium Inhaler', 'Anticholinergic for COPD', 'inhaler'),
('Beclomethasone Inhaler', 'Inhaled corticosteroid for asthma', 'inhaler'),

-- Gastrointestinal
('Omeprazole 20mg', 'Proton pump inhibitor for acid reflux', 'capsule'),
('Ranitidine 150mg', 'H2 blocker for acid reflux', 'tablet'),
('Loperamide 2mg', 'Anti-diarrheal medication', 'tablet'),

-- Other Common Medications
('Dexamethasone 4mg', 'Corticosteroid for inflammation and allergies', 'tablet'),
('Furosemide 40mg', 'Diuretic for fluid retention and blood pressure', 'tablet'),
('Warfarin 5mg', 'Anticoagulant for blood clot prevention', 'tablet'),
('Aspirin 100mg', 'Blood thinner and pain relief', 'tablet')
ON CONFLICT DO NOTHING;

-- 5. INSERT SAMPLE MEDICATION PRICES
-- Cash prices for medications
INSERT INTO public.medication_prices (medication_id, billing_type, price)
SELECT m.id, 'cash', 
  CASE m.name
    WHEN 'Paracetamol 500mg' THEN 2.50
    WHEN 'Ibuprofen 400mg' THEN 3.00
    WHEN 'Morphine 10mg/ml' THEN 15.00
    WHEN 'Tramadol 50mg' THEN 8.00
    WHEN 'Amoxicillin 500mg' THEN 15.00
    WHEN 'Azithromycin 500mg' THEN 25.00
    WHEN 'Ciprofloxacin 500mg' THEN 20.00
    WHEN 'Doxycycline 100mg' THEN 18.00
    WHEN 'Amlodipine 5mg' THEN 12.00
    WHEN 'Lisinopril 10mg' THEN 10.00
    WHEN 'Metoprolol 50mg' THEN 14.00
    WHEN 'Atorvastatin 20mg' THEN 22.00
    WHEN 'Metformin 500mg' THEN 8.00
    WHEN 'Gliclazide 80mg' THEN 16.00
    WHEN 'Insulin Regular' THEN 45.00
    WHEN 'Insulin NPH' THEN 50.00
  END
FROM public.medications m
WHERE m.name IN (
  'Paracetamol 500mg', 'Ibuprofen 400mg', 'Morphine 10mg/ml', 'Tramadol 50mg',
  'Amoxicillin 500mg', 'Azithromycin 500mg', 'Ciprofloxacin 500mg', 'Doxycycline 100mg',
  'Amlodipine 5mg', 'Lisinopril 10mg', 'Metoprolol 50mg', 'Atorvastatin 20mg',
  'Metformin 500mg', 'Gliclazide 80mg', 'Insulin Regular', 'Insulin NPH'
)
ON CONFLICT DO NOTHING;

-- Medical Aid prices for medications
INSERT INTO public.medication_prices (medication_id, billing_type, price)
SELECT m.id, 'medical_aid', 
  CASE m.name
    WHEN 'Paracetamol 500mg' THEN 3.75
    WHEN 'Ibuprofen 400mg' THEN 4.50
    WHEN 'Morphine 10mg/ml' THEN 22.50
    WHEN 'Tramadol 50mg' THEN 12.00
    WHEN 'Amoxicillin 500mg' THEN 22.50
    WHEN 'Azithromycin 500mg' THEN 37.50
    WHEN 'Ciprofloxacin 500mg' THEN 30.00
    WHEN 'Doxycycline 100mg' THEN 27.00
    WHEN 'Amlodipine 5mg' THEN 18.00
    WHEN 'Lisinopril 10mg' THEN 15.00
    WHEN 'Metoprolol 50mg' THEN 21.00
    WHEN 'Atorvastatin 20mg' THEN 33.00
    WHEN 'Metformin 500mg' THEN 12.00
    WHEN 'Gliclazide 80mg' THEN 24.00
    WHEN 'Insulin Regular' THEN 67.50
    WHEN 'Insulin NPH' THEN 75.00
  END
FROM public.medications m
WHERE m.name IN (
  'Paracetamol 500mg', 'Ibuprofen 400mg', 'Morphine 10mg/ml', 'Tramadol 50mg',
  'Amoxicillin 500mg', 'Azithromycin 500mg', 'Ciprofloxacin 500mg', 'Doxycycline 100mg',
  'Amlodipine 5mg', 'Lisinopril 10mg', 'Metoprolol 50mg', 'Atorvastatin 20mg',
  'Metformin 500mg', 'Gliclazide 80mg', 'Insulin Regular', 'Insulin NPH'
)
ON CONFLICT DO NOTHING;

-- 6. VERIFICATION QUERIES
SELECT 'Sample services loaded:' as status;
SELECT name, description, is_cross_department 
FROM public.services 
ORDER BY name;

SELECT 'Sample service prices loaded:' as status;
SELECT s.name as service, sp.billing_type, sp.price
FROM public.service_prices sp
JOIN public.services s ON sp.service_id = s.id
ORDER BY s.name, sp.billing_type;

SELECT 'Sample medications loaded:' as status;
SELECT name, unit 
FROM public.medications 
ORDER BY name;

SELECT 'Sample medication prices loaded:' as status;
SELECT m.name as medication, mp.billing_type, mp.price
FROM public.medication_prices mp
JOIN public.medications m ON mp.medication_id = m.id
ORDER BY m.name, mp.billing_type;

-- 7. COMPLETION MESSAGE
SELECT '🎉 Billing module sample data loaded successfully!' as completion_message;
SELECT 'Next steps:' as next_steps;
SELECT '1. Run billing_module_schema.sql to create tables' as step1;
SELECT '2. Run billing_functions.sql to create functions' as step3;
SELECT '3. Configure department-specific services' as step4;
SELECT '4. Set up custom pricing for your facility' as step5;
SELECT '5. Create admin interface for configuration' as step6;
