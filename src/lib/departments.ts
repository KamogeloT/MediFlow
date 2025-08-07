import { supabase } from "./supabase";

export interface Department {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  full_name: string;
  email: string;
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function fetchDoctorsByDepartment(departmentId: string): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from("doctor_departments")
    .select(`
      doctor_id,
      profiles!inner(
        id,
        full_name
      )
    `)
    .eq("department_id", departmentId);

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.doctor_id,
    full_name: item.profiles?.full_name || "Unknown Doctor",
    email: "" // We'll get email separately if needed
  }));
}

export async function fetchAllDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name
    `)
    .eq("role", "doctor");

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    full_name: item.full_name || "Unknown Doctor",
    email: "" // We'll get email separately if needed
  }));
}
