import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Building2, 
  UserPlus, 
  Settings,
  Plus,
  X,
  RefreshCw
} from "lucide-react";
import { fetchDepartments, fetchAllDoctors, Department, Doctor } from "@/lib/departments";
import { supabase } from "@/lib/supabase";

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Load departments, doctors, and assignments
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [depts, docs] = await Promise.all([
        fetchDepartments(),
        fetchAllDoctors()
      ]);
      setDepartments(depts);
      setDoctors(docs);
      
      // Create assignments from doctors who have departments
      const doctorAssignments: DoctorAssignment[] = docs
        .filter(doctor => doctor.department_id)
        .map(doctor => {
          const department = depts.find(dept => dept.id === doctor.department_id);
          return {
            doctor_id: doctor.id,
            doctor_name: doctor.full_name,
            department_id: doctor.department_id!,
            department_name: department?.name || "Unknown Department",
          };
        });

      setAssignments(doctorAssignments);
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
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemoveAssignment = async (doctorId: string, departmentId: string) => {
    try {
      // Remove department assignment by setting departmentID to null
      const { error } = await supabase
        .from("profiles")
        .update({ departmentID: null })
        .eq("id", doctorId)
        .eq("departmentID", departmentId);

      if (error) {
        toast({
          title: "Failed to remove assignment",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setAssignments(prev => 
        prev.filter(assignment => 
          !(assignment.doctor_id === doctorId && assignment.department_id === departmentId)
        )
      );
      
      toast({
        title: "Assignment removed",
        description: "Doctor has been removed from the department",
      });
    } catch (error) {
      toast({
        title: "Failed to remove assignment",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedDoctor || !selectedDepartment) {
      toast({
        title: "Missing information",
        description: "Please select both a doctor and a department",
        variant: "destructive",
      });
      return;
    }

    // Check if assignment already exists
    const existingAssignment = assignments.find(
      assignment => assignment.doctor_id === selectedDoctor && assignment.department_id === selectedDepartment
    );

    if (existingAssignment) {
      toast({
        title: "Assignment already exists",
        description: "This doctor is already assigned to this department",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAdding(true);
      // Update the doctor's department assignment
      const { error } = await supabase
        .from("profiles")
        .update({ departmentID: selectedDepartment })
        .eq("id", selectedDoctor);

      if (error) {
        toast({
          title: "Failed to add assignment",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Add to local state
      const doctor = doctors.find(d => d.id === selectedDoctor);
      const department = departments.find(d => d.id === selectedDepartment);
      
      if (doctor && department) {
        const newAssignment: DoctorAssignment = {
          doctor_id: selectedDoctor,
          doctor_name: doctor.full_name,
          department_id: selectedDepartment,
          department_name: department.name,
        };
        
        setAssignments(prev => [...prev, newAssignment]);
      }

      toast({
        title: "Assignment added",
        description: "Doctor has been assigned to the department",
      });

      // Reset form and close modal
      setSelectedDoctor("");
      setSelectedDepartment("");
      setIsAddModalOpen(false);
    } catch (error) {
      toast({
        title: "Failed to add assignment",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Assignment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Doctor to Department</DialogTitle>
                  <p className="text-sm text-gray-600">
                    Assign a doctor to work in a specific department.
                  </p>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Doctor</Label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
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

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                      disabled={isAdding}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddAssignment}
                      disabled={isAdding || !selectedDoctor || !selectedDepartment}
                    >
                      {isAdding ? "Adding..." : "Add Assignment"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
