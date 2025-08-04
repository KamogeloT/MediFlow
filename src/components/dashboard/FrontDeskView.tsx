import React from "react";
import PatientRegistration from "./PatientRegistration";
import AppointmentCalendar from "./AppointmentCalendar";
import PatientQueue from "./PatientQueue";

interface FrontDeskViewProps {
  onPatientRegistration?: (data: any) => void;
  onAppointmentSchedule?: (data: any) => void;
  onQueueUpdate?: (data: any) => void;
}

const FrontDeskView = ({
  onPatientRegistration = () => {},
  onAppointmentSchedule = () => {},
  onQueueUpdate = () => {},
}: FrontDeskViewProps) => {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 overflow-y-auto">
        <PatientRegistration onSubmit={onPatientRegistration} />
      </div>
      <div className="w-[350px] border-l bg-gray-50 p-4 flex flex-col gap-4 overflow-y-auto">
        <AppointmentCalendar onAddAppointment={onAppointmentSchedule} />
        <PatientQueue />
      </div>
    </div>
  );
};

export default FrontDeskView;

