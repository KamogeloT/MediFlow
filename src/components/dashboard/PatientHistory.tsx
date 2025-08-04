import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarDays, FileText, Stethoscope } from "lucide-react";

interface Diagnosis {
  id: string;
  description: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage?: string | null;
  instructions?: string | null;
}

interface Encounter {
  id: string;
  encounter_date: string;
  doctor: string;
  department: string;
  notes: string | null;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
}

interface PatientHistoryProps {
  patientId: string;
  patientName?: string;
}

const PatientHistory: React.FC<PatientHistoryProps> = ({
  patientId,
  patientName,
}) => {
  const [history, setHistory] = useState<Encounter[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [doctor, setDoctor] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    if (!patientId) return;
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (doctor) params.append("doctor", doctor);
    if (department) params.append("department", department);
    fetch(`/api/patient-history/${patientId}?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Encounter[]) => setHistory(data))
      .catch((err) => console.error("Failed to load history", err));
  }, [patientId, from, to, doctor, department]);

  return (
    <Card className="h-full w-full bg-white p-6">
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Patient History
          </h2>
          {patientName && <p className="text-gray-500">{patientName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
          />
          <Input
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            placeholder="Doctor"
          />
          <Input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department"
          />
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {history.map((enc) => (
              <div key={enc.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {enc.encounter_date}
                    </span>
                  </div>
                  <Badge variant="secondary">{enc.department}</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Stethoscope className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {enc.doctor}
                      </p>
                      {enc.diagnoses.map((d) => (
                        <p key={d.id} className="text-sm text-gray-600">
                          {d.description}
                        </p>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Prescriptions
                      </p>
                      {enc.prescriptions.map((p) => (
                        <p key={p.id} className="text-sm text-gray-600">
                          {p.medication}
                          {p.dosage ? ` - ${p.dosage}` : ""}
                          {p.instructions ? ` (${p.instructions})` : ""}
                        </p>
                      ))}
                      {enc.notes && (
                        <p className="text-sm text-gray-500 mt-2">{enc.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-sm text-gray-500">No encounters found</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};

export default PatientHistory;
