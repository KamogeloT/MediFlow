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
  department_id?: string;
}

export async function createDefaultDepartments(): Promise<void> {
  const { data: existingDepts } = await supabase
    .from("departments")
    .select("id")
    .limit(1);

  if (existingDepts && existingDepts.length > 0) {
    return; // Departments already exist
  }

  const defaultDepartments = [
    { name: "General Medicine", description: "Primary care and general medical services" },
    { name: "Cardiology", description: "Heart and cardiovascular health" },
    { name: "Orthopedics", description: "Bones, joints, and musculoskeletal system" },
    { name: "Pediatrics", description: "Medical care for children and adolescents" },
    { name: "Emergency Medicine", description: "Urgent and emergency medical care" },
    { name: "Surgery", description: "Surgical procedures and operations" },
  ];

  const { error } = await supabase
    .from("departments")
    .insert(defaultDepartments);

  if (error) {
    console.error("Failed to create default departments:", error);
  }
}

export async function fetchDepartments(): Promise<Department[]> {
  // Try to create default departments if none exist
  await createDefaultDepartments();

  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function fetchDoctorsByDepartment(departmentId: string): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      departmentID
    `)
    .eq("role", "doctor")
    .eq("departmentID", departmentId);

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    full_name: item.full_name || "Unknown Doctor",
    email: "", // We'll get email separately if needed
    department_id: item.departmentID,
  }));
}

export async function fetchAllDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      departmentID
    `)
    .eq("role", "doctor");

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    full_name: item.full_name || "Unknown Doctor",
    email: "", // We'll get email separately if needed
    department_id: item.departmentID,
  }));
}

export async function fetchDoctorsWithDepartments(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      departmentID,
      departments!inner(
        id,
        name
      )
    `)
    .eq("role", "doctor");

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    full_name: item.full_name || "Unknown Doctor",
    email: "", // We'll get email separately if needed
    department_id: item.departmentID,
  }));
}
