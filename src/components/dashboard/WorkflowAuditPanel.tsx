import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  getQueueItemWorkflow, 
  getAuditTrail, 
  getPatientWorkflowHistory,
  formatWorkflowState,
  getWorkflowStateColor,
  calculateWorkflowTimeDifference
} from "@/lib/workflow";
import { 
  Clock, 
  User, 
  Building2, 
  Activity, 
  FileText,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from "lucide-react";

interface WorkflowAuditPanelProps {
  queueItemId?: string;
  patientId?: string;
  title?: string;
}

const WorkflowAuditPanel: React.FC<WorkflowAuditPanelProps> = ({
  queueItemId,
  patientId,
  title = "Workflow & Audit Logs"
}) => {
  const [workflowData, setWorkflowData] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [patientJourney, setPatientJourney] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("workflow");

  useEffect(() => {
    const loadData = async () => {
      if (!queueItemId && !patientId) return;
      
      setIsLoading(true);
      try {
        const promises = [];
        
        if (queueItemId) {
          promises.push(
            getQueueItemWorkflow(queueItemId),
            getAuditTrail('queue', queueItemId, 30)
          );
        }
        
        if (patientId) {
          promises.push(
            getPatientWorkflowHistory(patientId, 30)
          );
        }
        
        const results = await Promise.all(promises);
        
        if (queueItemId) {
          setWorkflowData(results[0] || []);
          setAuditData(results[1] || []);
        }
        
        if (patientId) {
          setPatientJourney(results[queueItemId ? 2 : 0] || []);
        }
      } catch (error) {
        console.error('Error loading workflow and audit data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [queueItemId, patientId]);

  const renderWorkflowTimeline = () => {
    if (workflowData.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No workflow data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {workflowData.map((item, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`w-3 h-3 rounded-full mt-2 ${getWorkflowStateColor(item.current_state)}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant="outline" className={getWorkflowStateColor(item.current_state)}>
                  {formatWorkflowState(item.current_state)}
                </Badge>
                <span className="text-sm text-gray-500">
                  {calculateWorkflowTimeDifference(item.created_at)}
                </span>
              </div>
              {item.transition_reason && (
                <p className="text-sm text-gray-600 mb-1">{item.transition_reason}</p>
              )}
              {item.state_data && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(item.state_data, null, 2)}</pre>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                by {item.created_by_role}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAuditLog = () => {
    if (auditData.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No audit logs available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {auditData.map((item, index) => (
          <div key={index} className="border-l-2 border-gray-200 pl-4 py-2">
            <div className="flex items-center space-x-2 mb-2">
              <Badge 
                variant={item.action_type === 'INSERT' ? 'default' : 
                        item.action_type === 'UPDATE' ? 'secondary' : 'destructive'}
              >
                {item.action_type}
              </Badge>
              <span className="text-sm text-gray-500">
                {calculateWorkflowTimeDifference(item.created_at)}
              </span>
            </div>
            
            {item.action_details && (
              <div className="text-sm text-gray-600 mb-2">
                <p><strong>Operation:</strong> {item.action_details.operation}</p>
                {item.action_details.source && (
                  <p><strong>Source:</strong> {item.action_details.source}</p>
                )}
                {item.action_details.patient_name && (
                  <p><strong>Patient:</strong> {item.action_details.patient_name}</p>
                )}
                {item.action_details.priority && (
                  <p><strong>Priority:</strong> {item.action_details.priority}</p>
                )}
              </div>
            )}
            
            <div className="text-xs text-gray-400">
              by {item.user_role} {item.user_department && `(${item.user_department})`}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPatientJourney = () => {
    if (patientJourney.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No patient journey data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {patientJourney.map((item, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 rounded-full mt-2 bg-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {item.event_type}
                </Badge>
                <span className="text-sm text-gray-500">
                  {calculateWorkflowTimeDifference(item.event_timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{item.event_description}</p>
              {item.event_data && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(item.event_data, null, 2)}</pre>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                by {item.performed_by_role} {item.performed_by_department && `(${item.performed_by_department})`}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2">Loading workflow and audit data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflow" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Workflow</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Audit Log</span>
            </TabsTrigger>
            <TabsTrigger value="journey" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Patient Journey</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="workflow" className="mt-4">
            <ScrollArea className="h-96">
              {renderWorkflowTimeline()}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="audit" className="mt-4">
            <ScrollArea className="h-96">
              {renderAuditLog()}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="journey" className="mt-4">
            <ScrollArea className="h-96">
              {renderPatientJourney()}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WorkflowAuditPanel;
