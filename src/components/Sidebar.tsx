import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  UserPlus, 
  Calendar, 
  Clock, 
  ChevronLeft,
  ChevronRight,
  Home,
  Users,
  Settings
} from "lucide-react";

interface SidebarProps {
  currentView: "registration" | "appointments" | "queue" | "assignments";
  onViewChange: (view: "registration" | "appointments" | "queue" | "assignments") => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ currentView, onViewChange, isOpen, onToggle }: SidebarProps) => {
  const navigationItems = [
    {
      id: "registration" as const,
      label: "Patient Registration",
      icon: UserPlus,
      description: "Register new patients"
    },
    {
      id: "appointments" as const,
      label: "Appointments",
      icon: Calendar,
      description: "Manage appointments"
    },
    {
      id: "queue" as const,
      label: "Patient Queue",
      icon: Clock,
      description: "Monitor patient queue"
    },
    {
      id: "assignments" as const,
      label: "Doctor Assignments",
      icon: Users,
      description: "Manage doctor departments"
    }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isOpen ? "w-64" : "w-16"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MF</span>
            </div>
            <span className="font-semibold text-gray-900">MediFlow</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start gap-3 h-12 ${
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className="w-5 h-5" />
                {isOpen && (
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-xs ${
                      isActive ? "text-blue-100" : "text-gray-500"
                    }`}>
                      {item.description}
                    </div>
                  </div>
                )}
              </Button>
            );
          })}
        </div>

        {/* Bottom Section */}
        {isOpen && (
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-gray-700 hover:bg-gray-100"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm">Patients</span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-gray-700 hover:bg-gray-100"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
