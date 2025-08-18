import { supabase } from "./supabase";

// =====================================================
// WORKFLOW AND AUDIT LOGGING TYPES
// =====================================================

export interface WorkflowState {
  id: string;
  queue_item_id: string;
  patient_id: string;
  current_state: 'registered' | 'queued' | 'checked_in' | 'in_consultation' | 
                'consultation_completed' | 'prescribed' | 'referred' | 'discharged';
  previous_state?: string;
  state_data?: any;
  transition_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  user_id: string;
  user_role: string;
  user_department_id?: string;
  ip_address?: string;
  user_agent?: string;
  action_details?: any;
  created_at: string;
}

export interface PatientJourneyEvent {
  id: string;
  patient_id: string;
  queue_item_id: string;
  event_type: string;
  event_description: string;
  event_data?: any;
  performed_by: string;
  performed_by_role: string;
  performed_by_department_id?: string;
  event_timestamp: string;
}

export interface WorkflowHistoryItem {
  event_type: string;
  event_description: string;
  timestamp: string;
  performed_by_role: string;
  performed_by_department?: string;
  event_data?: any;
}

export interface QueueItemWorkflow {
  current_state: string;
  previous_state?: string;
  transition_reason?: string;
  state_data?: any;
  created_at: string;
  created_by_role: string;
}

export interface AuditTrailItem {
  action_type: string;
  old_values?: any;
  new_values?: any;
  user_role: string;
  user_department?: string;
  action_details?: any;
  created_at: string;
}

// =====================================================
// WORKFLOW MANAGEMENT FUNCTIONS
// =====================================================

// Update workflow state for a queue item
export async function updateWorkflowState(
  queueItemId: string,
  newState: WorkflowState['current_state'],
  transitionReason?: string,
  stateData?: any
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('update_workflow_state', {
      p_queue_item_id: queueItemId,
      p_new_state: newState,
      p_transition_reason: transitionReason || null,
      p_state_data: stateData || null
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating workflow state:', error);
    throw error;
  }
}

// Get workflow history for a specific patient
export async function getPatientWorkflowHistory(
  patientId: string,
  daysBack: number = 30
): Promise<WorkflowHistoryItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_patient_workflow_history', {
      p_patient_id: patientId,
      p_days_back: daysBack
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching patient workflow history:', error);
    throw error;
  }
}

// Get workflow for a specific queue item
export async function getQueueItemWorkflow(
  queueItemId: string
): Promise<QueueItemWorkflow[]> {
  try {
    const { data, error } = await supabase.rpc('get_queue_item_workflow', {
      p_queue_item_id: queueItemId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching queue item workflow:', error);
    throw error;
  }
}

// Get audit trail for a specific record
export async function getAuditTrail(
  tableName: string,
  recordId: string,
  daysBack: number = 30
): Promise<AuditTrailItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_audit_trail', {
      p_table_name: tableName,
      p_record_id: recordId,
      p_days_back: daysBack
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    throw error;
  }
}

// =====================================================
// ENHANCED QUEUE FUNCTIONS WITH WORKFLOW LOGGING
// =====================================================

// Enhanced addToQueue function that automatically creates workflow state
export async function addToQueueWithWorkflow(data: {
  patient_id?: string;
  patient_name: string;
  priority: "low" | "normal" | "high" | "urgent";
  notes?: string;
  doctor_id?: string;
  department_id: string;
  appointment_time?: string;
  is_walk_in?: boolean;
}): Promise<any> {
  try {
    // First, add to queue (this will automatically trigger workflow creation)
    const { data: queueItem, error } = await supabase
      .from("queue")
      .insert([{
        patient_id: data.patient_id || null,
        patient_name: data.patient_name,
        priority: data.priority,
        notes: data.notes,
        doctor_id: data.doctor_id,
        department_id: data.department_id,
        appointment_time: data.appointment_time,
        status: "waiting",
        added_at: new Date().toISOString(),
        is_walk_in: data.is_walk_in || !data.patient_id,
        is_appointment_based: !!data.appointment_time
      }])
      .select()
      .single();

    if (error) throw error;

    // The workflow state and audit logs are automatically created by database triggers
    console.log('Queue item created with workflow logging:', queueItem.id);
    
    return queueItem;
  } catch (error) {
    console.error('Error adding to queue with workflow:', error);
    throw error;
  }
}

// Enhanced updateQueueStatus function with workflow logging
export async function updateQueueStatusWithWorkflow(
  queueId: string,
  status: "waiting" | "in-consultation" | "completed",
  doctorId?: string
): Promise<void> {
  try {
    const updateData: any = { status };
    
    if (status === "in-consultation") {
      updateData.checked_in_at = new Date().toISOString();
      if (doctorId) {
        updateData.doctor_id = doctorId;
      }
    } else if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("queue")
      .update(updateData)
      .eq("id", queueId);

    if (error) throw error;

    // The workflow state update and audit logging are automatically handled by database triggers
    console.log('Queue status updated with workflow logging:', queueId, status);
  } catch (error) {
    console.error('Error updating queue status with workflow:', error);
    throw error;
  }
}

// =====================================================
// WORKFLOW REPORTING FUNCTIONS
// =====================================================

// Get comprehensive patient journey
export async function getComprehensivePatientJourney(
  patientId: string,
  daysBack: number = 30
): Promise<{
  workflow: WorkflowHistoryItem[];
  audit: AuditTrailItem[];
}> {
  try {
    const [workflow, audit] = await Promise.all([
      getPatientWorkflowHistory(patientId, daysBack),
      getAuditTrail('queue', patientId, daysBack)
    ]);

    return { workflow, audit };
  } catch (error) {
    console.error('Error fetching comprehensive patient journey:', error);
    throw error;
  }
}

// Get department workflow summary
export async function getDepartmentWorkflowSummary(
  departmentId: string,
  daysBack: number = 7
): Promise<{
  total_patients: number;
  waiting: number;
  in_consultation: number;
  completed: number;
  average_wait_time: number;
}> {
  try {
    const { data, error } = await supabase
      .from('workflow_states')
      .select(`
        current_state,
        created_at,
        workflow_states!inner(queue_item_id)
      `)
      .eq('workflow_states.department_id', departmentId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const states = data || [];
    const total = states.length;
    const waiting = states.filter(s => s.current_state === 'queued').length;
    const inConsultation = states.filter(s => s.current_state === 'in_consultation').length;
    const completed = states.filter(s => s.current_state === 'consultation_completed').length;

    return {
      total_patients: total,
      waiting,
      in_consultation: inConsultation,
      completed,
      average_wait_time: 0 // Calculate based on your business logic
    };
  } catch (error) {
    console.error('Error fetching department workflow summary:', error);
    throw error;
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Format workflow state for display
export function formatWorkflowState(state: string): string {
  const stateMap: Record<string, string> = {
    'registered': 'Patient Registered',
    'queued': 'In Queue',
    'checked_in': 'Checked In',
    'in_consultation': 'In Consultation',
    'consultation_completed': 'Consultation Completed',
    'prescribed': 'Prescription Given',
    'referred': 'Referred',
    'discharged': 'Discharged'
  };
  
  return stateMap[state] || state;
}

// Get workflow state color for UI
export function getWorkflowStateColor(state: string): string {
  const colorMap: Record<string, string> = {
    'registered': 'bg-blue-100 text-blue-800',
    'queued': 'bg-yellow-100 text-yellow-800',
    'checked_in': 'bg-orange-100 text-orange-800',
    'in_consultation': 'bg-purple-100 text-purple-800',
    'consultation_completed': 'bg-green-100 text-green-800',
    'prescribed': 'bg-indigo-100 text-indigo-800',
    'referred': 'bg-pink-100 text-pink-800',
    'discharged': 'bg-gray-100 text-gray-800'
  };
  
  return colorMap[state] || 'bg-gray-100 text-gray-800';
}

// Calculate time difference for workflow events
export function calculateWorkflowTimeDifference(timestamp: string): string {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return 'Just now';
}
