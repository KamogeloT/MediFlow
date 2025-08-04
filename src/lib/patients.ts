import { supabase } from "./supabase";

export interface Patient {
  id: string;
  full_name: string;
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
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

