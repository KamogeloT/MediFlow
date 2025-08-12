import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createPatient } from "@/lib/patients";
import { notify } from "@/lib/notifications";
import { addToQueue } from "@/lib/queue";
import { User, Phone, Mail, MapPin, Calendar, Heart, Shield, Plus, Clock } from "lucide-react";

interface PatientRegistrationProps {
  onSubmit?: (data: any) => void;
  initialData?: any;
  isEdit?: boolean;
}

const PatientRegistration = ({
  onSubmit = () => {},
  initialData = {},
  isEdit = false,
}: PatientRegistrationProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [addToQueueEnabled, setAddToQueueEnabled] = useState(false);
  const [queueData, setQueueData] = useState({
    departmentId: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    notes: "",
  });

  // Load departments when component mounts
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { fetchDepartments } = await import('@/lib/departments');
        const depts = await fetchDepartments();
        setDepartments(depts);
        if (depts.length > 0) {
          setQueueData(prev => ({ ...prev, departmentId: depts[0].id }));
        }
      } catch (error) {
        console.error("Failed to load departments", error);
      }
    };
    
    loadDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const firstName = (formData.get("firstName") as string) || "";
      const lastName = (formData.get("lastName") as string) || "";
      const full_name = `${firstName} ${lastName}`.trim();
      
      // Create the patient
      const patient = await createPatient({ full_name });
      
      // If add to queue is enabled, add them to the queue
      if (addToQueueEnabled && queueData.departmentId) {
        try {
          await addToQueue({
            patient_id: patient.id,
            patient_name: patient.full_name,
            priority: queueData.priority,
            department_id: queueData.departmentId,
            notes: queueData.notes.trim() || undefined,
            is_walk_in: true,
          });
          
          toast({
            title: "Patient registered and added to queue",
            description: `${full_name} has been registered and added to the queue.`,
          });
        } catch (queueError) {
          const errorMessage = (queueError as Error).message;
          
          // Check if it's an authentication error
          if (errorMessage.includes("Authentication required")) {
            toast({
              title: "Session expired",
              description: "Please log in again to add patients to the queue.",
              variant: "destructive",
            });
            // Don't reset the form, let user try again after re-authentication
            return;
          }
          
          // Patient was created but queue addition failed for other reasons
          toast({
            title: "Patient registered but queue addition failed",
            description: `${full_name} was registered but could not be added to the queue: ${errorMessage}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Patient registered successfully",
          description: `${full_name} has been added to the system.`,
        });
      }
      
      notify("New patient registered", { body: full_name });
      onSubmit(patient);
      
      // Reset form and queue data
      const form = document.querySelector('form');
      if (form) form.reset();
      setAddToQueueEnabled(false);
      setQueueData({
        departmentId: departments.length > 0 ? departments[0].id : "",
        priority: "normal",
        notes: "",
      });
      
    } catch (error) {
      toast({
        title: "Registration failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <>
      <div className="h-full flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <Tabs defaultValue="personal" className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Info
                </TabsTrigger>
                <TabsTrigger value="medical" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Medical History
                </TabsTrigger>
                <TabsTrigger value="emergency" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Emergency Contact
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="personal" className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      defaultValue={initialData.firstName}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      defaultValue={initialData.lastName}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date of Birth
                    </Label>
                    <Input 
                      id="dob" 
                      type="date" 
                      defaultValue={initialData.dob}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gender</Label>
                    <RadioGroup
                      defaultValue={initialData.gender || "male"}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="text-sm">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="text-sm">Female</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other" className="text-sm">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter full address"
                    defaultValue={initialData.address}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      defaultValue={initialData.phone}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      defaultValue={initialData.email}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Queue Integration Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">Queue Management</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="addToQueue"
                        checked={addToQueueEnabled}
                        onChange={(e) => setAddToQueueEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="addToQueue" className="text-sm font-medium">
                        Add patient to queue after registration
                      </Label>
                    </div>

                    {addToQueueEnabled && (
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="queueDepartment" className="text-sm font-medium">Department *</Label>
                            <Select 
                              value={queueData.departmentId} 
                              onValueChange={(value) => setQueueData(prev => ({ ...prev, departmentId: value }))}
                            >
                              <SelectTrigger className="h-10">
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

                          <div className="space-y-2">
                            <Label htmlFor="queuePriority" className="text-sm font-medium">Priority Level</Label>
                            <Select 
                              value={queueData.priority} 
                              onValueChange={(value: any) => setQueueData(prev => ({ ...prev, priority: value }))}
                            >
                              <SelectTrigger className="h-10">
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
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="queueNotes" className="text-sm font-medium">Queue Notes (Optional)</Label>
                          <Textarea
                            id="queueNotes"
                            value={queueData.notes}
                            onChange={(e) => setQueueData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Add any relevant notes for the queue..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="text-sm font-medium">Known Allergies</Label>
                  <Textarea
                    id="allergies"
                    placeholder="List any known allergies (e.g., penicillin, latex, etc.)"
                    defaultValue={initialData.allergies}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications" className="text-sm font-medium">Current Medications</Label>
                  <Textarea
                    id="medications"
                    placeholder="List current medications with dosages"
                    defaultValue={initialData.medications}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodType" className="text-sm font-medium">Blood Type</Label>
                  <Select defaultValue={initialData.bloodType || "unknown"}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="a+">A+</SelectItem>
                      <SelectItem value="a-">A-</SelectItem>
                      <SelectItem value="b+">B+</SelectItem>
                      <SelectItem value="b-">B-</SelectItem>
                      <SelectItem value="ab+">AB+</SelectItem>
                      <SelectItem value="ab-">AB-</SelectItem>
                      <SelectItem value="o+">O+</SelectItem>
                      <SelectItem value="o-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName" className="text-sm font-medium">Emergency Contact Name</Label>
                    <Input
                      id="emergencyName"
                      placeholder="Jane Doe"
                      defaultValue={initialData.emergencyName}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyRelation" className="text-sm font-medium">Relationship</Label>
                    <Input
                      id="emergencyRelation"
                      placeholder="Spouse"
                      defaultValue={initialData.emergencyRelation}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Emergency Contact Phone
                  </Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    defaultValue={initialData.emergencyPhone}
                    className="h-10"
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {addToQueueEnabled && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span>Patient will be added to queue after registration</span>
                </div>
              )}
              <div className="flex space-x-3">
                <Button type="button" variant="outline" className="h-10 px-6">
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-6" disabled={isLoading}>
                  {isLoading ? "Processing..." : (isEdit ? "Update Patient" : "Register Patient")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

    </>
  );
};

export default PatientRegistration;
