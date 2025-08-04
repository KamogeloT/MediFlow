import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import DashboardHeader from "./DashboardHeader";
import FrontDeskView from "./dashboard/FrontDeskView";
import DoctorView from "./dashboard/DoctorView";

interface HomeProps {
  initialRole?: "doctor" | "front-desk";
  userName?: string;
  userAvatar?: string;
}

const Home = ({
  initialRole = "doctor",
  userName = "Dr. John Doe",
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=doctor",
}: HomeProps) => {
  const [currentRole, setCurrentRole] = useState<"doctor" | "front-desk">(
    initialRole,
  );
  const [frontDeskView, setFrontDeskView] = useState<
    "appointments" | "register" | "queue"
  >("appointments");

  const handleRoleSwitch = (newRole: "doctor" | "front-desk") => {
    setCurrentRole(newRole);
  };

  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <DashboardHeader
        userName={userName}
        userRole={currentRole}
        userAvatar={userAvatar}
        onRoleSwitch={handleRoleSwitch}
        onLogout={handleLogout}
        onFrontDeskNavigate={setFrontDeskView}
      />
      <main className="flex-1 h-[calc(100vh-64px)]">
        {currentRole === "front-desk" ? (
          <FrontDeskView
            view={frontDeskView}
            onPatientRegistration={(data) =>
              console.log("Patient registration:", data)
            }
          />
        ) : (
          <DoctorView
            currentPatient={{
              name: "John Doe",
              age: 45,
              gender: "Male",
              visitReason: "Regular checkup",
            }}
          />
        )}
      </main>
    </div>
  );
};

export default Home;
