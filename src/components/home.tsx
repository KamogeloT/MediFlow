import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import DashboardHeader from "./DashboardHeader";
import Sidebar from "./Sidebar";
import FrontDeskView from "./dashboard/FrontDeskView";
import DoctorView from "./dashboard/DoctorView";
import AppointmentsPage from "./dashboard/AppointmentsPage";
import QueuePage from "./dashboard/QueuePage";
import DoctorAssignmentsPage from "./dashboard/DoctorAssignmentsPage";
import { useToast } from "@/components/ui/use-toast";
import { subscribeToPatients } from "@/lib/patients";
import { notify } from "@/lib/notifications";

interface HomeProps {
  role: "doctor" | "front-desk";
  userName?: string;
  userAvatar?: string;
}

type ViewType = "registration" | "appointments" | "queue" | "assignments";

const Home = ({
  role,
  userName = "Dr. John Doe",
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=doctor",
}: HomeProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ViewType>("registration");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  const handleRoleSwitch = (newRole: "doctor" | "front-desk") => {
    navigate(newRole === "doctor" ? "/doctor" : "/front-desk");
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const unsub = subscribeToPatients((eventType, patient) => {
      if (eventType === "INSERT") {
        toast({
          title: "New patient added",
          description: patient.full_name,
        });
        notify("New patient added", { body: patient.full_name });
      }
    });
    return () => unsub();
  }, [toast]);

  const renderContent = () => {
    if (role === "front-desk") {
      switch (currentView) {
        case "registration":
          return (
            <FrontDeskView
              onPatientRegistration={(data) =>
                console.log("Patient registration:", data)
              }
              onQueueUpdate={(data) => console.log("Queue updated:", data)}
            />
          );
        case "appointments":
          return <AppointmentsPage />;
        case "queue":
          return <QueuePage />;
        case "assignments":
          return <DoctorAssignmentsPage />;
        default:
          return (
            <FrontDeskView
              onPatientRegistration={(data) =>
                console.log("Patient registration:", data)
              }
              onQueueUpdate={(data) => console.log("Queue updated:", data)}
            />
          );
      }
    } else {
      return <DoctorView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      {role === "front-desk" && (
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <DashboardHeader
          userName={userName}
          userRole={role}
          userAvatar={userAvatar}
          onRoleSwitch={handleRoleSwitch}
          onLogout={handleLogout}
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 h-[calc(100vh-64px)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Home;
