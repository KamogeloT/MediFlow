import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, User } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  status: "waiting" | "in-progress" | "completed";
  waitTime: string;
  appointmentTime: string;
  avatarUrl?: string;
}

interface PatientQueueProps {
  patients?: Patient[];
}

const defaultPatients: Patient[] = [
  {
    id: "1",
    name: "John Smith",
    status: "waiting",
    waitTime: "15 min",
    appointmentTime: "09:00 AM",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    status: "in-progress",
    waitTime: "0 min",
    appointmentTime: "09:15 AM",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
  },
  {
    id: "3",
    name: "Michael Brown",
    status: "waiting",
    waitTime: "30 min",
    appointmentTime: "09:30 AM",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
  },
  {
    id: "4",
    name: "Emily Davis",
    status: "completed",
    waitTime: "0 min",
    appointmentTime: "08:45 AM",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=emily",
  },
];

const getStatusColor = (status: Patient["status"]) => {
  switch (status) {
    case "waiting":
      return "bg-yellow-100 text-yellow-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const PatientQueue = ({ patients = defaultPatients }: PatientQueueProps) => {
  return (
    <Card className="w-[350px] h-full bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Patient Queue</h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <User className="w-4 h-4" />
          {patients.length}
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="space-y-3">
          {patients.map((patient) => (
            <Card
              key={patient.id}
              className="p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <img
                    src={patient.avatarUrl}
                    alt={patient.name}
                    className="w-full h-full object-cover"
                  />
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{patient.name}</h3>
                    <Badge
                      variant="secondary"
                      className={`${getStatusColor(patient.status)} capitalize`}
                    >
                      {patient.status.replace("-", " ")}
                    </Badge>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Clock className="w-4 h-4" />
                          <span>Wait time: {patient.waitTime}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Appointment time: {patient.appointmentTime}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default PatientQueue;
