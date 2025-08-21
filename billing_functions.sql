-- BILLING MODULE HELPER FUNCTIONS
-- Essential functions for billing operations

-- 1. GENERATE INVOICE NUMBER
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    generated_invoice_number VARCHAR;
BEGIN
    -- Get the next sequential number for current year
    SELECT COALESCE(MAX(CAST(SUBSTRING(i.invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.invoices i
    WHERE i.invoice_number LIKE 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%';
    
    -- Format: INV-YYYY-XXX (e.g., INV-2024-001)
    generated_invoice_number := 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN generated_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 2. CALCULATE INVOICE TOTAL
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

-- 3. ADD SERVICE TO INVOICE
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

-- 4. GET PATIENT BILLING PROFILE
CREATE OR REPLACE FUNCTION get_patient_billing_profile(p_patient_id UUID)
RETURNS TABLE(
    billing_profile_id UUID,
    billing_type VARCHAR,
    provider_name VARCHAR,
    membership_number VARCHAR,
    plan_type VARCHAR,
    authorisation_required BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.billing_type,
        mad.provider_name,
        mad.membership_number,
        mad.plan_type,
        mad.authorisation_required
    FROM public.billing_profiles bp
    LEFT JOIN public.medical_aid_details mad ON bp.id = mad.billing_profile_id
    WHERE bp.patient_id = p_patient_id;
END;
$$ LANGUAGE plpgsql;

-- 5. GET DEPARTMENT SERVICES
CREATE OR REPLACE FUNCTION get_department_services(p_department_id UUID)
RETURNS TABLE(
    service_id UUID,
    service_name VARCHAR,
    description TEXT,
    is_cross_department BOOLEAN,
    cash_price DECIMAL,
    medical_aid_price DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.description,
        s.is_cross_department,
        sp_cash.price as cash_price,
        sp_medical.price as medical_aid_price
    FROM public.services s
    JOIN public.department_services ds ON s.id = ds.service_id
    LEFT JOIN public.service_prices sp_cash ON s.id = sp_cash.service_id AND sp_cash.billing_type = 'cash' AND sp_cash.is_active = true
    LEFT JOIN public.service_prices sp_medical ON s.id = sp_medical.service_id AND sp_medical.billing_type = 'medical_aid' AND sp_medical.is_active = true
    WHERE ds.department_id = p_department_id
    AND ds.is_active = true
    AND s.is_active = true
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE OR GET BILLING PROFILE
CREATE OR REPLACE FUNCTION create_or_get_billing_profile(
    p_patient_id UUID,
    p_billing_type VARCHAR,
    p_medical_aid_provider VARCHAR DEFAULT NULL,
    p_membership_number VARCHAR DEFAULT NULL,
    p_plan_type VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
    medical_aid_id UUID;
BEGIN
    -- Check if billing profile already exists
    SELECT id INTO profile_id
    FROM public.billing_profiles
    WHERE patient_id = p_patient_id;
    
    IF profile_id IS NULL THEN
        -- Create new billing profile
        INSERT INTO public.billing_profiles (patient_id, billing_type)
        VALUES (p_patient_id, p_billing_type)
        RETURNING id INTO profile_id;
        
        -- If medical aid, create medical aid details
        IF p_billing_type = 'medical_aid' AND p_medical_aid_provider IS NOT NULL THEN
            INSERT INTO public.medical_aid_details (
                billing_profile_id, provider_name, membership_number, plan_type
            ) VALUES (
                profile_id, p_medical_aid_provider, p_membership_number, p_plan_type
            ) RETURNING id INTO medical_aid_id;
        END IF;
    ELSE
        -- Update existing profile if type changed
        UPDATE public.billing_profiles
        SET billing_type = p_billing_type, updated_at = NOW()
        WHERE id = profile_id;
        
        -- Handle medical aid details
        IF p_billing_type = 'medical_aid' AND p_medical_aid_provider IS NOT NULL THEN
            -- Update or create medical aid details
            INSERT INTO public.medical_aid_details (
                billing_profile_id, provider_name, membership_number, plan_type
            ) VALUES (
                profile_id, p_medical_aid_provider, p_membership_number, p_plan_type
            )
            ON CONFLICT (billing_profile_id) DO UPDATE SET
                provider_name = EXCLUDED.provider_name,
                membership_number = EXCLUDED.membership_number,
                plan_type = EXCLUDED.plan_type,
                updated_at = NOW();
        END IF;
    END IF;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- 7. GET PATIENT INVOICES
CREATE OR REPLACE FUNCTION get_patient_invoices(p_patient_id UUID)
RETURNS TABLE(
    invoice_id UUID,
    invoice_number VARCHAR,
    status VARCHAR,
    total_amount DECIMAL,
    created_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.invoice_number,
        i.status,
        i.total_amount,
        i.created_at,
        i.closed_at,
        i.finalized_at
    FROM public.invoices i
    WHERE i.patient_id = p_patient_id
    ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. GET INVOICE DETAILS
CREATE OR REPLACE FUNCTION get_invoice_details(p_invoice_id UUID)
RETURNS TABLE(
    item_id UUID,
    service_name VARCHAR,
    quantity INTEGER,
    unit_price DECIMAL,
    total_price DECIMAL,
    added_at TIMESTAMPTZ,
    added_by_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ii.id,
        s.name,
        ii.quantity,
        ii.unit_price,
        ii.total_price,
        ii.added_at,
        p.full_name
    FROM public.invoice_items ii
    JOIN public.services s ON ii.service_id = s.id
    LEFT JOIN public.profiles p ON ii.added_by = p.id
    WHERE ii.invoice_id = p_invoice_id
    ORDER BY ii.added_at;
END;
$$ LANGUAGE plpgsql;

-- 9. CLOSE INVOICE
CREATE OR REPLACE FUNCTION close_invoice(p_invoice_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.invoices
    SET status = 'closed', closed_at = NOW()
    WHERE id = p_invoice_id
    AND status = 'open';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 10. FINALIZE INVOICE
CREATE OR REPLACE FUNCTION finalize_invoice(p_invoice_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.invoices
    SET status = 'finalized', finalized_at = NOW()
    WHERE id = p_invoice_id
    AND status IN ('open', 'closed');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- GRANT EXECUTE PERMISSIONS
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- COMPLETION MESSAGE
SELECT 'Billing module functions created successfully!' as status;
