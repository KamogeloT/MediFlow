import { supabase } from './supabase';

export interface BillingProfile {
  id: string;
  patient_id: string;
  billing_type: 'cash' | 'medical_aid';
  created_at: string;
  updated_at: string;
}

export interface MedicalAidDetails {
  id: string;
  billing_profile_id: string;
  provider_name: string;
  membership_number: string;
  plan_type?: string;
  authorisation_required: boolean;
  contact_number?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  is_cross_department: boolean;
  is_active: boolean;
}

export interface ServicePrice {
  id: string;
  service_id: string;
  billing_type: 'cash' | 'medical_aid';
  price: number;
  effective_date: string;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  patient_id: string;
  billing_profile_id: string;
  invoice_number: string;
  status: 'open' | 'closed' | 'finalized';
  total_amount: number;
  created_by: string;
  created_at: string;
  closed_at?: string;
  finalized_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  added_by: string;
  added_at: string;
}

// Billing Profile Functions
export async function createBillingProfile(
  patientId: string,
  billingType: 'cash' | 'medical_aid',
  medicalAidDetails?: Partial<MedicalAidDetails>
) {
  try {
    const { data, error } = await supabase.rpc('create_or_get_billing_profile', {
      p_patient_id: patientId,
      p_billing_type: billingType,
      p_medical_aid_provider: medicalAidDetails?.provider_name,
      p_membership_number: medicalAidDetails?.membership_number,
      p_plan_type: medicalAidDetails?.plan_type
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating billing profile:', error);
    return { data: null, error };
  }
}

export async function getPatientBillingProfile(patientId: string) {
  try {
    const { data, error } = await supabase.rpc('get_patient_billing_profile', {
      p_patient_id: patientId
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching billing profile:', error);
    return { data: null, error };
  }
}

// Service Functions
export async function getDepartmentServices(departmentId: string) {
  try {
    const { data, error } = await supabase.rpc('get_department_services', {
      p_department_id: departmentId
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching department services:', error);
    return { data: null, error };
  }
}

// Invoice Functions
export async function createInvoice(
  patientId: string,
  billingProfileId: string,
  createdBy: string
) {
  try {
    const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
    
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        patient_id: patientId,
        billing_profile_id: billingProfileId,
        invoice_number: invoiceNumber,
        status: 'open',
        total_amount: 0,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { data: null, error };
  }
}

export async function addServiceToInvoice(
  invoiceId: string,
  serviceId: string,
  quantity: number = 1,
  addedBy?: string
) {
  try {
    const { data, error } = await supabase.rpc('add_service_to_invoice', {
      p_invoice_id: invoiceId,
      p_service_id: serviceId,
      p_quantity: quantity,
      p_added_by: addedBy
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding service to invoice:', error);
    return { data: null, error };
  }
}

export async function getPatientInvoices(patientId: string) {
  try {
    const { data, error } = await supabase.rpc('get_patient_invoices', {
      p_patient_id: patientId
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching patient invoices:', error);
    return { data: null, error };
  }
}

export async function getInvoiceDetails(invoiceId: string) {
  try {
    const { data, error } = await supabase.rpc('get_invoice_details', {
      p_invoice_id: invoiceId
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return { data: null, error };
  }
}

export async function closeInvoice(invoiceId: string) {
  try {
    const { data, error } = await supabase.rpc('close_invoice', {
      p_invoice_id: invoiceId
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error closing invoice:', error);
    return { data: null, error };
  }
}

export async function finalizeInvoice(invoiceId: string) {
  try {
    const { data, error } = await supabase.rpc('finalize_invoice', {
      p_invoice_id: invoiceId
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error finalizing invoice:', error);
    return { data: null, error };
  }
}
