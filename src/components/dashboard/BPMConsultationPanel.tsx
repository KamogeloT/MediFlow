import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Stethoscope, Pill, Save, Archive, Route, CheckCircle, AlertTriangle, History, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { 
  startConsultation, 
  completeConsultation, 
  routeConsultation, 
  archiveConsultation,
  getConsultationLogs,
  getConsultationWorkflowStates,
  getDepartmentRoutingRules,
  getDoctorDepartments,
  assignDoctorToDepartment,
  validateQueueItem,
  type ConsultationLog,
  type ConsultationWorkflowState
} from "@/lib/consultations";
import { fetchDepartments, type Department } from "@/lib/departments";

interface BPMConsultationPanelProps {
  queueItemId: string;
  patientId?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  currentVisitReason?: string;
  departmentId: string;
  departmentName: string;
  onConsultationUpdate?: () => void;
}

const BPMConsultationPanel = ({
  queueItemId,
          patientName = selectedQueueItem?.patient_name || "Patient",
  patientAge = 45,
  patientGender = "Male",
  currentVisitReason = "Regular checkup",
  departmentId,
  departmentName,
  onConsultationUpdate,
}: BPMConsultationPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Debug logging
  console.log('BPMConsultationPanel props:', {
    queueItemId,
    patientName,
    patientAge,
    patientGender,
    currentVisitReason,
    departmentId,
    departmentName
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [consultationStarted, setConsultationStarted] = useState(false);
  const [consultationLogs, setConsultationLogs] = useState<ConsultationLog[]>([]);
  const [workflowStates, setWorkflowStates] = useState<ConsultationWorkflowState[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);
  
  // Form states
  const [consultationNotes, setConsultationNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [routingReason, setRoutingReason] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [archiveReason, setArchiveReason] = useState("");

  // Dialog states
  const [showRoutingDialog, setShowRoutingDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Validation states
  const [queueItemValid, setQueueItemValid] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [queueItemId]);

  // Validate queue item whenever queueItemId changes
  useEffect(() => {
    if (queueItemId) {
      validateQueueItemRealTime();
    }
  }, [queueItemId]);

  const validateQueueItemRealTime = async () => {
    try {
      setIsValidating(true);
      setValidationError("");
      
      const validation = await validateQueueItem(queueItemId);
      setQueueItemValid(validation.isValid);
      
      if (!validation.isValid) {
        setValidationError(validation.error || "Validation failed");
      }
    } catch (error) {
      console.error("Real-time validation error:", error);
      setQueueItemValid(false);
      setValidationError("Failed to validate queue item");
    } finally {
      setIsValidating(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load departments for routing
      const deps = await fetchDepartments();
      setDepartments(deps);
      
      // Load routing rules
      const rules = await getDepartmentRoutingRules();
      setRoutingRules(rules);
      
      // Load current user's department assignments
      if (user?.id) {
        const userDepts = await getDoctorDepartments(user.id);
        setUserDepartments(userDepts);
        console.log('Current user departments:', userDepts);
      }
      
      // Load consultation logs if consultation is already started
      await loadConsultationData();
      
    } catch (error) {
      console.error("Failed to load initial data:", error);
      toast({
        title: "Error",
        description: "Failed to load consultation data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadConsultationData = async () => {
    try {
      const logs = await getConsultationLogs(queueItemId);
      setConsultationLogs(logs);
      
      // Check if consultation is already started
      const startedLog = logs.find(log => log.action_type === 'consultation_started');
      if (startedLog) {
        setConsultationStarted(true);
        
        // Load workflow states
        const states = await getConsultationWorkflowStates(startedLog.consultation_session_id || '');
        setWorkflowStates(states);
      }
    } catch (error) {
      console.error("Failed to load consultation data:", error);
    }
  };

  const handleStartConsultation = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      console.log('Starting consultation with data:', {
        queue_item_id: queueItemId,
        doctor_id: user.id,
        notes: consultationNotes
      });

      const result = await startConsultation({
        queue_item_id: queueItemId,
        doctor_id: user.id,
        notes: consultationNotes
      });

      console.log('Consultation started successfully:', result);

      setConsultationStarted(true);
      await loadConsultationData();
      
      toast({
        title: "Consultation Started",
        description: "Consultation session has been initiated",
      });

      onConsultationUpdate?.();
    } catch (error) {
      console.error("Failed to start consultation:", error);
      
      // Enhanced error logging
      if (error && typeof error === 'object') {
        console.error("Error object:", error);
        console.error("Error message:", (error as any).message);
        console.error("Error code:", (error as any).code);
        console.error("Error details:", (error as any).details);
        console.error("Error hint:", (error as any).hint);
        
        // Check if it's a Supabase error
        if ((error as any).code) {
          console.error("Supabase error code:", (error as any).code);
        }
      }
      
      // Provide more specific error messages
      let errorMessage = "Failed to start consultation";
      
      if (error && typeof error === 'object') {
        if ((error as any).message) {
          errorMessage = (error as any).message;
        } else if ((error as any).code === 'P0001') {
          errorMessage = "Queue item not found or access denied";
        } else if ((error as any).code === '42501') {
          errorMessage = "Permission denied. Please check your department assignment.";
        } else if ((error as any).code === '42P01') {
          errorMessage = "Database function not found. Please contact administrator.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteConsultation = async () => {
    try {
      setIsLoading(true);
      
      await completeConsultation({
        queue_item_id: queueItemId,
        diagnosis,
        prescription,
        follow_up_required: followUpRequired,
        follow_up_date: followUpDate || undefined,
        notes: consultationNotes
      });

      setConsultationStarted(false);
      await loadConsultationData();
      
      toast({
        title: "Consultation Completed",
        description: "Consultation has been completed successfully",
      });

      onConsultationUpdate?.();
      setShowCompleteDialog(false);
    } catch (error) {
      console.error("Failed to complete consultation:", error);
      toast({
        title: "Error",
        description: "Failed to complete consultation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteConsultation = async () => {
    try {
      setIsLoading(true);
      
      if (!selectedDepartment) {
        throw new Error("Please select a department");
      }

      await routeConsultation({
        queue_item_id: queueItemId,
        new_department_id: selectedDepartment,
        routing_reason: routingReason,
        notes: consultationNotes
      });

      setConsultationStarted(false);
      await loadConsultationData();
      
      toast({
        title: "Consultation Routed",
        description: "Patient has been routed to the new department",
      });

      onConsultationUpdate?.();
      setShowRoutingDialog(false);
    } catch (error) {
      console.error("Failed to route consultation:", error);
      toast({
        title: "Error",
        description: "Failed to route consultation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveConsultation = async () => {
    try {
      setIsLoading(true);
      
      await archiveConsultation({
        queue_item_id: queueItemId,
        archive_reason: archiveReason
      });

      await loadConsultationData();
      
      toast({
        title: "Consultation Archived",
        description: "Consultation has been archived",
      });

      onConsultationUpdate?.();
      setShowArchiveDialog(false);
    } catch (error) {
      console.error("Failed to archive consultation:", error);
      toast({
        title: "Error",
        description: "Failed to archive consultation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentWorkflowState = () => {
    if (workflowStates.length === 0) return null;
    return workflowStates[workflowStates.length - 1];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'routed': return 'bg-orange-100 text-orange-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 p-6">
      <Card className="h-full shadow-lg border-0">
        <div className="p-8">
          {/* Enhanced Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{patientName}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {patientAge} years
                    </span>
                    <span className="text-gray-600 flex items-center gap-1">
                      <Pill className="h-4 w-4" />
                      {patientGender}
                    </span>
                    <span className="text-gray-600 flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {departmentName}
                    </span>
                  </div>
                </div>
              </div>
              
              {consultationStarted && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">Consultation in progress</span>
                  {getCurrentWorkflowState() && (
                    <Badge className={`${getStatusColor(getCurrentWorkflowState()!.current_state)} px-3 py-1`}>
                      {getCurrentWorkflowState()!.current_state.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              )}
              
                             {/* Department Info - Shows which departments you can work in */}
               <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                 <div className="text-sm text-blue-800">
                   <strong>Your Departments:</strong> {userDepartments.length > 0 ? userDepartments.join(', ') : 'None assigned'}
                   <br />
                   <strong>Current Patient Department:</strong> {departmentName}
                   <br />
                   <span className="text-xs text-blue-600">
                     You can only see patients from your assigned departments
                   </span>
                 </div>
                 {userDepartments.length === 0 && (
                   <Button 
                     onClick={async () => {
                       if (user?.id) {
                         const success = await assignDoctorToDepartment(user.id, departmentId);
                         if (success) {
                           toast({
                             title: "Department Assignment",
                             description: "You have been assigned to this department",
                           });
                           // Reload user departments
                           const userDepts = await getDoctorDepartments(user.id);
                           setUserDepartments(userDepts);
                         }
                       }
                     }}
                     className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                     size="sm"
                   >
                     Assign Me to This Department
                   </Button>
                 )}
               </div>

               {/* Queue Item Validation Status */}
               <div className={`mt-4 p-3 rounded-lg border ${
                 queueItemValid 
                   ? 'bg-green-50 border-green-200' 
                   : 'bg-red-50 border-red-200'
               }`}>
                 <div className={`text-sm ${
                   queueItemValid ? 'text-green-800' : 'text-red-800'
                 }`}>
                   <div className="flex items-center gap-2">
                     {isValidating ? (
                       <>
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                         <strong>Validating queue item...</strong>
                       </>
                     ) : queueItemValid ? (
                       <>
                         <CheckCircle className="h-4 w-4 text-green-600" />
                         <strong>Queue item is valid and ready for consultation</strong>
                       </>
                     ) : (
                       <>
                         <AlertTriangle className="h-4 w-4 text-red-600" />
                         <strong>Queue item validation failed</strong>
                       </>
                     )}
                   </div>
                   {!queueItemValid && validationError && (
                     <div className="mt-2 text-red-700">
                       {validationError}
                     </div>
                   )}
                   {!queueItemValid && (
                     <Button 
                       onClick={validateQueueItemRealTime}
                       className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                       size="sm"
                     >
                       Re-validate
                     </Button>
                   )}
                 </div>
               </div>
            </div>
            
                         <div className="flex items-center gap-3">
               {!consultationStarted ? (
                 <Button 
                   onClick={handleStartConsultation} 
                   disabled={isLoading || !queueItemValid || isValidating}
                   className={`px-6 py-3 text-lg font-medium shadow-lg ${
                     queueItemValid && !isValidating
                       ? 'bg-blue-600 hover:bg-blue-700 text-white'
                       : 'bg-gray-400 cursor-not-allowed text-gray-200'
                   }`}
                 >
                   <Stethoscope className="h-5 w-5 mr-2" />
                   {isValidating ? 'Validating...' : 'Start Consultation'}
                 </Button>
               ) : (
                <div className="flex gap-3">
                  <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 px-4 py-2">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Complete Consultation</DialogTitle>
                        <DialogDescription>
                          Complete the consultation session and archive the patient record.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Diagnosis</Label>
                          <Textarea 
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="Enter diagnosis..."
                            className="mt-2 h-24 resize-none"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Prescription</Label>
                          <Textarea 
                            value={prescription}
                            onChange={(e) => setPrescription(e.target.value)}
                            placeholder="Enter prescription..."
                            className="mt-2 h-24 resize-none"
                          />
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="followUp"
                              checked={followUpRequired}
                              onChange={(e) => setFollowUpRequired(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300"
                            />
                            <Label htmlFor="followUp" className="text-sm font-medium text-gray-700">Follow-up required</Label>
                          </div>
                          {followUpRequired && (
                            <div>
                              <Label className="text-sm font-medium text-gray-700">Follow-up Date</Label>
                              <Input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                className="mt-2"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter className="gap-3">
                        <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCompleteConsultation} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                          Complete Consultation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showRoutingDialog} onOpenChange={setShowRoutingDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-orange-700 border-orange-300 hover:bg-orange-50 px-4 py-2">
                        <Route className="h-4 w-4 mr-2" />
                        Route
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Route to Department</DialogTitle>
                        <DialogDescription>
                          Route this patient to another department for specialized care.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Select Department</Label>
                          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Choose department..." />
                            </SelectTrigger>
                            <SelectContent>
                              {departments
                                .filter(dept => dept.id !== departmentId)
                                .map(dept => (
                                  <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Routing Reason</Label>
                          <Textarea 
                            value={routingReason}
                            onChange={(e) => setRoutingReason(e.target.value)}
                            placeholder="Explain why patient needs to be routed..."
                            className="mt-2 h-24 resize-none"
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-3">
                        <Button variant="outline" onClick={() => setShowRoutingDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleRouteConsultation} disabled={isLoading || !selectedDepartment} className="bg-orange-600 hover:bg-orange-700">
                          Route Patient
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-50 px-4 py-2">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Archive Consultation</DialogTitle>
                        <DialogDescription>
                          Archive this consultation for record keeping.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Archive Reason (Optional)</Label>
                          <Textarea 
                            value={archiveReason}
                            onChange={(e) => setArchiveReason(e.target.value)}
                            placeholder="Reason for archiving..."
                            className="mt-2 h-24 resize-none"
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-3">
                        <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleArchiveConsultation} disabled={isLoading} className="bg-gray-600 hover:bg-gray-700">
                          Archive
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Main Content */}
          <Tabs defaultValue="consultation" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="consultation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Stethoscope className="h-4 w-4 mr-2" />
                Consultation
              </TabsTrigger>
              <TabsTrigger value="workflow" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <History className="h-4 w-4 mr-2" />
                Workflow
              </TabsTrigger>
              <TabsTrigger value="routing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Route className="h-4 w-4 mr-2" />
                Routing
              </TabsTrigger>
              <TabsTrigger value="logs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4 mr-2" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-500px)] pr-4">
              {/* Consultation Tab */}
              <TabsContent value="consultation" className="space-y-6">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Reason for Visit</Label>
                    <Input defaultValue={currentVisitReason} className="mt-2 bg-gray-50" readOnly />
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Consultation Notes</Label>
                    <Textarea
                      value={consultationNotes}
                      onChange={(e) => setConsultationNotes(e.target.value)}
                      placeholder="Enter detailed consultation notes here..."
                      className="mt-2 h-32 resize-none"
                    />
                  </div>
                  
                  {consultationStarted && (
                    <>
                      <Separator className="my-8" />
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Diagnosis</Label>
                          <Textarea
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="Enter diagnosis..."
                            className="mt-2 h-24 resize-none"
                          />
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Prescription</Label>
                          <Textarea
                            value={prescription}
                            onChange={(e) => setPrescription(e.target.value)}
                            placeholder="Enter prescription..."
                            className="mt-2 h-24 resize-none"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Workflow Tab */}
              <TabsContent value="workflow" className="space-y-6">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Consultation Workflow States</h3>
                  {workflowStates.length > 0 ? (
                    <div className="space-y-4">
                      {workflowStates.map((state, index) => (
                        <div key={state.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="flex-shrink-0">
                            <Badge className={`${getStatusColor(state.current_state)} px-3 py-1`}>
                              {state.current_state.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 font-medium">
                              {state.transition_reason || 'State transition'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(state.created_at).toLocaleString()}
                            </p>
                          </div>
                          {index < workflowStates.length - 1 && (
                            <div className="text-blue-400 text-2xl">↓</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                      <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">No workflow states recorded yet</p>
                      <p className="text-sm">Workflow states will appear here as the consultation progresses</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Routing Tab */}
              <TabsContent value="routing" className="space-y-6">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Department Routing</h3>
                  
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">Available Departments</Label>
                      <div className="space-y-3">
                        {departments
                          .filter(dept => dept.id !== departmentId)
                          .map(dept => (
                            <div key={dept.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div>
                                <h4 className="font-medium text-gray-900">{dept.name}</h4>
                                <p className="text-sm text-gray-600">{dept.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDepartment(dept.id);
                                  setShowRoutingDialog(true);
                                }}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                Route Here
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>

                    <Separator className="my-8" />
                    
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">Routing Rules</Label>
                      <div className="space-y-3">
                        {routingRules
                          .filter(rule => rule.from_department_id === departmentId)
                          .map(rule => (
                            <div key={rule.id} className="p-4 border border-gray-200 rounded-lg bg-blue-50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {departments.find(d => d.id === rule.to_department_id)?.name}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Condition: {rule.routing_condition}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Reason: {rule.routing_reason}
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Auto-route</Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Audit Logs Tab */}
              <TabsContent value="logs" className="space-y-6">
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900">Consultation Audit Trail</h3>
                  
                  {consultationLogs.length > 0 ? (
                    <div className="space-y-4">
                      {consultationLogs.map((log) => (
                        <div key={log.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                  {log.action_type.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>
                              
                              {log.notes && (
                                <p className="text-sm text-gray-700 mb-3">{log.notes}</p>
                              )}
                              
                              {log.action_details && (
                                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(log.action_details, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {log.previous_department_id && log.new_department_id && (
                                <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                                  <Building2 className="h-4 w-4" />
                                  <span>
                                    Routed from {departments.find(d => d.id === log.previous_department_id)?.name} 
                                    to {departments.find(d => d.id === log.new_department_id)?.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right text-sm text-gray-500 ml-4">
                              {log.doctor_name && (
                                <div className="font-medium">Dr. {log.doctor_name}</div>
                              )}
                              {log.consultation_duration_minutes && (
                                <div className="text-blue-600">{log.consultation_duration_minutes} min</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">No consultation logs available</p>
                      <p className="text-sm">Audit logs will appear here as actions are performed</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default BPMConsultationPanel;
