import React, { useState } from "react";
import ConsultationPanel from "./ConsultationPanel";
import PatientHistory from "./PatientHistory";
import PatientQueue from "./PatientQueue";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  visitReason: string;
  status: "waiting" | "in-consultation" | "completed";
}

const DoctorView = () => {
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);

  const handleCheckIn = (patient: Patient) => {
    setCurrentPatient(patient);
  };

  const handleComplete = async (id: string) => {
    await fetch(`/api/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    }).catch((err) => console.error("Failed to complete consultation", err));
    setCurrentPatient(null);
  };

  return (
    <div className="flex h-full w-full">
      <div className="w-[350px] border-r bg-gray-50 p-4 overflow-y-auto">
        <PatientQueue onCheckIn={handleCheckIn} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {currentPatient && (
          <ConsultationPanel
            patientId={currentPatient.id}
            patientName={currentPatient.name}
            patientAge={currentPatient.age}
            patientGender={currentPatient.gender}
            currentVisitReason={currentPatient.visitReason}
            onComplete={() => handleComplete(currentPatient.id)}
          />
        )}
      </div>
      <div className="w-[350px] border-l bg-gray-50 p-4 overflow-y-auto">
        {currentPatient && <PatientHistory patientName={currentPatient.name} />}
      </div>
    </div>
  );
};

export default DoctorView;

