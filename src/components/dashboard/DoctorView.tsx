import React, { useState } from "react";
import ConsultationPanel from "./ConsultationPanel";
import PatientHistory from "./PatientHistory";
import PatientQueue from "./PatientQueue";
import UpcomingAppointments from "./UpcomingAppointments";

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
    <div className="flex flex-col md:flex-row h-full w-full">
      <div className="w-full md:w-[350px] border-b md:border-b-0 md:border-r bg-gray-50 p-4 overflow-y-auto space-y-4 order-2 md:order-1">
        <UpcomingAppointments />
        <div id="queue">
          <PatientQueue onCheckIn={handleCheckIn} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto order-1 md:order-2">
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
      <div className="w-full md:w-[350px] border-t md:border-t-0 md:border-l bg-gray-50 p-4 overflow-y-auto order-3">
        {currentPatient && <PatientHistory patientName={currentPatient.name} />}
      </div>
    </div>
  );
};

export default DoctorView;

