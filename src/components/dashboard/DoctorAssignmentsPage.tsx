import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { 
  Users, 
  Building2, 
  UserPlus, 
  Settings,
  Plus,
  X
} from "lucide-react";
import { fetchDepartments, fetchAllDoctors, Department, Doctor } from "@/lib/departments";

interface DoctorAssignment {
  doctor_id: string;
  doctor_name: string;
  department_id: string;
  department_name: string;
}

const DoctorAssignmentsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [assignments, setAssignments] = useState<DoctorAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load departments and doctors
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [depts, docs] = await Promise.all([
          fetchDepartments(),
          fetchAllDoctors()
        ]);
        setDepartments(depts);
        setDoctors(docs);
        
        // For now, create mock assignments based on the dummy data
        const mockAssignments: DoctorAssignment[] = [
          { doctor_id: '11111111-1111-1111-1111-111111111111', doctor_name: 'Dr. Sarah Johnson', department_id: '1', department_name: 'Cardiology' },
          { doctor_id: '11111111-1111-1111-1111-111111111111', doctor_name: 'Dr. Sarah Johnson', department_id: '2', department_name: 'Psychiatry' },
          { doctor_id: '22222222-2222-2222-2222-222222222222', doctor_name: 'Dr. Michael Chen', department_id: '1', department_name: 'Cardiology' },
          { doctor_id: '22222222-2222-2222-2222-222222222222', doctor_name: 'Dr. Michael Chen', department_id: '9', department_name: 'Emergency Medicine' },
          { doctor_id: '33333333-3333-3333-3333-333333333333', doctor_name: 'Dr. Emily Davis', department_id: '2', department_name: 'Dermatology' },
          { doctor_id: '33333333-3333-3333-3333-333333333333', doctor_name: 'Dr. Emily Davis', department_id: '6', department_name: 'Psychiatry' },
          { doctor_id: '44444444-4444-4444-4444-444444444444', doctor_name: 'Dr. Robert Wilson', department_id: '3', department_name: 'Neurology' },
          { doctor_id: '44444444-4444-4444-4444-444444444444', doctor_name: 'Dr. Robert Wilson', department_id: '9', department_name: 'Emergency Medicine' },
          { doctor_id: '55555555-5555-5555-5555-555555555555', doctor_name: 'Dr. Lisa Rodriguez', department_id: '2', department_name: 'Dermatology' },
          { doctor_id: '55555555-5555-5555-5555-555555555555', doctor_name: 'Dr. Lisa Rodriguez', department_id: '9', department_name: 'Emergency Medicine' },
          { doctor_id: '66666666-6666-6666-6666-666666666666', doctor_name: 'Dr. James Thompson', department_id: '3', department_name: 'Neurology' },
          { doctor_id: '66666666-6666-6666-6666-666666666666', doctor_name: 'Dr. James Thompson', department_id: '10', department_name: 'Internal Medicine' },
          { doctor_id: '77777777-7777-7777-7777-777777777777', doctor_name: 'Dr. Maria Garcia', department_id: '4', department_name: 'Orthopedics' },
          { doctor_id: '77777777-7777-7777-7777-777777777777', doctor_name: 'Dr. Maria Garcia', department_id: '10', department_name: 'Internal Medicine' },
          { doctor_id: '88888888-8888-8888-8888-888888888888', doctor_name: 'Dr. David Kim', department_id: '4', department_name: 'Orthopedics' },
          { doctor_id: '88888888-8888-8888-8888-888888888888', doctor_name: 'Dr. David Kim', department_id: '10', department_name: 'Internal Medicine' },
          { doctor_id: '99999999-9999-9999-9999-999999999999', doctor_name: 'Dr. Jennifer Lee', department_id: '5', department_name: 'Pediatrics' },
          { doctor_id: '99999999-9999-9999-9999-999999999999', doctor_name: 'Dr. Jennifer Lee', department_id: '10', department_name: 'Internal Medicine' },
          { doctor_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', doctor_name: 'Dr. Christopher Brown', department_id: '5', department_name: 'Pediatrics' },
          { doctor_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', doctor_name: 'Dr. Christopher Brown', department_id: '10', department_name: 'Internal Medicine' },
        ];
        setAssignments(mockAssignments);
      } catch (error) {
        console.error("Failed to load data", error);
        toast({
          title: "Failed to load data",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const handleRemoveAssignment = (doctorId: string, departmentId: string) => {
    setAssignments(prev => 
      prev.filter(assignment => 
        !(assignment.doctor_id === doctorId && assignment.department_id === departmentId)
      )
    );
    toast({
      title: "Assignment removed",
      description: "Doctor has been removed from the department",
    });
  };

  const getAssignmentsByDepartment = () => {
    const grouped = assignments.reduce((acc, assignment) => {
      if (!acc[assignment.department_name]) {
        acc[assignment.department_name] = [];
      }
      acc[assignment.department_name].push(assignment);
      return acc;
    }, {} as Record<string, DoctorAssignment[]>);
    
    return grouped;
  };

  const groupedAssignments = getAssignmentsByDepartment();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Doctor Assignments</h1>
              <p className="text-gray-600">Manage doctor department assignments</p>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Assignment
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading assignments...</div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {Object.entries(groupedAssignments).map(([departmentName, assignments]) => (
                <Card key={departmentName} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h2 className="text-lg font-semibold text-gray-900">{departmentName}</h2>
                      <Badge variant="secondary">{assignments.length} doctors</Badge>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {assignments.map((assignment) => (
                      <div 
                        key={`${assignment.doctor_id}-${assignment.department_id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{assignment.doctor_name}</p>
                            <p className="text-sm text-gray-500">Assigned to {assignment.department_name}</p>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveAssignment(assignment.doctor_id, assignment.department_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}

              {Object.keys(groupedAssignments).length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments</h3>
                  <p className="text-gray-500">No doctor assignments found.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default DoctorAssignmentsPage;
