import { supabase } from "./supabase";

export interface QueueEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  status: "waiting" | "in-consultation" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  added_at: string;
  checked_in_at?: string;
  completed_at?: string;
  notes?: string;
  doctor_id?: string;
  department?: string;
}

export interface AddToQueueData {
  patient_id: string;
  priority?: "low" | "normal" | "high" | "urgent";
  notes?: string;
  department?: string;
}

// Add patient to queue
export async function addToQueue(data: AddToQueueData): Promise<QueueEntry> {
  const { data: queueEntry, error } = await supabase
    .from("queue")
    .insert({
      patient_id: data.patient_id,
      priority: data.priority || "normal",
      notes: data.notes,
      department: data.department,
    })
    .select(`
      id, patient_id, status, priority, added_at, checked_in_at, completed_at, notes, doctor_id, department,
      patients(full_name)
    `)
    .single();

  if (error) throw error;

  return {
    id: queueEntry.id,
    patient_id: queueEntry.patient_id,
    patient_name: queueEntry.patients?.full_name || "",
    status: queueEntry.status,
    priority: queueEntry.priority,
    added_at: queueEntry.added_at,
    checked_in_at: queueEntry.checked_in_at,
    completed_at: queueEntry.completed_at,
    notes: queueEntry.notes,
    doctor_id: queueEntry.doctor_id,
    department: queueEntry.department,
  };
}

// Fetch all queue entries
export async function fetchQueue(): Promise<QueueEntry[]> {
  const { data, error } = await supabase
    .from("queue")
    .select(`
      id, patient_id, status, priority, added_at, checked_in_at, completed_at, notes, doctor_id, department,
      patients(full_name)
    `)
    .order("added_at", { ascending: true });

  if (error) throw error;

  return (
    data?.map((entry) => ({
      id: entry.id,
      patient_id: entry.patient_id,
      patient_name: entry.patients?.full_name || "",
      status: entry.status,
      priority: entry.priority,
      added_at: entry.added_at,
      checked_in_at: entry.checked_in_at,
      completed_at: entry.completed_at,
      notes: entry.notes,
      doctor_id: entry.doctor_id,
      department: entry.department,
    })) || []
  );
}

// Update queue entry status
export async function updateQueueStatus(
  id: string,
  status: "waiting" | "in-consultation" | "completed",
  doctor_id?: string
): Promise<QueueEntry> {
  const updateData: any = { status };
  
  if (status === "in-consultation") {
    updateData.checked_in_at = new Date().toISOString();
  } else if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }

  if (doctor_id) {
    updateData.doctor_id = doctor_id;
  }

  const { data, error } = await supabase
    .from("queue")
    .update(updateData)
    .eq("id", id)
    .select(`
      id, patient_id, status, priority, added_at, checked_in_at, completed_at, notes, doctor_id, department,
      patients(full_name)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    patient_id: data.patient_id,
    patient_name: data.patients?.full_name || "",
    status: data.status,
    priority: data.priority,
    added_at: data.added_at,
    checked_in_at: data.checked_in_at,
    completed_at: data.completed_at,
    notes: data.notes,
    doctor_id: data.doctor_id,
    department: data.department,
  };
}

// Remove from queue
export async function removeFromQueue(id: string): Promise<void> {
  const { error } = await supabase.from("queue").delete().eq("id", id);
  if (error) throw error;
}

// Subscribe to queue changes
export function subscribeToQueue(
  callback: (eventType: string, entry: QueueEntry) => void
) {
  const channel = supabase
    .channel("queue")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "queue" },
      (payload) => {
        const record: any = payload.new ?? payload.old;
        const entry: QueueEntry = {
          id: record.id,
          patient_id: record.patient_id,
          patient_name: record.patient_name || "",
          status: record.status,
          priority: record.priority,
          added_at: record.added_at,
          checked_in_at: record.checked_in_at,
          completed_at: record.completed_at,
          notes: record.notes,
          doctor_id: record.doctor_id,
          department: record.department,
        };
        callback(payload.eventType, entry);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
