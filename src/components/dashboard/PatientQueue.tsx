import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Patient {
  id: string;
  name: string;
  status: "waiting" | "in-consultation" | "completed";
  waitTime?: string;
  appointmentTime?: string;
  avatarUrl?: string;
}

interface PatientQueueProps {
  patients?: Patient[];
  onCheckIn?: (patient: Patient) => void;
}

const defaultPatients: Patient[] = [];

const getStatusColor = (status: Patient["status"]) => {
  switch (status) {
    case "waiting":
      return "bg-yellow-100 text-yellow-800";
    case "in-consultation":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const PatientQueue = ({
  patients: initialPatients = defaultPatients,
  onCheckIn,
}: PatientQueueProps) => {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  // Fetch queued patients
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch("/api/queue");
        if (res.ok) {
          const data = (await res.json()) as Patient[];
          setPatients(data);
        }
      } catch (error) {
        console.error("Failed to fetch queue", error);
      }
    };

    fetchQueue();
  }, []);

  // Realtime updates via Supabase
  useEffect(() => {
    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue" },
        () => {
          fetch("/api/queue")
            .then((res) => res.json())
            .then((data) => setPatients(data as Patient[]))
            .catch((err) => console.error("Failed to refresh queue", err));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCheckIn = async (patient: Patient) => {
    try {
      await fetch(`/api/queue/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in-consultation" }),
      });
      onCheckIn?.(patient);
    } catch (error) {
      console.error("Failed to check in patient", error);
    }
  };

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
                  {patient.avatarUrl && (
                    <img
                      src={patient.avatarUrl}
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  )}
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
                  {patient.waitTime && (
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
                  )}
                  {patient.status === "waiting" && (
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => handleCheckIn(patient)}
                    >
                      Check In
                    </Button>
                  )}
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
