import React from "react";
import PatientRegistration from "./PatientRegistration";
import AppointmentCalendar from "./AppointmentCalendar";
import PatientQueue from "./PatientQueue";
import { Patient } from "@/lib/patient";

interface FrontDeskViewProps {
  view: "appointments" | "register" | "queue";
  onPatientRegistration?: (data: Patient) => void;
}

const FrontDeskView = ({
  view,
  onPatientRegistration = () => {},
}: FrontDeskViewProps) => {
  if (view === "register") {
    return <PatientRegistration onSubmit={onPatientRegistration} />;
  }
  if (view === "queue") {
    return <PatientQueue />;
  }
  return <AppointmentCalendar />;
};

export default FrontDeskView;

