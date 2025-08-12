import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  LogOut, 
  Settings, 
  Bell, 
  Search,
  Menu,
  Stethoscope,
  Users,
  Building2
} from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
  userRole: "doctor" | "front-desk";
  userAvatar?: string;
  userDepartment?: string;
  onRoleSwitch?: (role: "doctor" | "front-desk") => void;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const DashboardHeader = ({
  userName,
  userRole,
  userAvatar,
  userDepartment,
  onRoleSwitch,
  onLogout,
  onToggleSidebar,
  sidebarOpen = false,
}: DashboardHeaderProps) => {
  const getRoleIcon = (role: string) => {
    return role === "doctor" ? <Stethoscope className="w-4 h-4" /> : <Users className="w-4 h-4" />;
  };

  const getRoleColor = (role: string) => {
    return role === "doctor" 
      ? "bg-blue-50 text-blue-700 border-blue-200" 
      : "bg-green-50 text-green-700 border-green-200";
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Menu and Search */}
        <div className="flex items-center gap-4 sm:gap-6">
          {userRole === "front-desk" && onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 w-8 p-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search patients, appointments..."
              className="bg-transparent border-none outline-none text-sm w-64"
            />
          </div>
        </div>

        {/* Right side - User info, notifications, and menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>

          {/* Role Badge */}
          <Badge 
            variant="outline" 
            className={`${getRoleColor(userRole)} flex items-center gap-1 cursor-pointer`}
            onClick={() => onRoleSwitch?.(userRole === "doctor" ? "front-desk" : "doctor")}
          >
            {getRoleIcon(userRole)}
            <span className="hidden sm:inline">
              {userRole === "doctor" ? "Doctor" : "Front Desk"}
            </span>
          </Badge>

          {/* Department Badge - Show for all users with departments */}
          {userDepartment && (
            <Badge 
              variant="outline" 
              className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1"
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">{userDepartment}</span>
            </Badge>
          )}

          {/* User Info - Always Visible */}
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs sm:text-sm">
                {userName.split(" ").map(n => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{userName}</div>
              <div className="text-xs text-gray-500 capitalize">{userRole.replace("-", " ")}</div>
              {userDepartment && (
                <div className="text-xs text-purple-600 font-medium">{userDepartment}</div>
              )}
            </div>
            <div className="text-left sm:hidden">
              <div className="text-xs font-medium text-gray-900">{userName.split(" ")[0]}</div>
              <div className="text-xs text-gray-500 capitalize">{userRole.replace("-", " ")}</div>
              {userDepartment && (
                <div className="text-xs text-purple-600 font-medium">{userDepartment}</div>
              )}
            </div>
          </div>

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {userName.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{userName}</div>
                    <div className="text-xs text-gray-500 capitalize">{userRole.replace("-", " ")}</div>
                    {userDepartment && (
                      <div className="text-xs text-purple-600 font-medium">{userDepartment}</div>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
