import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import DashboardHeader from "./DashboardHeader";
import FrontDeskView from "./dashboard/FrontDeskView";
import DoctorView from "./dashboard/DoctorView";

interface HomeProps {
  role: "doctor" | "front-desk";
  userName?: string;
  userAvatar?: string;
}

const Home = ({
  role,
  userName = "Dr. John Doe",
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=doctor",
}: HomeProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  const handleRoleSwitch = (newRole: "doctor" | "front-desk") => {
    navigate(newRole === "doctor" ? "/doctor" : "/front-desk");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <DashboardHeader
        userName={userName}
        userRole={role}
        userAvatar={userAvatar}
        onRoleSwitch={handleRoleSwitch}
        onLogout={handleLogout}
      />
      <main className="flex-1 h-[calc(100vh-64px)]">
          {role === "front-desk" ? (
            <FrontDeskView
              onPatientRegistration={(data) =>
                console.log("Patient registration:", data)
              }
              onQueueUpdate={(data) => console.log("Queue updated:", data)}
            />
          ) : (
            <DoctorView />
          )}
      </main>
    </div>
  );
};

export default Home;
