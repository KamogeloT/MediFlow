import { supabase } from "./supabase";

// Types for consultation system
export interface ConsultationLog {
  id: string;
  queue_item_id: string;
  consultation_session_id?: string;
  patient_id?: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name?: string;
  department_id: string;
  department_name: string;
  action_type: 'consultation_started' | 'consultation_completed' | 'routed_to_department' | 'notes_added' | 'prescription_added' | 'diagnosis_added' | 'test_ordered' | 'follow_up_scheduled';
  action_details?: any;
  previous_department_id?: string;
  new_department_id?: string;
  consultation_duration_minutes?: number;
  created_at: string;
  notes?: string;
}

export interface ConsultationSession {
  id: string;
  queue_item_id: string;
  patient_id?: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name?: string;
  department_id: string;
  department_name: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'routed';
  consultation_notes?: string;
  diagnosis?: string;
  prescription?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  routing_reason?: string;
  routed_to_department_id?: string;
}

export interface ConsultationSummary {
  session_id: string;
  queue_item_id: string;
  patient_name: string;
  doctor_name?: string;
  department_name: string;
  started_at: string;
  ended_at?: string;
  status: string;
  diagnosis?: string;
  prescription?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  routing_reason?: string;
  routed_to_department?: string;
  duration_minutes?: number;
}

export interface StartConsultationData {
  queue_item_id: string;
  doctor_id: string;
  notes?: string;
}

export interface CompleteConsultationData {
  queue_item_id: string;
  diagnosis?: string;
  prescription?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  notes?: string;
}

export interface RouteConsultationData {
  queue_item_id: string;
  new_department_id: string;
  routing_reason: string;
  notes?: string;
}

export interface ArchiveConsultationData {
  queue_item_id: string;
  archive_reason?: string;
}

export interface ConsultationWorkflowState {
  id: string;
  consultation_session_id: string;
  current_state: 'started' | 'in_progress' | 'examination' | 'diagnosis' | 'prescription' | 'routing' | 'completed' | 'archived';
  previous_state?: string;
  state_data?: any;
  transition_reason?: string;
  created_at: string;
  created_by?: string;
}

// Helper function to ensure authentication
async function ensureAuthenticated() {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      throw new Error("Authentication required. Please log in again.");
    }
    
    if (!session) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error("Session refresh failed:", refreshError);
        throw new Error("Authentication required. Please log in again.");
      }
      
      return refreshData.session.user;
    }
    
    return session.user;
  } catch (error) {
    console.error("Authentication check failed:", error);
    throw new Error("Authentication required. Please log in again.");
  }
}

// Verify doctor has access to consultation (department-based)
export async function verifyDoctorAccess(queueItemId: string, doctorId: string): Promise<boolean> {
  try {
    // Get the doctor's assigned department
    const { data: doctorProfile, error: profileError } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", doctorId)
      .single();

    if (profileError || !doctorProfile?.department_id) {
      console.error("Failed to fetch doctor's department:", profileError);
      return false;
    }

    // Get the queue item's department
    const { data: queueItem, error: queueError } = await supabase
      .from("queue")
      .select("department_id")
      .eq("id", queueItemId)
      .single();

    if (queueError || !queueItem?.department_id) {
      console.error("Failed to fetch queue item department:", queueError);
      return false;
    }

    // Check if doctor's department matches queue item's department
    return doctorProfile.department_id === queueItem.department_id;
  } catch (error) {
    console.error("verifyDoctorAccess error:", error);
    return false;
  }
}

// Start a consultation
export async function startConsultation(data: StartConsultationData): Promise<string> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    console.log('startConsultation called with data:', data);
    console.log('User ID:', user.id);

    // Verify doctor has access to this consultation
    const hasAccess = await verifyDoctorAccess(data.queue_item_id, data.doctor_id);
    if (!hasAccess) {
      throw new Error("Access denied: You can only start consultations for patients in your assigned department");
    }

    const { data: result, error } = await supabase.rpc('start_consultation', {
      p_queue_item_id: data.queue_item_id,
      p_doctor_id: data.doctor_id,
      p_notes: data.notes || null
    });

    console.log('Supabase RPC result:', result);
    console.log('Supabase RPC error:', error);

    if (error) {
      console.error("Failed to start consultation:", error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error("startConsultation error:", error);
    throw error;
  }
}

// Complete a consultation
export async function completeConsultation(data: CompleteConsultationData): Promise<void> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    // Verify doctor has access to this consultation
    const hasAccess = await verifyDoctorAccess(data.queue_item_id, user.id);
    if (!hasAccess) {
      throw new Error("Access denied: You can only complete consultations for patients in your assigned department");
    }

    const { error } = await supabase.rpc('complete_consultation', {
      p_queue_item_id: data.queue_item_id,
      p_diagnosis: data.diagnosis || null,
      p_prescription: data.prescription || null,
      p_follow_up_required: data.follow_up_required || false,
      p_follow_up_date: data.follow_up_date || null,
      p_notes: data.notes || null
    });

    if (error) {
      console.error("Failed to complete consultation:", error);
      throw error;
    }
  } catch (error) {
    console.error("completeConsultation error:", error);
    throw error;
  }
}

// Route consultation to new department
export async function routeConsultation(data: RouteConsultationData): Promise<void> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    // Verify doctor has access to this consultation
    const hasAccess = await verifyDoctorAccess(data.queue_item_id, user.id);
    if (!hasAccess) {
      throw new Error("Access denied: You can only route consultations for patients in your assigned department");
    }

    const { error } = await supabase.rpc('route_consultation', {
      p_queue_item_id: data.queue_item_id,
      p_new_department_id: data.new_department_id,
      p_routing_reason: data.routing_reason,
      p_notes: data.notes || null
    });

    if (error) {
      console.error("Failed to route consultation:", error);
      throw error;
    }
  } catch (error) {
    console.error("routeConsultation error:", error);
    throw error;
  }
}

// Archive consultation
export async function archiveConsultation(data: ArchiveConsultationData): Promise<void> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    // Verify doctor has access to this consultation
    const hasAccess = await verifyDoctorAccess(data.queue_item_id, user.id);
    if (!hasAccess) {
      throw new Error("Access denied: You can only archive consultations for patients in your assigned department");
    }

    const { error } = await supabase.rpc('archive_consultation', {
      p_queue_item_id: data.queue_item_id,
      p_archive_reason: data.archive_reason || null
    });

    if (error) {
      console.error("Failed to archive consultation:", error);
      throw error;
    }
  } catch (error) {
    console.error("archiveConsultation error:", error);
    throw error;
  }
}

// Get consultation workflow states for a session
export async function getConsultationWorkflowStates(sessionId: string): Promise<ConsultationWorkflowState[]> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    // Get the queue item ID from the session to verify access
    const { data: session, error: sessionError } = await supabase
      .from("consultation_sessions")
      .select("queue_item_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session?.queue_item_id) {
      throw new Error("Consultation session not found");
    }

    // Verify doctor has access to this consultation
    const hasAccess = await verifyDoctorAccess(session.queue_item_id, user.id);
    if (!hasAccess) {
      throw new Error("Access denied: You can only view workflow states for patients in your assigned department");
    }

    const { data, error } = await supabase
      .from("consultation_workflow_states")
      .select("*")
      .eq("consultation_session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch workflow states:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getConsultationWorkflowStates error:", error);
    throw error;
  }
}

// Get department routing rules
export async function getDepartmentRoutingRules(): Promise<any[]> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from('department_routing_rules')
      .select('*')
      .eq('is_active', true)
      .order('routing_condition');

    if (error) {
      console.error("Failed to fetch department routing rules:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getDepartmentRoutingRules error:", error);
    throw error;
  }
}

// Get consultation logs for a queue item
export async function getConsultationLogs(queueItemId: string): Promise<ConsultationLog[]> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    // Verify doctor has access to this consultation
    const hasAccess = await verifyDoctorAccess(queueItemId, user.id);
    if (!hasAccess) {
      throw new Error("Access denied: You can only view consultation logs for patients in your assigned department");
    }

    const { data, error } = await supabase
      .from("consultation_logs")
      .select("*")
      .eq("queue_item_id", queueItemId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch consultation logs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getConsultationLogs error:", error);
    throw error;
  }
}

// Get consultation session for a queue item
export async function getConsultationSession(queueItemId: string): Promise<ConsultationSession | null> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from('consultation_sessions')
      .select('*')
      .eq('queue_item_id', queueItemId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Failed to fetch consultation session:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("getConsultationSession error:", error);
    throw error;
  }
}

// Get consultation summary for a queue item
export async function getConsultationSummary(queueItemId: string): Promise<ConsultationSummary | null> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from('consultation_summary')
      .select('*')
      .eq('queue_item_id', queueItemId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Failed to fetch consultation summary:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("getConsultationSummary error:", error);
    throw error;
  }
}

// Get all consultation logs for a patient
export async function getPatientConsultationHistory(patientId: string): Promise<ConsultationLog[]> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from('consultation_logs')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Failed to fetch patient consultation history:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getPatientConsultationHistory error:", error);
    throw error;
  }
}

// Get consultation logs for a doctor
export async function getDoctorConsultationLogs(doctorId: string): Promise<ConsultationLog[]> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from('consultation_logs')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Failed to fetch doctor consultation logs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getDoctorConsultationLogs error:", error);
    throw error;
  }
}

// Get consultation logs for a department
export async function getDepartmentConsultationLogs(departmentId: string): Promise<ConsultationLog[]> {
  try {
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from('consultation_logs')
      .select('*')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Failed to fetch department consultation logs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getDepartmentConsultationLogs error:", error);
    throw error;
  }
}
