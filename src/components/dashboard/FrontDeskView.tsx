import React from "react";
import PatientRegistration from "./PatientRegistration";
import AppointmentCalendar from "./AppointmentCalendar";
import PatientQueue from "./PatientQueue";

interface FrontDeskViewProps {
  onPatientRegistration?: (data: any) => void;
  onQueueUpdate?: (data: any) => void;
}

const FrontDeskView = ({
  onPatientRegistration = () => {},
  onQueueUpdate = () => {},
}: FrontDeskViewProps) => {
  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      <div className="flex-1 overflow-y-auto p-4 order-2 md:order-1">
        <div id="register">
          <PatientRegistration onSubmit={onPatientRegistration} />
        </div>
      </div>
      <div className="w-full md:w-[350px] border-t md:border-t-0 md:border-l bg-gray-50 p-4 flex flex-col gap-4 overflow-y-auto order-1 md:order-2">
        <div id="appointments">
          <AppointmentCalendar />
        </div>
        <div id="queue">
          <PatientQueue />
        </div>
      </div>
    </div>
  );
};

export default FrontDeskView;

