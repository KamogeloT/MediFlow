import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ensureStaff(req: express.Request, res: express.Response) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user || user.user_metadata?.role !== "staff") {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return user;
}

router.get("/:patientId", async (req, res) => {
  const user = await ensureStaff(req, res);
  if (!user) return;

  const { patientId } = req.params;
  const { from, to, doctor, department } = req.query;

  let query = supabase
    .from("encounters")
    .select(
      "id, encounter_date, doctor, department, notes, diagnoses(id, description), prescriptions(id, medication, dosage, instructions)"
    )
    .eq("patient_id", patientId)
    .order("encounter_date", { ascending: false });

  if (from) query = query.gte("encounter_date", from);
  if (to) query = query.lte("encounter_date", to);
  if (doctor) query = query.eq("doctor", doctor);
  if (department) query = query.eq("department", department);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

router.post("/", async (req, res) => {
  const user = await ensureStaff(req, res);
  if (!user) return;

  const { encounter, diagnoses, prescriptions } = req.body;
  const { data, error } = await supabase
    .from("encounters")
    .insert(encounter)
    .select("id")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const encounterId = data.id;
  if (diagnoses && diagnoses.length) {
    await supabase
      .from("diagnoses")
      .insert(diagnoses.map((d: any) => ({ ...d, encounter_id: encounterId })));
  }
  if (prescriptions && prescriptions.length) {
    await supabase
      .from("prescriptions")
      .insert(
        prescriptions.map((p: any) => ({ ...p, encounter_id: encounterId })),
      );
  }

  res.status(201).json({ id: encounterId });
});

export default router;
