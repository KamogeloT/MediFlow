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
  patientName = "John Doe",
  patientAge = 45,
  patientGender = "Male",
  currentVisitReason = "Regular checkup",
  departmentId,
  departmentName,
  onConsultationUpdate,
}: BPMConsultationPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [consultationStarted, setConsultationStarted] = useState(false);
  const [consultationLogs, setConsultationLogs] = useState<ConsultationLog[]>([]);
  const [workflowStates, setWorkflowStates] = useState<ConsultationWorkflowState[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  
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

  useEffect(() => {
    loadInitialData();
  }, [queueItemId]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load departments for routing
      const deps = await fetchDepartments();
      setDepartments(deps);
      
      // Load routing rules
      const rules = await getDepartmentRoutingRules();
      setRoutingRules(rules);
      
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

      await startConsultation({
        queue_item_id: queueItemId,
        doctor_id: user.id,
        notes: consultationNotes
      });

      setConsultationStarted(true);
      await loadConsultationData();
      
      toast({
        title: "Consultation Started",
        description: "Consultation session has been initiated",
      });

      onConsultationUpdate?.();
    } catch (error) {
      console.error("Failed to start consultation:", error);
      
      // More detailed error logging
      if (error && typeof error === 'object' && 'message' in error) {
        console.error("Error message:", error.message);
        console.error("Error code:", (error as any).code);
        console.error("Error details:", (error as any).details);
      }
      
      toast({
        title: "Error",
        description: `Failed to start consultation: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    <div className="h-full w-full bg-white p-4">
      <Card className="h-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">{patientName}</h2>
              <p className="text-gray-600">
                {patientAge} years • {patientGender} • {departmentName}
              </p>
              {consultationStarted && (
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-600">Consultation in progress</span>
                  {getCurrentWorkflowState() && (
                    <Badge className={getStatusColor(getCurrentWorkflowState()!.current_state)}>
                      {getCurrentWorkflowState()!.current_state.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!consultationStarted ? (
                <Button 
                  onClick={handleStartConsultation} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Start Consultation
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Complete Consultation</DialogTitle>
                        <DialogDescription>
                          Complete the consultation session and archive the patient record.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Diagnosis</Label>
                          <Textarea 
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="Enter diagnosis..."
                          />
                        </div>
                        <div>
                          <Label>Prescription</Label>
                          <Textarea 
                            value={prescription}
                            onChange={(e) => setPrescription(e.target.value)}
                            placeholder="Enter prescription..."
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="followUp"
                              checked={followUpRequired}
                              onChange={(e) => setFollowUpRequired(e.target.checked)}
                            />
                            <Label htmlFor="followUp">Follow-up required</Label>
                          </div>
                          {followUpRequired && (
                            <div>
                              <Label>Follow-up Date</Label>
                              <Input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCompleteConsultation} disabled={isLoading}>
                          Complete Consultation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showRoutingDialog} onOpenChange={setShowRoutingDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-orange-600 border-orange-600">
                        <Route className="h-4 w-4 mr-2" />
                        Route
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Route to Department</DialogTitle>
                        <DialogDescription>
                          Route this patient to another department for specialized care.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Select Department</Label>
                          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger>
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
                          <Label>Routing Reason</Label>
                          <Textarea 
                            value={routingReason}
                            onChange={(e) => setRoutingReason(e.target.value)}
                            placeholder="Explain why patient needs to be routed..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRoutingDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleRouteConsultation} disabled={isLoading || !selectedDepartment}>
                          Route Patient
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-gray-600 border-gray-600">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Archive Consultation</DialogTitle>
                        <DialogDescription>
                          Archive this consultation for record keeping.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Archive Reason (Optional)</Label>
                          <Textarea 
                            value={archiveReason}
                            onChange={(e) => setArchiveReason(e.target.value)}
                            placeholder="Reason for archiving..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleArchiveConsultation} disabled={isLoading}>
                          Archive
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="consultation" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="consultation">
                <Stethoscope className="h-4 w-4 mr-2" />
                Consultation
              </TabsTrigger>
              <TabsTrigger value="workflow">
                <History className="h-4 w-4 mr-2" />
                Workflow
              </TabsTrigger>
              <TabsTrigger value="routing">
                <Route className="h-4 w-4 mr-2" />
                Routing
              </TabsTrigger>
              <TabsTrigger value="logs">
                <FileText className="h-4 w-4 mr-2" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-400px)]">
              {/* Consultation Tab */}
              <TabsContent value="consultation" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Reason for Visit</Label>
                    <Input defaultValue={currentVisitReason} className="mt-2" readOnly />
                  </div>
                  <div>
                    <Label>Consultation Notes</Label>
                    <Textarea
                      value={consultationNotes}
                      onChange={(e) => setConsultationNotes(e.target.value)}
                      placeholder="Enter detailed consultation notes here..."
                      className="mt-2 h-[200px]"
                    />
                  </div>
                  
                  {consultationStarted && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Diagnosis</Label>
                          <Textarea
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="Enter diagnosis..."
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label>Prescription</Label>
                          <Textarea
                            value={prescription}
                            onChange={(e) => setPrescription(e.target.value)}
                            placeholder="Enter prescription..."
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Workflow Tab */}
              <TabsContent value="workflow" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Consultation Workflow States</h3>
                  {workflowStates.length > 0 ? (
                    <div className="space-y-3">
                      {workflowStates.map((state, index) => (
                        <div key={state.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-shrink-0">
                            <Badge className={getStatusColor(state.current_state)}>
                              {state.current_state.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">
                              {state.transition_reason || 'State transition'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(state.created_at).toLocaleString()}
                            </p>
                          </div>
                          {index < workflowStates.length - 1 && (
                            <div className="text-gray-300">↓</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No workflow states recorded yet
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Routing Tab */}
              <TabsContent value="routing" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Department Routing</h3>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label>Available Departments</Label>
                      <div className="mt-2 space-y-2">
                        {departments
                          .filter(dept => dept.id !== departmentId)
                          .map(dept => (
                            <div key={dept.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <h4 className="font-medium">{dept.name}</h4>
                                <p className="text-sm text-gray-600">{dept.description}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDepartment(dept.id);
                                  setShowRoutingDialog(true);
                                }}
                              >
                                Route Here
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>

                    <Separator />
                    
                    <div>
                      <Label>Routing Rules</Label>
                      <div className="mt-2 space-y-2">
                        {routingRules
                          .filter(rule => rule.from_department_id === departmentId)
                          .map(rule => (
                            <div key={rule.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">
                                    {departments.find(d => d.id === rule.to_department_id)?.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Condition: {rule.routing_condition}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Reason: {rule.routing_reason}
                                  </p>
                                </div>
                                <Badge variant="outline">Auto-route</Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Audit Logs Tab */}
              <TabsContent value="logs" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Consultation Audit Trail</h3>
                  
                  {consultationLogs.length > 0 ? (
                    <div className="space-y-3">
                      {consultationLogs.map((log) => (
                        <div key={log.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {log.action_type.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>
                              
                              {log.notes && (
                                <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                              )}
                              
                              {log.action_details && (
                                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(log.action_details, null, 2)}
                                  </pre>
                                </div>
                              )}
                              
                              {log.previous_department_id && log.new_department_id && (
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                  <Building2 className="h-4 w-4" />
                                  <span>
                                    Routed from {departments.find(d => d.id === log.previous_department_id)?.name} 
                                    to {departments.find(d => d.id === log.new_department_id)?.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right text-sm text-gray-500">
                              {log.doctor_name && (
                                <div>Dr. {log.doctor_name}</div>
                              )}
                              {log.consultation_duration_minutes && (
                                <div>{log.consultation_duration_minutes} min</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No consultation logs available
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
