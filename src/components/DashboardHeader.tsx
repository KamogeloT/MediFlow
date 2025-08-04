import React from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Menu,
  User,
  LogOut,
  Settings,
  UserPlus,
  Calendar,
  Users,
} from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  userRole?: "doctor" | "front-desk";
  userAvatar?: string;
  onRoleSwitch?: (role: "doctor" | "front-desk") => void;
  onLogout?: () => void;
}

const DashboardHeader = ({
  userName = "Dr. John Doe",
  userRole = "doctor",
  userAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=doctor",
  onRoleSwitch = () => {},
  onLogout = () => {},
}: DashboardHeaderProps) => {
  const navigate = useNavigate();

  const handleRoleSwitch = () => {
    const target = userRole === "doctor" ? "/front-desk" : "/doctor";
    navigate(target);
    onRoleSwitch(userRole === "doctor" ? "front-desk" : "doctor");
  };

  return (
    <header className="w-full h-16 bg-white border-b px-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">
          {userRole === "doctor" ? "Doctor Dashboard" : "Front Desk Dashboard"}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        <nav className="hidden md:flex items-center space-x-2">
          {userRole === "front-desk" ? (
            <>
              <Button variant="ghost" asChild>
                <a href="#appointments" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Appointments</span>
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="#register" className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Register Patient</span>
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="#queue" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Patient Queue</span>
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <a href="#queue" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>My Patients</span>
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="#appointments" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Schedule</span>
                </a>
              </Button>
            </>
          )}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <img src={userAvatar} alt={userName} className="rounded-full" />
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>{userName}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRoleSwitch}>
              <Users className="mr-2 h-4 w-4" />
              <span>
                Switch to {userRole === "doctor" ? "Front Desk" : "Doctor"} View
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
