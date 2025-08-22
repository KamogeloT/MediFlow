import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import DashboardHeader from "./DashboardHeader";
import Sidebar from "./Sidebar";
import FrontDeskView from "./dashboard/FrontDeskView";
import FrontDeskDashboard from "./dashboard/FrontDeskDashboard";
import DoctorView from "./dashboard/DoctorView";
import AppointmentsPage from "./dashboard/AppointmentsPage";
import QueuePage from "./dashboard/QueuePage";
import DoctorAssignmentsPage from "./dashboard/DoctorAssignmentsPage";
import PatientsPage from "./dashboard/PatientsPage";
import NurseDashboard from "./dashboard/NurseDashboard";
// import { BillingPage } from "./dashboard/BillingPage";
import { useToast } from "@/components/ui/use-toast";
import { subscribeToPatients } from "@/lib/patients";
import { notify } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

interface HomeProps {
  role: "doctor" | "front-desk" | "nurse";
  userName?: string;
  userAvatar?: string;
}

type ViewType = "dashboard" | "registration" | "appointments" | "queue" | "assignments" | "patients" | "billing";

const Home = ({
  role,
  userName,
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=doctor",
}: HomeProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDepartment, setUserDepartment] = useState<string | undefined>();

  // Set default userName after user is available
  const displayName = userName || user?.user_metadata?.full_name || user?.email || "User";

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
            .select('department_id')
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
            if (profile?.department_id) {
              // Get department name separately
              const { data: department, error: deptError } = await supabase
                .from('departments')
                .select('name')
                .eq('id', profile.department_id)
                .single();
              
              if (!deptError && department) {
                console.log('Setting department:', department.name);
                setUserDepartment(department.name);
              } else {
                console.log('Department not found in departments table');
                setUserDepartment('Unknown Department');
              }
            } else {
              // For front-desk users, this might be normal
              if (role === 'front-desk') {
                console.log('Front-desk user - no specific department assigned (this is normal)');
                setUserDepartment('All Departments');
              } else {
                console.log('No department assigned to user');
                setUserDepartment('No Department');
              }
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
        case "dashboard":
          return <FrontDeskDashboard />;
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
        case "billing":
          return <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Billing Module</h2>
            <p className="text-gray-600">Billing functionality is being loaded...</p>
          </div>;
        default:
          return <FrontDeskDashboard />;
      }
    } else if (role === "nurse") {
      return <NurseDashboard />;
    } else {
      return <DoctorView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      {(role === "front-desk" || role === "nurse") && (
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          role={role}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <DashboardHeader
          userName={displayName}
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
