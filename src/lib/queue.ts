import { supabase } from "./supabase";

export interface QueueItem {
  id: string;
  patient_id?: string; // Made optional for walk-in patients
  patient_name: string;
  status: "waiting" | "in-consultation" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  added_at: string;
  checked_in_at?: string;
  completed_at?: string;
  notes?: string;
  doctor_id?: string;
  doctor_name?: string;
  department_id?: string;
  department_name?: string;
  appointment_time?: string;
  estimated_wait_time?: number; // in minutes
  is_walk_in?: boolean; // Flag to identify walk-in patients
}

export interface AddToQueueData {
  patient_id?: string; // Optional for walk-in patients
  patient_name: string;
  priority: "low" | "normal" | "high" | "urgent";
  notes?: string;
  doctor_id?: string;
  department_id?: string;
  appointment_time?: string;
  is_walk_in?: boolean; // Flag to identify walk-in patients
}

// Helper function to ensure authentication
async function ensureAuthenticated() {
  try {
    // First try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      throw new Error("Authentication required. Please log in again.");
    }
    
    if (!session) {
      // Try to refresh the session
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

export async function addToQueue(data: AddToQueueData): Promise<QueueItem> {
  try {
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    // Get doctor and department names if provided
    let doctorName: string | undefined;
    let departmentName: string | undefined;

    if (data.doctor_id) {
      const { data: doctorData, error: doctorError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.doctor_id)
        .single();
      
      if (doctorError) {
        console.warn("Failed to fetch doctor name:", doctorError);
      } else {
        doctorName = doctorData?.full_name;
      }
    }

    if (data.department_id) {
      const { data: deptData, error: deptError } = await supabase
        .from("departments")
        .select("name")
        .eq("id", data.department_id)
        .single();
      
      if (deptError) {
        console.warn("Failed to fetch department name:", deptError);
      } else {
        departmentName = deptData?.name;
      }
    }

    const queueData = {
      patient_id: data.patient_id || null, // null for walk-in patients
      patient_name: data.patient_name,
      priority: data.priority,
      notes: data.notes,
      doctor_id: data.doctor_id,
      department_id: data.department_id,
      appointment_time: data.appointment_time,
      status: "waiting" as const,
      added_at: new Date().toISOString(),
      is_walk_in: data.is_walk_in || !data.patient_id, // true if no patient_id or explicitly marked
      is_appointment_based: !!data.appointment_time, // Set based on whether appointment_time exists
      estimated_wait_time: 0 // Default value
    };

    const { data: queueItem, error } = await supabase
      .from("queue")
      .insert([queueData])
      .select()
      .single();

    if (error) {
      console.error("Queue insertion error:", error);
      throw error;
    }

    // The workflow state and audit logs are automatically created by database triggers
    console.log("Queue item created with automatic workflow logging:", queueItem.id);

    return {
      ...queueItem,
      doctor_name: doctorName,
      department_name: departmentName,
    };
  } catch (error) {
    console.error("addToQueue error:", error);
    throw error;
  }
}

export async function fetchQueueByDepartment(departmentId: string): Promise<QueueItem[]> {
  try {
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from("queue")
      .select(`
        *,
        profiles!inner(full_name),
        departments!inner(name)
      `)
      .eq("department_id", departmentId)
      .order("priority", { ascending: false })
      .order("added_at", { ascending: true });

    if (error) {
      console.error("fetchQueueByDepartment error:", error);
      throw error;
    }

    return (data || []).map(item => ({
      ...item,
      doctor_name: item.profiles?.full_name,
      department_name: item.departments?.name,
    }));
  } catch (error) {
    console.error("fetchQueueByDepartment error:", error);
    throw error;
  }
}

export async function fetchQueueByDoctor(doctorId: string): Promise<QueueItem[]> {
  try {
    const user = await ensureAuthenticated();
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    console.log('fetchQueueByDoctor called for doctor:', doctorId);

    // Use the new database function that properly separates appointments from queue items
    const { data, error } = await supabase.rpc('get_current_queue_by_doctor', {
      p_doctor_id: doctorId
    });

    if (error) {
      console.error("fetchQueueByDoctor RPC error:", error);
      
      // Fallback to manual query if RPC function doesn't exist yet
      console.log('Falling back to manual query...');
      return await fetchQueueByDoctorFallback(doctorId);
    }

    console.log('Queue fetched successfully via RPC:', data?.length, 'items');
    return data || [];
  } catch (error) {
    console.error("fetchQueueByDoctor error:", error);
    // Fallback to manual query
    return await fetchQueueByDoctorFallback(doctorId);
  }
}

// Fallback method for fetching queue by doctor
async function fetchQueueByDoctorFallback(doctorId: string): Promise<QueueItem[]> {
  try {
    console.log('Using fallback method to fetch queue by doctor');
    
    // Get all departments the doctor is assigned to
    const { data: deptAssignments, error: deptError } = await supabase
      .from("doctor_departments")
      .select("department_id")
      .eq("doctor_id", doctorId);

    if (deptError || !deptAssignments || deptAssignments.length === 0) {
      console.log('No department assignments found, checking profiles.department_id...');
      
      // Fallback to profiles.department_id
      const { data: doctorProfile, error: profileError } = await supabase
        .from("profiles")
        .select("department_id")
        .eq("id", doctorId)
        .single();
        
      if (profileError || !doctorProfile?.department_id) {
        console.error("Failed to fetch doctor's department:", profileError);
        throw new Error("Doctor's department not found");
      }

      // Fetch queue for the single department
      const { data: queueData, error: queueError } = await supabase
        .from("queue")
        .select(`
          *,
          departments!inner(name)
        `)
        .eq("department_id", doctorProfile.department_id)
        .neq("status", "completed")
        .order("priority", { ascending: false })
        .order("added_at", { ascending: true });

      if (queueError) {
        console.error("Manual queue fetch error:", queueError);
        throw queueError;
      }

      return (queueData || []).map(item => ({
        ...item,
        department_name: item.departments?.name,
      }));
    }

    // Get department IDs
    const departmentIds = deptAssignments.map(d => d.department_id);
    console.log('Doctor assigned to departments:', departmentIds);

    // Fetch queue for all assigned departments
    const { data: queueData, error: queueError } = await supabase
      .from("queue")
              .select(`
          *,
          departments!inner(name)
        `)
      .in("department_id", departmentIds)
      .neq("status", "completed")
      .order("priority", { ascending: false })
      .order("added_at", { ascending: true });

    if (queueError) {
      console.error("Manual queue fetch error:", queueError);
      throw queueError;
    }

    return (queueData || []).map(item => ({
      ...item,
      department_name: item.departments?.name,
    }));
  } catch (error) {
    console.error("fetchQueueByDoctorFallback error:", error);
    throw error;
  }
}

export async function fetchAllQueue(): Promise<QueueItem[]> {
  try {
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { data, error } = await supabase
      .from("queue")
      .select(`
        *,
        profiles!inner(full_name),
        departments!inner(name)
      `)
      .order("priority", { ascending: false })
      .order("added_at", { ascending: true });

    if (error) {
      console.error("fetchAllQueue error:", error);
      throw error;
    }

    return (data || []).map(item => ({
      ...item,
      doctor_name: item.profiles?.full_name,
      department_name: item.departments?.name,
    }));
  } catch (error) {
    console.error("fetchAllQueue error:", error);
    throw error;
  }
}

export async function updateQueueStatus(queueId: string, status: QueueItem["status"], doctorId?: string): Promise<void> {
  try {
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

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
  } catch (error) {
    console.error("updateQueueStatus error:", error);
    throw error;
  }
}

export async function removeFromQueue(queueId: string): Promise<void> {
  try {
    // Ensure user is authenticated
    const user = await ensureAuthenticated();
    
    if (!user) {
      throw new Error("Authentication required. Please log in again.");
    }

    const { error } = await supabase
      .from("queue")
      .delete()
      .eq("id", queueId);

    if (error) throw error;
  } catch (error) {
    console.error("removeFromQueue error:", error);
    throw error;
  }
}

export async function calculateEstimatedWaitTime(departmentId: string, priority: QueueItem["priority"]): Promise<number> {
  // Get current queue for department
  const queue = await fetchQueueByDepartment(departmentId);
  const waitingPatients = queue.filter(item => item.status === "waiting");
  
  // Base wait times (in minutes) for each priority
  const baseWaitTimes = {
    urgent: 0,
    high: 15,
    normal: 30,
    low: 45,
  };

  // Calculate position-based wait time
  const position = waitingPatients.findIndex(item => item.priority === priority);
  const averageConsultationTime = 20; // minutes
  
  return baseWaitTimes[priority] + (position * averageConsultationTime);
}

export async function getQueueStats(departmentId?: string): Promise<{
  total: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  averageWaitTime: number;
}> {
  let query = supabase.from("queue").select("*");
  
  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const queue = data || [];
  const now = new Date();

  const stats = {
    total: queue.length,
    waiting: queue.filter(item => item.status === "waiting").length,
    inConsultation: queue.filter(item => item.status === "in-consultation").length,
    completed: queue.filter(item => item.status === "completed").length,
    averageWaitTime: 0,
  };

  // Calculate average wait time for completed items
  const completedItems = queue.filter(item => item.status === "completed" && item.checked_in_at);
  if (completedItems.length > 0) {
    const totalWaitTime = completedItems.reduce((total, item) => {
      const added = new Date(item.added_at);
      const checkedIn = new Date(item.checked_in_at!);
      return total + (checkedIn.getTime() - added.getTime());
    }, 0);
    
    stats.averageWaitTime = Math.round(totalWaitTime / completedItems.length / 60000); // Convert to minutes
  }

  return stats;
}

// Enhanced function to get queue stats for a specific doctor (department-based)
export async function getQueueStatsForDoctor(doctorId: string): Promise<{
  total: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  averageWaitTime: number;
}> {
  try {
    console.log('Getting queue stats for doctor:', doctorId);

    // Use the new enhanced database function
    const { data, error } = await supabase.rpc('get_queue_stats_by_doctor_departments', {
      p_doctor_id: doctorId
    });

    if (!error && data && data.length > 0) {
      // Aggregate stats across all departments
      const totalStats = data.reduce((acc, dept) => ({
        total: acc.total + Number(dept.total_patients || 0),
        waiting: acc.waiting + Number(dept.waiting_patients || 0),
        inConsultation: acc.inConsultation + Number(dept.in_consultation_patients || 0),
        completed: acc.completed + Number(dept.completed_patients || 0),
        averageWaitTime: acc.averageWaitTime + Number(dept.average_wait_time || 0),
      }), {
        total: 0,
        waiting: 0,
        inConsultation: 0,
        completed: 0,
        averageWaitTime: 0,
      });

      // Calculate average wait time
      if (data.length > 0) {
        totalStats.averageWaitTime = totalStats.averageWaitTime / data.length;
      }

      console.log('Queue stats fetched successfully:', totalStats);
      return totalStats;
    }

    console.log('Database function failed, using fallback method');
    // Fallback to old method
    return await getQueueStatsForDoctorFallback(doctorId);
  } catch (error) {
    console.error("getQueueStatsForDoctor error:", error);
    // Fallback to old method
    return await getQueueStatsForDoctorFallback(doctorId);
  }
}

// Fallback method for getting queue stats for doctor
async function getQueueStatsForDoctorFallback(doctorId: string): Promise<{
  total: number;
  waiting: number;
  inConsultation: number;
  completed: number;
  averageWaitTime: number;
}> {
  try {
    console.log('Using fallback method for queue stats');
    
    // First, get the doctor's assigned department
    const { data: doctorProfile, error: profileError } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("id", doctorId)
      .single();

    if (profileError || !doctorProfile?.department_id) {
      console.error("Failed to fetch doctor's department:", profileError);
      throw new Error("Doctor's department not found");
    }

    // Then get stats for that department
    return await getQueueStats(doctorProfile.department_id);
  } catch (error) {
    console.error("getQueueStatsForDoctorFallback error:", error);
    throw error;
  }
}

export function subscribeToQueue(callback: (eventType: string, queueItem: QueueItem) => void) {
  const channel = supabase
    .channel("queue")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "queue" },
      (payload) => {
        const record: any = payload.new ?? payload.old;
        callback(payload.eventType, record);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Helper function to update estimated wait time (used by database trigger)
export async function updateEstimatedWaitTime(queueId: string): Promise<void> {
  try {
    const { data: queueItem } = await supabase
      .from("queue")
      .select("department_id, priority")
      .eq("id", queueId)
      .single();

    if (queueItem && queueItem.department_id && queueItem.priority) {
      const estimatedWaitTime = await calculateEstimatedWaitTime(
        queueItem.department_id,
        queueItem.priority
      );

      await supabase
        .from("queue")
        .update({ estimated_wait_time: estimatedWaitTime })
        .eq("id", queueId);
    }
  } catch (error) {
    console.error("Failed to update estimated wait time", error);
  }
}

// Get upcoming appointments (not yet in queue) for a doctor
export async function getUpcomingAppointments(doctorId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_upcoming_appointments_by_doctor', {
      p_doctor_id: doctorId
    });

    if (error) {
      console.error("Failed to fetch upcoming appointments:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("getUpcomingAppointments error:", error);
    throw error;
  }
}

// Get past appointments for a doctor
export async function getPastAppointments(doctorId: string, daysBack: number = 30): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_past_appointments_by_doctor', {
      p_doctor_id: doctorId,
      p_days_back: daysBack
    });

    if (error) {
      console.error("Failed to fetch past appointments:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("getPastAppointments error:", error);
    throw error;
  }
}

// Add walk-in patient to queue
export async function addWalkInToQueue(
  patientId: string, 
  departmentId: string, 
  priority: string = 'medium', 
  notes?: string
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('add_walk_in_to_queue', {
      p_patient_id: patientId,
      p_department_id: departmentId,
      p_priority: priority,
      p_notes: notes || null
    });

    if (error) {
      console.error("Failed to add walk-in to queue:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("addWalkInToQueue error:", error);
    throw error;
  }
}

// Run daily queue maintenance (can be called manually or scheduled)
export async function runDailyQueueMaintenance(): Promise<void> {
  try {
    const { error } = await supabase.rpc('daily_queue_maintenance');
    
    if (error) {
      console.error("Failed to run daily queue maintenance:", error);
      throw error;
    }

    console.log("Daily queue maintenance completed successfully");
  } catch (error) {
    console.error("runDailyQueueMaintenance error:", error);
    throw error;
  }
}
