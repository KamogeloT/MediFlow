import { supabase } from "./supabase";

export interface Patient {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export async function createPatient(
  patient: Omit<Patient, "id">
): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .insert(patient)
    .select("id, full_name")
    .single();
  if (error) throw error;
  return data as Patient;
}

export async function fetchAllPatients(): Promise<Patient[]> {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("fetchAllPatients error:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("fetchAllPatients error:", error);
    throw error;
  }
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }

    return data;
  } catch (error) {
    console.error("getPatientById error:", error);
    throw error;
  }
}

export async function updatePatient(
  patientId: string, 
  updates: Partial<Omit<Patient, "id">>
): Promise<Patient> {
  try {
    const { data, error } = await supabase
      .from("patients")
      .update(updates)
      .eq("id", patientId)
      .select("*")
      .single();

    if (error) {
      console.error("updatePatient error:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("updatePatient error:", error);
    throw error;
  }
}

export async function deletePatient(patientId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", patientId);

    if (error) {
      console.error("deletePatient error:", error);
      throw error;
    }
  } catch (error) {
    console.error("deletePatient error:", error);
    throw error;
  }
}

export function subscribeToPatients(
  callback: (eventType: string, patient: Patient) => void,
) {
  const channel = supabase
    .channel("patients")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "patients" },
      (payload) => {
        const record = (payload.new ?? payload.old) as any;
        callback(payload.eventType, {
          id: record.id,
          full_name: record.full_name,
          email: record.email,
          phone: record.phone,
          date_of_birth: record.date_of_birth,
          gender: record.gender,
          address: record.address,
          created_at: record.created_at,
          updated_at: record.updated_at,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

