import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { fetchQueue, updateQueueStatus, subscribeToQueue, QueueEntry } from "@/lib/queue";
import { 
  Users, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  MapPin,
  Building2,
  Filter
} from "lucide-react";

const QueuePage = () => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
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

  const handleCheckIn = async (entry: QueueEntry) => {
    try {
      await updateQueueStatus(entry.id, "in-consultation");
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

  // Filter by department
  const filteredEntries = selectedDepartment === "all" 
    ? queueEntries 
    : queueEntries.filter(entry => entry.department === selectedDepartment);

  const waitingPatients = filteredEntries.filter(entry => entry.status === "waiting");
  const inConsultationPatients = filteredEntries.filter(entry => entry.status === "in-consultation");
  const completedPatients = filteredEntries.filter(entry => entry.status === "completed");

  // Get unique departments
  const departments = Array.from(new Set(queueEntries.map(entry => entry.department).filter(Boolean)));

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patient Queue</h1>
              <p className="text-gray-600">Monitor and manage patient queue across departments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {filteredEntries.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading queue...</div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Waiting Patients */}
              {waitingPatients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Waiting ({waitingPatients.length})
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    {waitingPatients.map((entry) => (
                      <Card key={entry.id} className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12 bg-gray-100">
                              <User className="w-6 h-6 text-gray-600" />
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {entry.patient_name}
                                </h3>
                                <div className="flex items-center gap-2">
                                  {getPriorityIcon(entry.priority)}
                                  <Badge
                                    variant="outline"
                                    className={`${getPriorityColor(entry.priority)} text-xs`}
                                  >
                                    {entry.priority}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Wait: {formatWaitTime(entry.added_at)}</span>
                                </div>
                                {entry.department && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    <span>{entry.department}</span>
                                  </div>
                                )}
                              </div>
                              
                              {entry.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700">{entry.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => handleCheckIn(entry)}
                            className="h-8"
                          >
                            Check In
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* In Consultation Patients */}
              {inConsultationPatients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      In Consultation ({inConsultationPatients.length})
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    {inConsultationPatients.map((entry) => (
                      <Card key={entry.id} className="p-6 bg-blue-50 border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12 bg-blue-100">
                              <CheckCircle className="w-6 h-6 text-blue-600" />
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {entry.patient_name}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-700 border-blue-200 text-xs"
                                >
                                  In Consultation
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                {entry.department && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    <span>{entry.department}</span>
                                  </div>
                                )}
                                {entry.checked_in_at && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>Checked in: {formatWaitTime(entry.checked_in_at)}</span>
                                  </div>
                                )}
                              </div>
                              
                              {entry.notes && (
                                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                                  <p className="text-sm text-gray-700">{entry.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleComplete(entry)}
                            className="h-8"
                          >
                            Complete
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Patients */}
              {completedPatients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Completed ({completedPatients.length})
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    {completedPatients.map((entry) => (
                      <Card key={entry.id} className="p-6 bg-green-50 border-green-200">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 bg-green-100">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {entry.patient_name}
                              </h3>
                              <Badge
                                variant="outline"
                                className="bg-green-100 text-green-700 border-green-200 text-xs"
                              >
                                Completed
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              {entry.department && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  <span>{entry.department}</span>
                                </div>
                              )}
                              {entry.completed_at && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Completed: {formatWaitTime(entry.completed_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {filteredEntries.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No patients in queue</h3>
                  <p className="text-gray-500">
                    {selectedDepartment === "all" 
                      ? "No patients are currently in the queue." 
                      : `No patients in queue for ${selectedDepartment} department.`
                    }
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default QueuePage;
