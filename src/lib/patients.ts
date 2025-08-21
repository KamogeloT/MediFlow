import { supabase } from "./supabase";

export interface Patient {
  id: string;
  full_name: string;
  sa_id_number?: string; // South African ID Number (13 digits)
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
    .select("id, full_name, sa_id_number")
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

export async function searchPatients(query: string): Promise<Patient[]> {
  try {
    // Clean the query to prevent SQL injection
    const cleanQuery = query.trim();
    
    if (cleanQuery.length < 2) {
      return [];
    }
    
    // First, try to find exact ID number match (highest priority)
    if (cleanQuery.length === 13 && /^\d{13}$/.test(cleanQuery)) {
      const { data: idMatch, error: idError } = await supabase
        .from("patients")
        .select("id, full_name, sa_id_number, email, phone, date_of_birth")
        .eq('sa_id_number', cleanQuery)
        .limit(1);
      
      if (!idError && idMatch && idMatch.length > 0) {
        return idMatch;
      }
    }
    
    // Then search by name and partial ID number
    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, sa_id_number, email, phone, date_of_birth")
      .or(`full_name.ilike.%${cleanQuery}%,sa_id_number.ilike.%${cleanQuery}%`)
      .limit(10);

    if (error) {
      console.error("Supabase search error:", error);
      throw error;
    }
    
    // Sort results: exact ID matches first, then name matches
    const results = data || [];
    return results.sort((a, b) => {
      // Exact ID match gets highest priority
      if (a.sa_id_number === cleanQuery) return -1;
      if (b.sa_id_number === cleanQuery) return 1;
      
      // Partial ID matches get second priority
      if (a.sa_id_number?.includes(cleanQuery) && !b.sa_id_number?.includes(cleanQuery)) return -1;
      if (b.sa_id_number?.includes(cleanQuery) && !a.sa_id_number?.includes(cleanQuery)) return 1;
      
      // Name matches get third priority
      if (a.full_name.toLowerCase().includes(cleanQuery.toLowerCase()) && !b.full_name.toLowerCase().includes(cleanQuery.toLowerCase())) return -1;
      if (b.full_name.toLowerCase().includes(cleanQuery.toLowerCase()) && !a.full_name.toLowerCase().includes(cleanQuery.toLowerCase())) return 1;
      
      return 0;
    });
  } catch (error) {
    console.error("Patient search failed:", error);
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
          sa_id_number: record.sa_id_number,
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

