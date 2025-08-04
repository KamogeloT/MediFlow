import { z } from "zod";
import { supabase } from "./supabase";

export const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Gender is required",
  }),
  address: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  bloodType: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export type Patient = z.infer<typeof patientSchema>;

export async function createPatient(data: Patient) {
  const patient = patientSchema.parse(data);
  const { error } = await supabase.from("patients").insert(patient);
  if (error) {
    throw new Error(error.message);
  }
}

