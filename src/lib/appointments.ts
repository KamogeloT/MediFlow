import { supabase } from "./supabase";

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  department: string | null;
  start_time: string; // ISO string
  end_time: string; // ISO string
  status: string;
  patient_name?: string;
}

// Fetch appointments joined with patient information
export async function fetchAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, doctor_id, department, start_time, end_time, status, patients(full_name)"
    );
  if (error) throw error;
  return (
    data?.map((row: any) => ({
      id: row.id,
      patient_id: row.patient_id,
      doctor_id: row.doctor_id,
      department: row.department,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      patient_name: row.patients?.full_name ?? "",
    })) ?? []
  );
}

export async function createAppointment(
  appointment: Omit<Appointment, "id" | "patient_name">
): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .insert(appointment)
    .select(
      "id, patient_id, doctor_id, department, start_time, end_time, status, patients(full_name)"
    )
    .single();
  if (error) throw error;
  return {
    id: data.id,
    patient_id: data.patient_id,
    doctor_id: data.doctor_id,
    department: data.department,
    start_time: data.start_time,
    end_time: data.end_time,
    status: data.status,
    patient_name: data.patients?.full_name ?? "",
  };
}

export async function updateAppointment(
  id: string,
  updates: Partial<Omit<Appointment, "id" | "patient_name">>
): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select(
      "id, patient_id, doctor_id, department, start_time, end_time, status, patients(full_name)"
    )
    .single();
  if (error) throw error;
  return {
    id: data.id,
    patient_id: data.patient_id,
    doctor_id: data.doctor_id,
    department: data.department,
    start_time: data.start_time,
    end_time: data.end_time,
    status: data.status,
    patient_name: data.patients?.full_name ?? "",
  };
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export function subscribeToAppointments(
  callback: (eventType: string, appointment: Appointment) => void
) {
  const channel = supabase
    .channel("appointments")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "appointments" },
      (payload) => {
        const record: any = payload.new ?? payload.old;
        const appointment: Appointment = {
          id: record.id,
          patient_id: record.patient_id,
          doctor_id: record.doctor_id,
          department: record.department,
          start_time: record.start_time,
          end_time: record.end_time,
          status: record.status,
          patient_name: record.patient_name,
        };
        callback(payload.eventType, appointment);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

