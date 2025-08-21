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
import { Clock, User, AlertTriangle, CheckCircle, Users, Building2, Stethoscope } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  fetchAllQueue, 
  updateQueueStatus, 
  subscribeToQueue, 
  type QueueItem,
  fetchQueueByDoctor
} from "@/lib/queue";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import BPMConsultationPanel from "./BPMConsultationPanel";

interface PatientQueueProps {
  onCheckIn?: (patient: QueueItem) => void;
}

interface PatientQueueState {
  queueItems: QueueItem[];
  isLoading: boolean;
}

const getStatusColor = (status: QueueItem["status"]) => {
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

const getPriorityColor = (priority: QueueItem["priority"]) => {
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

const getPriorityIcon = (priority: QueueItem["priority"]) => {
  switch (priority) {
    case "urgent":
      return <AlertTriangle className="w-3 h-3" />;
    case "high":
      return <AlertTriangle className="w-3 h-3" />;
    default:
      return null;
  }
};

const formatWaitTime = (addedAt: string, checkedInAt?: string) => {
  const added = new Date(addedAt);
  const end = checkedInAt ? new Date(checkedInAt) : new Date();
  const diffMs = end.getTime() - added.getTime();
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
  const { user } = useAuth();
  const [state, setState] = useState<PatientQueueState>({
    queueItems: [],
    isLoading: true
  });
  const [isDoctor, setIsDoctor] = useState(false);
  const { toast } = useToast();

  // Fetch user role from profiles table
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            console.log('User role:', data.role);
            setIsDoctor(data.role === 'doctor');
          } else {
            console.log('Error fetching user role:', error);
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        }
      }
    };

    fetchUserRole();
  }, [user?.id]);

  const loadQueue = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      let entries: QueueItem[];
      
      if (isDoctor && user?.id) {
        // Doctor sees only patients in their assigned department
        console.log('Loading doctor queue for user:', user.id);
        
        // First, let's check what department this doctor is assigned to
        const { data: doctorProfile, error: profileError } = await supabase
          .from('profiles')
          .select('department_id')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Failed to fetch doctor profile:', profileError);
        } else {
          console.log('Doctor profile:', doctorProfile);
          console.log('Doctor assigned to department ID:', doctorProfile?.department_id);
        }
        
        entries = await fetchQueueByDoctor(user.id);
        console.log('Doctor queue loaded:', entries.length, 'patients in department');
        console.log('Queue entries:', entries.map(e => ({ name: e.patient_name, dept: e.department_name, status: e.status })));
        
        // Double-check: if we still see patients from other departments, let's filter manually
        if (doctorProfile?.department_id) {
          const filteredEntries = entries.filter(item => item.department_id === doctorProfile.department_id);
          if (filteredEntries.length !== entries.length) {
            console.warn('Manual filtering applied - some patients were from other departments');
            entries = filteredEntries;
          }
        }
      } else {
        // Front desk sees all queue items
        console.log('Loading all queue entries for front desk');
        entries = await fetchAllQueue();
        console.log('All queue entries loaded:', entries.length);
      }
      
      setState(prev => ({ ...prev, queueItems: entries, isLoading: false }));
    } catch (error) {
      console.error("Failed to fetch queue", error);
      toast({
        title: "Failed to load queue",
        description: (error as Error).message,
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Load queue when component mounts or user role changes
  useEffect(() => {
    loadQueue();
    
    // Test if BPM functions exist in database
    if (isDoctor && user?.id) {
      const testBPMFunctions = async () => {
        try {
          // Test if start_consultation function exists
          const { data, error } = await supabase.rpc('start_consultation', {
            p_queue_item_id: '00000000-0000-0000-0000-000000000000', // dummy ID
            p_doctor_id: user.id,
            p_notes: null
          });
          
          if (error && error.code === 'P0001' && error.message.includes('Queue item not found')) {
            console.log('✅ BPM function exists - got expected error for dummy ID');
          } else if (error) {
            console.log('❌ BPM function error:', error);
          } else {
            console.log('✅ BPM function exists and working');
          }
        } catch (error) {
          console.log('❌ BPM function test failed:', error);
        }
      };
      
      testBPMFunctions();
    }
  }, [isDoctor]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToQueue((eventType, queueItem) => {
      if (eventType === "INSERT") {
        setState(prev => ({ ...prev, queueItems: [...prev.queueItems, queueItem] }));
      } else if (eventType === "UPDATE") {
        setState(prev => ({
          ...prev,
          queueItems: prev.queueItems.map(item => item.id === queueItem.id ? queueItem : item)
        }));
      } else if (eventType === "DELETE") {
        setState(prev => ({
          ...prev,
          queueItems: prev.queueItems.filter(item => item.id !== queueItem.id)
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCheckIn = async (item: QueueItem) => {
    try {
      await updateQueueStatus(item.id, "in-consultation", isDoctor ? user?.id : undefined);
      
      setState(prev => ({
        ...prev,
        queueItems: prev.queueItems.map(queueItem => 
          queueItem.id === item.id 
            ? { ...queueItem, status: "in-consultation" as const }
            : queueItem
        )
      }));
      
      toast({
        title: "Patient checked in",
        description: `${item.patient_name} has been checked in.`,
      });

      onCheckIn?.(item);
    } catch (error) {
      console.error("Failed to check in patient", error);
      toast({
        title: "Failed to check in",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleComplete = async (item: QueueItem) => {
    try {
      await updateQueueStatus(item.id, "completed");
      
      setState(prev => ({
        ...prev,
        queueItems: prev.queueItems.map(queueItem => 
          queueItem.id === item.id 
            ? { ...queueItem, status: "completed" as const }
            : queueItem
        )
      }));
      
      toast({
        title: "Consultation completed",
        description: `${item.patient_name} has completed their consultation.`,
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

  const handleStartConsultation = (item: QueueItem) => {
    console.log('Start Consultation clicked for:', item.patient_name);
    // Call the parent's onCheckIn to open the BPM panel in DoctorView
    onCheckIn?.(item);
  };

  const handleConsultationUpdate = () => {
    setState(prev => ({
      ...prev,
      showConsultation: false,
      selectedPatient: null
    }));
    loadQueue();
  };

  // Filter queue items by status
  const waitingPatients = state.queueItems.filter(item => item.status === "waiting");
  const inConsultationPatients = state.queueItems.filter(item => item.status === "in-consultation");
  const completedPatients = state.queueItems.filter(item => item.status === "completed");
  
  // Debug queue filtering
  console.log('Queue filtering:', {
    total: state.queueItems.length,
    waiting: waitingPatients.length,
    inConsultation: inConsultationPatients.length,
    completed: completedPatients.length,
    allItems: state.queueItems
  });



  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-0">
        {/* Debug info */}
        <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-100 rounded">
          User ID: {user?.id || 'None'} | 
          Role: {isDoctor ? 'Doctor' : 'Not Doctor'} | 
          Queue Items: {state.queueItems.length}
          {isDoctor && (
            <div className="mt-1 text-blue-600 font-medium">
              Showing patients in your assigned department only
            </div>
          )}
        </div>

        {/* Queue Content */}
        <div className="flex-1 space-y-3">
          {state.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : state.queueItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No patients in queue</p>
            </div>
          ) : (
            <>
              {/* Waiting Patients */}
              {waitingPatients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                    <Clock className="w-4 h-4" />
                    <span>Waiting Patients ({waitingPatients.length})</span>
                  </div>
                  <div className="space-y-3">
                    {waitingPatients.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onCheckIn={handleCheckIn}
                        onComplete={handleComplete}
                        onStartConsultation={handleStartConsultation}
                        isDoctor={isDoctor}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* In-Consultation Patients */}
              {inConsultationPatients.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                    <Stethoscope className="w-4 h-4" />
                    <span>In Consultation ({inConsultationPatients.length})</span>
                  </div>
                  <div className="space-y-3">
                    {inConsultationPatients.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onCheckIn={handleCheckIn}
                        onComplete={handleComplete}
                        onStartConsultation={handleStartConsultation}
                        isDoctor={isDoctor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

// Queue Item Card Component
const QueueItemCard = ({ 
  item, 
  onCheckIn, 
  onComplete,
  isDoctor,
  onStartConsultation
}: { 
  item: QueueItem; 
  onCheckIn: (item: QueueItem) => void;
  onComplete: (item: QueueItem) => void;
  isDoctor: boolean;
  onStartConsultation: (item: QueueItem) => void;
}) => {
  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <Avatar className="w-12 h-12 bg-blue-100">
            <User className="w-6 h-6 text-blue-600" />
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {item.patient_name}
              </h3>
              <div className="flex items-center gap-2">
                {getPriorityIcon(item.priority)}
                <Badge 
                  variant="outline" 
                  className={`${getPriorityColor(item.priority)} text-xs`}
                >
                  {item.priority}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`${getStatusColor(item.status)} text-xs`}
                >
                  {item.status.replace("-", " ")}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Wait: {formatWaitTime(item.added_at, item.checked_in_at)}</span>
              </div>
              {item.department_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>{item.department_name}</span>
                </div>
              )}
              {item.doctor_name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Dr. {item.doctor_name}</span>
                </div>
              )}
            </div>
            
            {item.notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{item.notes}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {item.status === "waiting" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    onClick={() => onCheckIn(item)}
                    className="h-8"
                  >
                    Check In
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Check in patient</p>
                </TooltipContent>
              </Tooltip>
              
              {isDoctor && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onStartConsultation(item)}
                      className="h-8"
                    >
                      <Stethoscope className="h-3 w-3 mr-1" />
                      Start Consultation
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Start BPM consultation session</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {!isDoctor && (
                <div className="text-xs text-gray-500">Doctor only</div>
              )}
            </>
          )}
          
          {item.status === "in-consultation" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onComplete(item)}
                    className="h-8"
                  >
                    Complete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark consultation as completed</p>
                </TooltipContent>
              </Tooltip>
              
              {isDoctor && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onStartConsultation(item)}
                      className="h-8"
                    >
                      <Stethoscope className="h-3 w-3 mr-1" />
                      Continue Consultation
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Continue BPM consultation session</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {!isDoctor && (
                <div className="text-xs text-gray-500">Doctor only</div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PatientQueue;
