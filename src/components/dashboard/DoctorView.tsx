import React from "react";
import ConsultationPanel from "./ConsultationPanel";
import PatientHistory from "./PatientHistory";

interface Patient {
  name: string;
  age: number;
  gender: string;
  visitReason: string;
}

interface DoctorViewProps {
  currentPatient: Patient;
}

const DoctorView = ({ currentPatient }: DoctorViewProps) => {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 overflow-y-auto">
        <ConsultationPanel
          patientName={currentPatient.name}
          patientAge={currentPatient.age}
          patientGender={currentPatient.gender}
          currentVisitReason={currentPatient.visitReason}
        />
      </div>
      <div className="w-[350px] border-l bg-gray-50 p-4 overflow-y-auto">
        <PatientHistory patientName={currentPatient.name} />
      </div>
    </div>
  );
};

export default DoctorView;

