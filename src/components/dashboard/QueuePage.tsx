import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play,
  Building2,
  User,
  Calendar,
  X,
  Plus
} from "lucide-react";
import { 
  fetchQueueByDoctor, 
  fetchAllQueue, 
  updateQueueStatus, 
  removeFromQueue,
  getQueueStats,
  addToQueue,
  type QueueItem 
} from "@/lib/queue";
import { useAuth } from "@/lib/auth";

const QueuePage = () => {
  const { user } = useAuth();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    inConsultation: 0,
    completed: 0,
    averageWaitTime: 0,
  });
  const { toast } = useToast();

  const isDoctor = user?.user_metadata?.role === "doctor";

  // Load queue based on user role
  useEffect(() => {
    const loadQueue = async () => {
      try {
        setIsLoading(true);
        
        if (isDoctor) {
          // Doctor sees only their queue
          const doctorQueue = await fetchQueueByDoctor(user.id);
          setQueueItems(doctorQueue);
        } else {
          // Front desk sees all queue items
          const allQueue = await fetchAllQueue();
          setQueueItems(allQueue);
        }

        // Load stats
        const queueStats = await getQueueStats(isDoctor ? undefined : undefined);
        setStats(queueStats);
      } catch (error) {
        console.error("Failed to load queue", error);
        const errorMessage = (error as Error).message;
        
        // Check if it's an authentication error
        if (errorMessage.includes("Authentication required")) {
          toast({
            title: "Session expired",
            description: "Please log in again to view the queue.",
            variant: "destructive",
          });
          // Don't reload the page immediately - let user try to refresh session
          return;
        }
        
        toast({
          title: "Failed to load queue",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadQueue();
    }
  }, [user, isDoctor, toast]);

  const handleStatusUpdate = async (queueId: string, newStatus: QueueItem["status"]) => {
    try {
      await updateQueueStatus(queueId, newStatus, isDoctor ? user.id : undefined);
      
      setQueueItems(prev => 
        prev.map(item => 
          item.id === queueId ? { ...item, status: newStatus } : item
        )
      );
      
      toast({
        title: "Queue updated",
        description: `Status changed to ${newStatus.replace('-', ' ')}`,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes("Authentication required")) {
        toast({
          title: "Session expired",
          description: "Please log in again to update the queue.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Failed to update queue",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromQueue = async (queueId: string) => {
    try {
      await removeFromQueue(queueId);
      
      setQueueItems(prev => prev.filter(item => item.id !== queueId));
      
      toast({
        title: "Patient removed",
        description: "Patient has been removed from the queue",
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes("Authentication required")) {
        toast({
          title: "Session expired",
          description: "Please log in again to remove patients from the queue.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Failed to remove patient",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: QueueItem["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: QueueItem["status"]) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in-consultation":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatWaitTime = (addedAt: string, checkedInAt?: string) => {
    const added = new Date(addedAt);
    const end = checkedInAt ? new Date(checkedInAt) : new Date();
    const diffMs = end.getTime() - added.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const waitingPatients = queueItems.filter(item => item.status === "waiting");
  const inConsultationPatients = queueItems.filter(item => item.status === "in-consultation");
  const completedPatients = queueItems.filter(item => item.status === "completed");

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
             <Users className="w-6 h6 text-blue-600" />
             <div>
               <h1 className="text-2xl font-bold text-gray-900">
                 {isDoctor ? "My Patient Queue" : "Patient Queue"}
               </h1>
               <p className="text-gray-600">
                 {isDoctor 
                   ? "Manage your patient queue and consultations" 
                   : "Monitor all patients across all departments"
                 }
               </p>
             </div>
           </div>
           {!isDoctor && (
             <Button onClick={() => setShowQuickAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
               <Plus className="w-4 h-4 mr-2" />
               Quick Add to Queue
             </Button>
           )}
        </div>
      </div>

             {/* Stats */}
       <div className="bg-white border-b border-gray-200 px-6 py-4">
         <div className="grid grid-cols-5 gap-4">
           <div className="text-center">
             <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
             <div className="text-sm text-gray-600">Total Patients</div>
           </div>
           <div className="text-center">
             <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
             <div className="text-sm text-gray-600">Waiting</div>
           </div>
           <div className="text-center">
             <div className="text-2xl font-bold text-blue-600">{stats.inConsultation}</div>
             <div className="text-sm text-gray-600">In Consultation</div>
           </div>
           <div className="text-center">
             <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
             <div className="text-sm text-gray-600">Completed</div>
           </div>
           <div className="text-center">
             <div className="text-2xl font-bold text-purple-600">{queueItems.filter(item => !item.patient_id).length}</div>
             <div className="text-sm text-gray-600">Walk-ins</div>
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
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  Waiting Patients ({waitingPatients.length})
                </h2>
                {waitingPatients.length > 0 ? (
                  <div className="grid gap-3">
                    {waitingPatients.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onStatusUpdate={handleStatusUpdate}
                        onRemove={handleRemoveFromQueue}
                        isDoctor={isDoctor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No patients waiting
                  </div>
                )}
              </div>

              {/* In Consultation */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-600" />
                  In Consultation ({inConsultationPatients.length})
                </h2>
                {inConsultationPatients.length > 0 ? (
                  <div className="grid gap-3">
                    {inConsultationPatients.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onStatusUpdate={handleStatusUpdate}
                        onRemove={handleRemoveFromQueue}
                        isDoctor={isDoctor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No patients in consultation
                  </div>
                )}
              </div>

              {/* Completed */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Completed ({completedPatients.length})
                </h2>
                {completedPatients.length > 0 ? (
                  <div className="grid gap-3">
                    {completedPatients.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        item={item}
                        onStatusUpdate={handleStatusUpdate}
                        onRemove={handleRemoveFromQueue}
                        isDoctor={isDoctor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No completed consultations
                  </div>
                )}
              </div>

              {queueItems.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Queue is empty</h3>
                  <p className="text-gray-500">No patients in the queue at this time.</p>
                </div>
              )}
            </div>
                     </ScrollArea>
         )}
       </div>

       {/* Quick Add to Queue Modal */}
       <QuickAddToQueueModal 
         isOpen={showQuickAddModal} 
         onClose={() => setShowQuickAddModal(false)}
         onSuccess={() => {
           setShowQuickAddModal(false);
           // Reload queue to show new patient
           window.location.reload();
         }}
       />
     </div>
   );
 };

// Queue Item Card Component
const QueueItemCard = ({ 
  item, 
  onStatusUpdate, 
  onRemove,
  isDoctor 
}: { 
  item: QueueItem; 
  onStatusUpdate: (id: string, status: QueueItem["status"]) => void;
  onRemove: (id: string) => void;
  isDoctor: boolean;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const formatWaitTime = (addedAt: string, checkedInAt?: string) => {
    const added = new Date(addedAt);
    const end = checkedInAt ? new Date(checkedInAt) : new Date();
    const diffMs = end.getTime() - added.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const getPriorityColor = (priority: QueueItem["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusColor = (status: QueueItem["status"]) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in-consultation":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleStatusChange = async (newStatus: QueueItem["status"]) => {
    setIsUpdating(true);
    await onStatusUpdate(item.id, newStatus);
    setIsUpdating(false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="w-10 h-10">
              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{item.patient_name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {item.department_name && (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>{item.department_name}</span>
                  </>
                )}
                {item.doctor_name && (
                  <>
                    <User className="w-4 h-4" />
                    <span>Dr. {item.doctor_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
                     <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
             <div className="flex items-center gap-2">
               <Clock className="w-4 h-4" />
               <span>Wait: {formatWaitTime(item.added_at, item.checked_in_at)}</span>
             </div>
             <div className="flex items-center gap-2">
               {item.appointment_time ? (
                 <>
                   <Calendar className="w-4 h-4" />
                   <span>Appt: {new Date(item.appointment_time).toLocaleTimeString()}</span>
                 </>
               ) : (
                 <>
                   <User className="w-4 h-4" />
                   <span>Walk-in</span>
                 </>
               )}
             </div>
           </div>
          
          {item.notes && (
            <p className="text-sm text-gray-600">{item.notes}</p>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Badge className={getPriorityColor(item.priority)}>
              {item.priority}
            </Badge>
            <Badge className={getStatusColor(item.status)}>
              {item.status.replace('-', ' ')}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            {item.status === "waiting" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("in-consultation")}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            )}
            
            {item.status === "in-consultation" && (
              <Button
                size="sm"
                onClick={() => handleStatusChange("completed")}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemove(item.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Quick Add to Queue Modal Component
const QuickAddToQueueModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
}) => {
  const [patientName, setPatientName] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [departmentId, setDepartmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { fetchDepartments } = await import('@/lib/departments');
        const depts = await fetchDepartments();
        setDepartments(depts);
        if (depts.length > 0) {
          setDepartmentId(depts[0].id);
        }
      } catch (error) {
        console.error("Failed to load departments", error);
      }
    };
    
    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientName.trim() || !departmentId) {
      toast({
        title: "Missing information",
        description: "Please provide patient name and select department",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await addToQueue({
        patient_name: patientName.trim(),
        priority,
        department_id: departmentId,
        notes: notes.trim() || undefined,
        is_walk_in: true, // Mark as walk-in patient
      });

      toast({
        title: "Patient added to queue",
        description: `${patientName} has been added to the queue`,
      });

      onSuccess();
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes("Authentication required")) {
        toast({
          title: "Session expired",
          description: "Please log in again to add patients to the queue.",
          variant: "destructive",
        });
        // Don't close the modal on auth error - let user try again
        return;
      }
      
      toast({
        title: "Failed to add patient",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPatientName("");
    setPriority("normal");
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Quick Add to Queue
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Add a walk-in patient directly to the queue without creating an appointment.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientName">Patient Name *</Label>
            <Input
              id="patientName"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient's full name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="normal">Normal Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes about the patient..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add to Queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QueuePage;
