import React from "react";
import PatientRegistration from "./PatientRegistration";
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
    <div className="flex h-full bg-gray-50">
      {/* Main Content Area - Patient Registration */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Registration</h2>
            <p className="text-gray-600">Register new patients and add them to the queue</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full">
            <PatientRegistration onSubmit={onPatientRegistration} />
          </div>
        </div>
      </div>

      {/* Sidebar - Patient Queue */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex-1 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Patient Queue</h3>
            <p className="text-sm text-gray-600">Monitor waiting patients</p>
          </div>
          <PatientQueue onCheckIn={onQueueUpdate} />
        </div>
      </div>
    </div>
  );
};

export default FrontDeskView;

