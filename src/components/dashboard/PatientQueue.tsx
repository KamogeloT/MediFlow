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
import { Clock, User, AlertTriangle, CheckCircle, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchQueue, updateQueueStatus, subscribeToQueue, QueueEntry } from "@/lib/queue";

interface PatientQueueProps {
  onCheckIn?: (patient: QueueEntry) => void;
}

const getStatusColor = (status: QueueEntry["status"]) => {
  switch (status) {
    case "waiting":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "in-consultation":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getPriorityColor = (priority: QueueEntry["priority"]) => {
  switch (priority) {
    case "urgent":
      return "bg-red-50 text-red-700 border-red-200";
    case "high":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "normal":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "low":
      return "bg-gray-50 text-gray-700 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getPriorityIcon = (priority: QueueEntry["priority"]) => {
  switch (priority) {
    case "urgent":
      return <AlertTriangle className="w-3 h-3" />;
    case "high":
      return <AlertTriangle className="w-3 h-3" />;
    default:
      return null;
  }
};

const formatWaitTime = (addedAt: string) => {
  const added = new Date(addedAt);
  const now = new Date();
  const diffMs = now.getTime() - added.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins}m`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }
};

const PatientQueue = ({ onCheckIn }: PatientQueueProps) => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch queue entries
  useEffect(() => {
    const loadQueue = async () => {
      try {
        setIsLoading(true);
        const entries = await fetchQueue();
        setQueueEntries(entries);
      } catch (error) {
        console.error("Failed to fetch queue", error);
        toast({
          title: "Failed to load queue",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadQueue();
  }, [toast]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToQueue((eventType, entry) => {
      if (eventType === "INSERT") {
        setQueueEntries(prev => [...prev, entry]);
      } else if (eventType === "UPDATE") {
        setQueueEntries(prev => 
          prev.map(item => item.id === entry.id ? entry : item)
        );
      } else if (eventType === "DELETE") {
        setQueueEntries(prev => prev.filter(item => item.id !== entry.id));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCheckIn = async (entry: QueueEntry) => {
    try {
      await updateQueueStatus(entry.id, "in-consultation");
      onCheckIn?.(entry);
      toast({ 
        title: "Patient checked in", 
        description: entry.patient_name 
      });
    } catch (error) {
      console.error("Failed to check in patient", error);
      toast({
        title: "Failed to check in",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleComplete = async (entry: QueueEntry) => {
    try {
      await updateQueueStatus(entry.id, "completed");
      toast({ 
        title: "Consultation completed", 
        description: entry.patient_name 
      });
    } catch (error) {
      console.error("Failed to complete consultation", error);
      toast({
        title: "Failed to complete",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const waitingPatients = queueEntries.filter(entry => entry.status === "waiting");
  const inConsultationPatients = queueEntries.filter(entry => entry.status === "in-consultation");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Patient Queue</h3>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {queueEntries.length}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading queue...</div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Waiting Patients */}
              {waitingPatients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <h4 className="text-sm font-medium text-gray-700">
                      Waiting ({waitingPatients.length})
                    </h4>
                  </div>
        <div className="space-y-3">
                    {waitingPatients.map((entry) => (
            <Card
                        key={entry.id}
                        className="p-4 hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 bg-gray-100">
                            <User className="w-5 h-5 text-gray-600" />
                </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 truncate">
                                  {entry.patient_name}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1">
                                    {getPriorityIcon(entry.priority)}
                    <Badge
                                      variant="outline"
                                      className={`${getPriorityColor(entry.priority)} text-xs`}
                    >
                                      {entry.priority}
                    </Badge>
                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatWaitTime(entry.added_at)}</span>
                                  </div>
                                </div>
                                {entry.department && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {entry.department}
                                  </div>
                                )}
                                {entry.notes && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                                        <div className="text-xs text-gray-500 mt-1 truncate">
                                          📝 {entry.notes}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                                        <p>{entry.notes}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                              </div>
                            </div>
                    <Button
                      size="sm"
                              className="mt-3 w-full"
                              onClick={() => handleCheckIn(entry)}
                    >
                      Check In
                    </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* In Consultation Patients */}
              {inConsultationPatients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h4 className="text-sm font-medium text-gray-700">
                      In Consultation ({inConsultationPatients.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {inConsultationPatients.map((entry) => (
                      <Card
                        key={entry.id}
                        className="p-4 bg-blue-50 border-blue-200"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 bg-blue-100">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-gray-900 truncate">
                                  {entry.patient_name}
                                </h5>
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-700 border-blue-200 text-xs mt-1"
                                >
                                  In Consultation
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 w-full"
                              onClick={() => handleComplete(entry)}
                            >
                              Complete
                            </Button>
                </div>
              </div>
            </Card>
          ))}
                  </div>
                </div>
              )}

              {queueEntries.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm">No patients in queue</p>
                </div>
              )}
        </div>
      </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default PatientQueue;
