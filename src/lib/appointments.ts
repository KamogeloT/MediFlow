import { supabase } from "./supabase";

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name?: string;
  department_id?: string;
  department_name?: string;
  start_time: string;
  end_time: string;
  status_id: number;
  status_code: string;
  status_name: string;
  notes?: string;
  created_at: string;
}

export interface CreateAppointmentData {
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  department_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface Patient {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
}

// Helper function to get status ID by code
async function getStatusIdByCode(statusCode: string): Promise<number> {
  const { data, error } = await supabase
    .from('appointment_statuses')
    .select('id')
    .eq('code', statusCode)
    .single();
  
  if (error) {
    console.error('Error getting status ID:', error);
    throw new Error(`Invalid status code: ${statusCode}`);
  }
  
  return data.id;
}

// Helper function to get status code by ID
async function getStatusCodeById(statusId: number): Promise<string> {
  const { data, error } = await supabase
    .from('appointment_statuses')
    .select('code')
    .eq('id', statusId)
    .single();
  
  if (error) {
    console.error('Error getting status code:', error);
    throw new Error(`Invalid status ID: ${statusId}`);
  }
  
  return data.code;
}

export async function searchPatients(query: string): Promise<Patient[]> {
  try {
    // Clean the query to prevent SQL injection
    const cleanQuery = query.trim();
    
    if (cleanQuery.length < 2) {
      return [];
    }
    
    // Use simple ILIKE search on full_name only for now
    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, date_of_birth")
      .ilike('full_name', `%${cleanQuery}%`)
      .limit(10);

    if (error) {
      console.error("Supabase search error:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Patient search failed:", error);
    throw error;
  }
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, email, phone, date_of_birth")
    .eq("id", patientId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  return data;
}

export async function createAppointment(data: CreateAppointmentData): Promise<Appointment> {
  // Get doctor and department names
  const { data: doctorData } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.doctor_id)
    .single();

  const { data: departmentData } = await supabase
    .from("departments")
    .select("name")
    .eq("id", data.department_id)
    .single();

  // Get the scheduled status ID
  const statusId = await getStatusIdByCode("scheduled");

  const appointmentData = {
    patient_id: data.patient_id,
    patient_name: data.patient_name,
    doctor_id: data.doctor_id,
    department_id: data.department_id,
    start_time: data.start_time,
    end_time: data.end_time,
    notes: data.notes,
    status_id: statusId,
  };

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert([appointmentData])
    .select()
    .single();

  if (error) throw error;

  // Also add the patient to the queue
  try {
    const { addToQueue, fetchAllQueue } = await import('./queue');
    
    // Check if patient is already in queue for this department
    const existingQueue = await fetchAllQueue();
    const isAlreadyInQueue = existingQueue.some(
      item => item.patient_id === data.patient_id && 
              item.department_id === data.department_id && 
              item.status === 'waiting'
    );
    
    if (!isAlreadyInQueue) {
      await addToQueue({
        patient_id: data.patient_id,
        patient_name: data.patient_name,
        department_id: data.department_id,
        doctor_id: data.doctor_id,
        priority: 'normal',
        appointment_time: data.start_time,
        notes: `Appointment scheduled for ${new Date(data.start_time).toLocaleString()}`
      });
    }
  } catch (queueError) {
    console.warn('Failed to add patient to queue:', queueError);
    // Don't fail the appointment creation if queue addition fails
  }

  // Get the status information for the return value
  const statusCode = await getStatusCodeById(statusId);
  const { data: statusData } = await supabase
    .from('appointment_statuses')
    .select('name')
    .eq('id', statusId)
    .single();

  return {
    ...appointment,
    doctor_name: doctorData?.full_name,
    department_name: departmentData?.name,
    status_code: statusCode,
    status_name: statusData?.name || 'Unknown',
  };
}

export async function fetchAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      departments!inner(name),
      appointment_statuses!inner(code, name)
    `)
    .eq("doctor_id", doctorId)
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data || []).map(item => ({
    ...item,
    department_name: item.departments?.name,
    status_code: item.appointment_statuses?.code,
    status_name: item.appointment_statuses?.name,
  }));
}

export async function fetchAppointmentsByDepartment(departmentId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      profiles!inner(full_name),
      departments!inner(name),
      appointment_statuses!inner(code, name)
    `)
    .eq("department_id", departmentId)
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data || []).map(item => ({
    ...item,
    doctor_name: item.profiles?.full_name,
    department_name: item.departments?.name,
    status_code: item.appointment_statuses?.code,
    status_name: item.appointment_statuses?.name,
  }));
}

export async function fetchAllAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      profiles!inner(full_name),
      departments!inner(name),
      appointment_statuses!inner(code, name)
    `)
    .order("start_time", { ascending: true });

  if (error) throw error;

  return (data || []).map(item => ({
    ...item,
    doctor_name: item.profiles?.full_name,
    department_name: item.departments?.name,
    status_code: item.appointment_statuses?.code,
    status_name: item.appointment_statuses?.name,
  }));
}

export async function updateAppointmentStatus(appointmentId: string, status: Appointment["status_code"]): Promise<void> {
  const statusId = await getStatusIdByCode(status);
  const { error } = await supabase
    .from("appointments")
    .update({ status_id: statusId })
    .eq("id", appointmentId);

  if (error) throw error;

  // If appointment is completed or cancelled, remove from queue
  if (status === 'completed' || status === 'cancelled') {
    try {
      const { fetchAllQueue, removeFromQueue } = await import('./queue');
      
      // Get the appointment to find the patient and department
      const { data: appointment } = await supabase
        .from("appointments")
        .select("patient_id, department_id")
        .eq("id", appointmentId)
        .single();
      
      if (appointment) {
        // Find and remove the patient from the queue
        const queue = await fetchAllQueue();
        const queueItem = queue.find(
          item => item.patient_id === appointment.patient_id && 
                  item.department_id === appointment.department_id && 
                  item.status === 'waiting'
        );
        
        if (queueItem) {
          await removeFromQueue(queueItem.id);
        }
      }
    } catch (queueError) {
      console.warn('Failed to remove patient from queue:', queueError);
      // Don't fail the appointment status update if queue removal fails
    }
  }
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (error) throw error;

  // Also remove from queue if exists
  try {
    const { fetchAllQueue, removeFromQueue } = await import('./queue');
    
    // Get the appointment to find the patient and department
    const { data: appointment } = await supabase
      .from("appointments")
      .select("patient_id, department_id")
      .eq("id", appointmentId)
      .single();
    
    if (appointment) {
      // Find and remove the patient from the queue
      const queue = await fetchAllQueue();
      const queueItem = queue.find(
        item => item.patient_id === appointment.patient_id && 
                item.department_id === appointment.department_id && 
                item.status === 'waiting'
      );
      
      if (queueItem) {
        await removeFromQueue(queueItem.id);
      }
    }
  } catch (queueError) {
    console.warn('Failed to remove patient from queue:', queueError);
    // Don't fail the appointment deletion if queue removal fails
  }
}

// Helper function to sync existing appointments with queue
export async function syncAppointmentsWithQueue(): Promise<void> {
  try {
    // Get all scheduled appointments
    const { data: appointments } = await supabase
      .from("appointments")
      .select("patient_id, patient_name, doctor_id, department_id, start_time, status_id")
      .eq("status_id", await getStatusIdByCode("scheduled"));
    
    if (!appointments) return;
    
    // Get current queue
    const { fetchAllQueue, addToQueue } = await import('./queue');
    const currentQueue = await fetchAllQueue();
    
    // Add appointments that aren't in queue
    for (const appointment of appointments) {
      const isInQueue = currentQueue.some(
        item => item.patient_id === appointment.patient_id && 
                item.department_id === appointment.department_id && 
                item.status === 'waiting'
      );
      
      if (!isInQueue) {
        await addToQueue({
          patient_id: appointment.patient_id,
          patient_name: appointment.patient_name,
          department_id: appointment.department_id,
          doctor_id: appointment.doctor_id,
          priority: 'normal',
          appointment_time: appointment.start_time,
          notes: `Appointment scheduled for ${new Date(appointment.start_time).toLocaleString()}`
        });
      }
    }
  } catch (error) {
    console.error('Failed to sync appointments with queue:', error);
    throw error;
    }
}

export async function checkAppointmentConflicts(doctorId: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
  try {
    console.log('Checking conflicts for:', { doctorId, startTime, endTime, excludeId });
    
    // Convert to Date objects for proper comparison
    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);
    
    // Validate time range
    if (newStart >= newEnd) {
      console.log('Invalid time range: start must be before end');
      return true; // Invalid time range
    }
    
    // Get status IDs for cancelled and completed
    const cancelledStatusId = await getStatusIdByCode("cancelled");
    const completedStatusId = await getStatusIdByCode("completed");
    
    let query = supabase
      .from("appointments")
      .select("id, start_time, end_time, status_id")
      .eq("doctor_id", doctorId)
      .neq("status_id", cancelledStatusId)
      .neq("status_id", completedStatusId);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking conflicts:', error);
      throw error;
    }

    console.log('Existing appointments for doctor:', data);

    // Check for actual time overlaps
    const hasConflict = (data || []).some(appointment => {
      const existingStart = new Date(appointment.start_time);
      const existingEnd = new Date(appointment.end_time);
      
      // Check if there's an overlap
      // New appointment overlaps if:
      // - New start is before existing end AND new end is after existing start
      const overlaps = newStart < existingEnd && newEnd > existingStart;
      
      if (overlaps) {
        console.log('Conflict found with appointment:', {
          existing: { start: existingStart, end: existingEnd },
          new: { start: newStart, end: newEnd }
        });
      }
      
      return overlaps;
    });

    console.log('Conflict check result:', hasConflict);
    return hasConflict;
    
  } catch (error) {
    console.error('Error in checkAppointmentConflicts:', error);
    throw error;
  }
}

