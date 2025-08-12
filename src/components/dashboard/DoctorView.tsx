import React, { useState, useRef, useCallback } from "react";
import BPMConsultationPanel from "./BPMConsultationPanel";
import PatientQueue from "./PatientQueue";
import UpcomingAppointments from "./UpcomingAppointments";
import { QueueItem } from "@/lib/queue";

const DoctorView = () => {
  const [currentPatient, setCurrentPatient] = useState<QueueItem | null>(null);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(450); // Start with 450px
  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handleCheckIn = (patient: QueueItem) => {
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

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      // Set minimum and maximum bounds
      if (newWidth >= 300 && newWidth <= 800) {
        setLeftSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResizing);
      return () => {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing, resize, stopResizing]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Sidebar - Patient Queue */}
      <div 
        className="bg-gray-50 border-r border-gray-200 flex flex-col"
        style={{ width: `${leftSidebarWidth}px` }}
      >
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Patient Queue</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PatientQueue onCheckIn={handleCheckIn} />
        </div>
      </div>

      {/* Resizer Handle */}
      <div
        ref={resizerRef}
        className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors duration-200"
        onMouseDown={startResizing}
        style={{ cursor: isResizing ? 'col-resize' : 'col-resize' }}
      >
        <div className="w-1 h-full bg-transparent hover:bg-blue-500" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section - Upcoming Appointments */}
        <div className="h-64 bg-white border-b border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
          <UpcomingAppointments />
        </div>

        {/* Bottom Section - BPM Consultation or Patient History */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          {currentPatient ? (
            <div className="h-full flex flex-col">
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-gray-900">
                      BPM Consultation: {currentPatient.patient_name}
                    </h1>
                  </div>
                  <button 
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    onClick={() => setCurrentPatient(null)}
                  >
                    ← Back to Queue
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <BPMConsultationPanel
                  queueItemId={currentPatient.id}
                  patientId={currentPatient.patient_id}
                  patientName={currentPatient.patient_name}
                  departmentId={currentPatient.department_id}
                  departmentName={currentPatient.department_name || "Unknown Department"}
                  onConsultationUpdate={() => setCurrentPatient(null)}
                />
              </div>
            </div>
          ) : (
            <div className="h-full p-4 overflow-y-auto">
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Consultation Active</h3>
                  <p className="text-gray-500">Select a patient from the queue to start a consultation</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorView;

