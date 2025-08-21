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

// Helper function to get doctor's department assignments
export async function getDoctorDepartments(doctorId: string): Promise<string[]> {
  try {
    console.log('Getting doctor departments for:', doctorId);
    
    // Use the database function first
    const { data, error } = await supabase.rpc('get_doctor_departments_db', {
      p_doctor_id: doctorId
    });

    if (!error && data) {
      const departmentIds = data.map((dept: any) => dept.department_id);
      console.log('Database function returned departments:', departmentIds);
      return departmentIds;
    }

    console.log('Database function failed, using fallback method');
    // Fallback to manual query
    return await getDoctorDepartmentsFallback(doctorId);
  } catch (error) {
    console.error("getDoctorDepartments error:", error);
    // Fallback to manual query
    return await getDoctorDepartmentsFallback(doctorId);
  }
}

// Fallback method for getting doctor departments
async function getDoctorDepartmentsFallback(doctorId: string): Promise<string[]> {
  try {
    const departments: string[] = [];
    
    // Get from doctor_departments table
    const { data: deptAssignments, error: deptError } = await supabase
      .from("doctor_departments")
      .select("department_id")
      .eq("doctor_id", doctorId);

    if (!deptError && deptAssignments) {
      departments.push(...deptAssignments.map(d => d.department_id));
    }

    // Also check profiles.department_id as fallback
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", doctorId)
      .single();

    if (!profileError && profile?.department_id && !departments.includes(profile.department_id)) {
      departments.push(profile.department_id);
    }

    console.log('Fallback method returned departments:', departments);
    return departments;
  } catch (error) {
    console.error("getDoctorDepartmentsFallback error:", error);
    return [];
  }
}

// Helper function to assign doctor to department
export async function assignDoctorToDepartment(doctorId: string, departmentId: string): Promise<boolean> {
  try {
    console.log('Assigning doctor to department:', { doctorId, departmentId });
    
    // Use the database function first
    const { data, error } = await supabase.rpc('assign_doctor_to_department_db', {
      p_doctor_id: doctorId,
      p_department_id: departmentId
    });

    if (!error && data) {
      console.log('Doctor assigned successfully via database function');
      return true;
    }

    console.log('Database function failed, using fallback method');
    // Fallback to manual assignment
    return await assignDoctorToDepartmentFallback(doctorId, departmentId);
  } catch (error) {
    console.error("assignDoctorToDepartment error:", error);
    // Fallback to manual assignment
    return await assignDoctorToDepartmentFallback(doctorId, departmentId);
  }
}

// Fallback method for assigning doctor to department
async function assignDoctorToDepartmentFallback(doctorId: string, departmentId: string): Promise<boolean> {
  try {
    console.log('Using fallback assignment method');
    
    // First, try to insert into doctor_departments table
    const { error: deptError } = await supabase
      .from("doctor_departments")
      .insert([{
        doctor_id: doctorId,
        department_id: departmentId
      }]);

    if (deptError) {
      console.error("Failed to assign to doctor_departments:", deptError);
      
      // If that fails, try to update profiles.department_id as fallback
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ department_id: departmentId })
        .eq("id", doctorId);

      if (profileError) {
        console.error("Failed to update profiles.department_id:", profileError);
        return false;
      }
      
      console.log('Doctor assigned via profiles.department_id');
      return true;
    }

    console.log('Doctor assigned via doctor_departments table');
    return true;
  } catch (error) {
    console.error("assignDoctorToDepartmentFallback error:", error);
    return false;
  }
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

// Verify doctor has access to consultation (simplified since queue is already filtered)
export async function verifyDoctorAccess(queueItemId: string, doctorId: string): Promise<boolean> {
  try {
    console.log('Verifying doctor access:', { queueItemId, doctorId });
    
    // Since the queue is now filtered by department, this is just a simple verification
    const { data, error } = await supabase.rpc('can_doctor_access_queue_item', {
      p_doctor_id: doctorId,
      p_queue_item_id: queueItemId
    });

    if (error) {
      console.error("Database verification error:", error);
      // Fallback to simple check
      return await verifyDoctorAccessFallback(queueItemId, doctorId);
    }

    console.log('Access verification result:', data);
    return data === true;
  } catch (error) {
    console.error("verifyDoctorAccess error:", error);
    // Fallback to simple check
    return await verifyDoctorAccessFallback(queueItemId, doctorId);
  }
}

// Validate queue item before starting consultation
export async function validateQueueItem(queueItemId: string): Promise<{
  isValid: boolean;
  error?: string;
  queueItem?: any;
}> {
  try {
    console.log('Validating queue item:', queueItemId);
    
    // Check if queue item exists and is available for consultation
    const { data: queueItem, error } = await supabase
      .from("queue")
      .select("*")
      .eq("id", queueItemId)
      .single();

    if (error) {
      console.error("Queue item validation error:", error);
      if (error.code === 'PGRST116') {
        return {
          isValid: false,
          error: "Queue item not found. It may have been removed or completed."
        };
      }
      return {
        isValid: false,
        error: "Failed to validate queue item. Please try again."
      };
    }

    if (!queueItem) {
      return {
        isValid: false,
        error: "Queue item not found. It may have been removed or completed."
      };
    }

    // Check if queue item is still in a valid status for consultation
    if (queueItem.status === 'completed') {
      return {
        isValid: false,
        error: "This patient's consultation has already been completed."
      };
    }

    if (queueItem.status === 'in-consultation') {
      return {
        isValid: false,
        error: "This patient is already in consultation with another doctor."
      };
    }

    if (queueItem.status === 'archived') {
      return {
        isValid: false,
        error: "This patient's record has been archived."
      };
    }

    // Check if queue item is still in waiting status
    if (queueItem.status !== 'waiting') {
      return {
        isValid: false,
        error: `Patient is in '${queueItem.status}' status and cannot start consultation.`
      };
    }

    console.log('Queue item validation successful:', queueItem);
    return {
      isValid: true,
      queueItem
    };
  } catch (error) {
    console.error("validateQueueItem error:", error);
    return {
      isValid: false,
      error: "Failed to validate queue item. Please try again."
    };
  }
}

// Simplified fallback verification method
async function verifyDoctorAccessFallback(queueItemId: string, doctorId: string): Promise<boolean> {
  try {
    console.log('Using simplified fallback verification');
    
    // Simple check: if the doctor can see this queue item, they can access it
    // This is a safety check in case the main filtering fails
    const { data: queueItem, error: queueError } = await supabase
      .from("queue")
      .select("department_id")
      .eq("id", queueItemId)
      .single();

    if (queueError || !queueItem?.department_id) {
      console.error("Queue item not found:", queueError);
      return false;
    }

    // Check if doctor has access to this department
    const { data: deptAssignment, error: deptError } = await supabase
      .from("doctor_departments")
      .select("id")
      .eq("doctor_id", doctorId)
      .eq("department_id", queueItem.department_id)
      .single();

    if (deptAssignment) {
      console.log('Access verified via doctor_departments');
      return true;
    }

    // Fallback to profiles.department_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", doctorId)
      .single();

    if (!profileError && profile?.department_id === queueItem.department_id) {
      console.log('Access verified via profiles.department_id');
      return true;
    }

    console.log('Access denied - doctor not assigned to department');
    return false;
  } catch (error) {
    console.error("verifyDoctorAccessFallback error:", error);
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

    // First, validate the queue item before proceeding
    const validation = await validateQueueItem(data.queue_item_id);
    if (!validation.isValid) {
      throw new Error(validation.error || "Queue item validation failed");
    }

    console.log('Queue item validation passed:', validation.queueItem);

    // Verify doctor has access to this consultation
    const hasAccess = await verifyDoctorAccess(data.queue_item_id, data.doctor_id);
    if (!hasAccess) {
      throw new Error("Access denied: You can only start consultations for patients in your assigned department");
    }

    console.log('Doctor access verified, calling start_consultation RPC...');

    const { data: result, error } = await supabase.rpc('start_consultation', {
      p_queue_item_id: data.queue_item_id,
      p_doctor_id: data.doctor_id,
      p_notes: data.notes || null
    });

    console.log('Supabase RPC result:', result);
    console.log('Supabase RPC error:', error);

    if (error) {
      console.error("Failed to start consultation:", error);
      
      // Create a more informative error
      const enhancedError = new Error(error.message || 'Failed to start consultation');
      (enhancedError as any).code = error.code;
      (enhancedError as any).details = error.details;
      (enhancedError as any).hint = error.hint;
      
      throw enhancedError;
    }

    if (!result) {
      throw new Error("No session ID returned from consultation start");
    }

    console.log('Consultation started successfully with session ID:', result);
    return result;
  } catch (error) {
    console.error("startConsultation error:", error);
    
    // If it's already an enhanced error, re-throw it
    if (error && typeof error === 'object' && (error as any).code) {
      throw error;
    }
    
    // Create a standard error if it's not already enhanced
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Failed to start consultation: ${error}`);
    }
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

// Get current doctor's profile information
export async function getCurrentDoctorProfile(doctorId: string) {
  try {
    // First, get the basic profile information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        department_id
      `)
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();

    if (profileError) throw profileError;

    // Then, get the department name separately
    let departmentName = 'No Department Assigned';
    if (profile.department_id) {
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .single();
      
      if (!deptError && department) {
        departmentName = department.name;
      }
    }

    return {
      id: profile.id,
      full_name: profile.full_name,
      department_id: profile.department_id,
      department_name: departmentName
    };
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    throw error;
  }
}
