import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Archive,
  Users
} from "lucide-react";

const WorkflowExplanation = () => {
  const workflowSteps = [
    {
      step: 1,
      icon: Calendar,
      title: "Appointment Scheduled",
      description: "Patient has a future appointment",
      status: "scheduled",
      color: "bg-blue-100 text-blue-800"
    },
    {
      step: 2,
      icon: CheckCircle,
      title: "Patient Check-in",
      description: "Patient arrives and checks in at front desk",
      status: "check-in",
      color: "bg-green-100 text-green-800"
    },
    {
      step: 3,
      icon: Users,
      title: "Added to Queue",
      description: "Patient automatically added to department queue",
      status: "queued",
      color: "bg-purple-100 text-purple-800"
    },
    {
      step: 4,
      icon: Archive,
      title: "Appointment Archived",
      description: "Original appointment archived (status: checked_in)",
      status: "archived",
      color: "bg-gray-100 text-gray-800"
    },
    {
      step: 5,
      icon: Clock,
      title: "Queue Active",
      description: "Only queue item remains active for consultation",
      status: "active",
      color: "bg-orange-100 text-orange-800"
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Appointment-to-Queue Workflow
        </CardTitle>
        <CardDescription>
          Understanding how appointments are converted to active queue items
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Workflow Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {workflowSteps.map((step, index) => (
              <div key={step.step} className="text-center">
                <div className="relative">
                  {/* Step Number */}
                  <div className={`w-12 h-12 rounded-full ${step.color} flex items-center justify-center mx-auto mb-3`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  
                  {/* Arrow to next step */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-6 -right-6">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                <p className="text-xs text-gray-600">{step.description}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {step.status}
                </Badge>
              </div>
            ))}
          </div>

          {/* Key Points */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Key Points:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Appointments are NOT queue items</strong> - they are separate entities</li>
              <li>• <strong>Check-in process</strong> archives the appointment and creates a queue item</li>
              <li>• <strong>Only queue items</strong> are active for doctor consultation</li>
              <li>• <strong>Appointments</strong> serve as scheduling and check-in records</li>
              <li>• <strong>Queue items</strong> represent active patient flow</li>
            </ul>
          </div>

          {/* Status Legend */}
          <div className="mt-4">
            <h5 className="font-medium text-gray-900 mb-2">Status Legend:</h5>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Scheduled</Badge>
              <Badge variant="default">Checked In</Badge>
              <Badge variant="outline">Completed</Badge>
              <Badge variant="destructive">Cancelled</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowExplanation;
