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
import PatientsPage from "./dashboard/PatientsPage";
import { useToast } from "@/components/ui/use-toast";
import { subscribeToPatients } from "@/lib/patients";
import { notify } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

interface HomeProps {
  role: "doctor" | "front-desk";
  userName?: string;
  userAvatar?: string;
}

type ViewType = "registration" | "appointments" | "queue" | "assignments" | "patients";

const Home = ({
  role,
  userName = "Dr. John Doe",
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=doctor",
}: HomeProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ViewType>("registration");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDepartment, setUserDepartment] = useState<string | undefined>();

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

  // Fetch user's department information
  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (user?.id) {
        try {
          console.log('Fetching department for user:', user.id);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('department_id, departments(name)')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Failed to fetch user department:', error);
            console.error('Error details:', {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint
            });
          } else {
            console.log('Profile data:', profile);
            if (profile?.departments && typeof profile.departments === 'object' && 'name' in profile.departments) {
              const deptName = (profile.departments as any).name;
              console.log('Setting department:', deptName);
              setUserDepartment(deptName);
            } else {
              console.log('No department found or invalid format:', profile?.departments);
            }
          }
        } catch (error) {
          console.error('Error fetching user department:', error);
        }
      }
    };

    fetchUserDepartment();
  }, [user]);

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
        case "patients":
          return <PatientsPage />;
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
          userDepartment={userDepartment}
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
