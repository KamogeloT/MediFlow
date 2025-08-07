import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Clock, User, MapPin, Mail, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchDepartments, fetchDoctorsByDepartment, Department, Doctor } from "@/lib/departments";

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id?: string;
  doctor_name?: string;
  department?: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
}

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  // Department and Doctor state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

  // Mock data for now - replace with actual API call
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        // Mock appointments data
        const mockAppointments: Appointment[] = [
          {
            id: "1",
            patient_id: "p1",
            patient_name: "John Smith",
            doctor_id: "d1",
            doctor_name: "Dr. Sarah Johnson",
            department: "Cardiology",
            start_time: "2024-01-15T10:00:00Z",
            end_time: "2024-01-15T11:00:00Z",
            status: "confirmed",
            notes: "Follow-up appointment for heart condition",
            created_at: "2024-01-10T09:00:00Z"
          },
          {
            id: "2",
            patient_id: "p2",
            patient_name: "Maria Garcia",
            doctor_id: "d2",
            doctor_name: "Dr. Michael Chen",
            department: "Dermatology",
            start_time: "2024-01-15T14:30:00Z",
            end_time: "2024-01-15T15:30:00Z",
            status: "scheduled",
            notes: "Skin condition evaluation",
            created_at: "2024-01-12T11:00:00Z"
          },
          {
            id: "3",
            patient_id: "p3",
            patient_name: "Robert Wilson",
            doctor_id: "d3",
            doctor_name: "Dr. Emily Davis",
            department: "Neurology",
            start_time: "2024-01-16T09:00:00Z",
            end_time: "2024-01-16T10:00:00Z",
            status: "in-progress",
            notes: "Neurological examination",
            created_at: "2024-01-08T14:00:00Z"
          }
        ];
        
        setAppointments(mockAppointments);
      } catch (error) {
        console.error("Failed to fetch appointments", error);
        toast({
          title: "Failed to load appointments",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, [toast]);

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const depts = await fetchDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error("Failed to fetch departments", error);
        toast({
          title: "Failed to load departments",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    };

    loadDepartments();
  }, [toast]);

  // Load doctors when department changes
  useEffect(() => {
    const loadDoctors = async () => {
      if (!selectedDepartmentId) {
        setDoctors([]);
        return;
      }

      try {
        setIsLoadingDoctors(true);
        const doctorsList = await fetchDoctorsByDepartment(selectedDepartmentId);
        setDoctors(doctorsList);
      } catch (error) {
        console.error("Failed to fetch doctors", error);
        toast({
          title: "Failed to load doctors",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, [selectedDepartmentId, toast]);

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "confirmed":
        return "bg-green-50 text-green-700 border-green-200";
      case "in-progress":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "completed":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: Appointment["status"]) => {
    try {
      // TODO: Implement actual API call
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );
      
      toast({
        title: "Appointment updated",
        description: `Status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Failed to update appointment",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time);
    const today = new Date();
    return aptDate > today && aptDate.toDateString() !== today.toDateString();
  });

  // --- New Appointment Modal Logic ---
  const [form, setForm] = useState({
    patient_name: "",
    doctor_id: "",
    department_id: "",
    start_time: "",
    end_time: "",
    notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setForm(prev => ({ ...prev, department_id: departmentId, doctor_id: "" }));
  };

  const handleDoctorChange = (doctorId: string) => {
    setForm(prev => ({ ...prev, doctor_id: doctorId }));
  };

  const handleNewAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);

    const selectedDepartment = departments.find(d => d.id === form.department_id);
    const selectedDoctor = doctors.find(d => d.id === form.doctor_id);

    // Add to appointments (mock)
    setAppointments(prev => [
      {
        id: (Math.random() * 100000).toFixed(0),
        patient_id: "mock",
        patient_name: form.patient_name,
        doctor_id: form.doctor_id,
        doctor_name: selectedDoctor?.full_name || "",
        department: selectedDepartment?.name || "",
        start_time: form.start_time,
        end_time: form.end_time,
        status: "scheduled",
        notes: form.notes,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    setShowModal(false);
    setForm({
      patient_name: "",
      doctor_id: "",
      department_id: "",
      start_time: "",
      end_time: "",
      notes: "",
    });
    setSelectedDepartmentId("");
    setFormSubmitting(false);
    
    toast({
      title: "Appointment created",
      description: `New appointment for ${form.patient_name}`,
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
              <p className="text-gray-600">Manage patient appointments and schedules</p>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowModal(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* New Appointment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNewAppointment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient_name">Patient Name</Label>
              <Input
                id="patient_name"
                name="patient_name"
                value={form.patient_name}
                onChange={handleFormChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={form.department_id} onValueChange={handleDepartmentChange}>
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
              
              <div className="space-y-2">
                <Label htmlFor="doctor">Doctor</Label>
                <Select 
                  value={form.doctor_id} 
                  onValueChange={handleDoctorChange}
                  disabled={!selectedDepartmentId || isLoadingDoctors}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedDepartmentId 
                        ? "Select department first" 
                        : isLoadingDoctors 
                          ? "Loading doctors..." 
                          : "Select doctor"
                    } />
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  value={form.start_time}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  value={form.end_time}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleFormChange}
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? "Creating..." : "Create Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading appointments...</div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Today's Appointments */}
              {todayAppointments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Today's Appointments ({todayAppointments.length})
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    {todayAppointments.map((appointment) => (
                      <Card key={appointment.id} className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12 bg-blue-100">
                              <User className="w-6 h-6 text-blue-600" />
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {appointment.patient_name}
                                </h3>
                                <Badge 
                                  variant="outline" 
                                  className={`${getStatusColor(appointment.status)}`}
                                >
                                  {appointment.status.replace("-", " ")}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{appointment.department || "General"}</span>
                                </div>
                                {appointment.doctor_name && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>{appointment.doctor_name}</span>
                                  </div>
                                )}
                              </div>
                              
                              {appointment.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700">{appointment.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {appointment.status === "scheduled" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusUpdate(appointment.id, "confirmed")}
                              >
                                Confirm
                              </Button>
                            )}
                            {appointment.status === "confirmed" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusUpdate(appointment.id, "in-progress")}
                              >
                                Start
                              </Button>
                            )}
                            {appointment.status === "in-progress" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleStatusUpdate(appointment.id, "completed")}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Appointments */}
              {upcomingAppointments.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Upcoming Appointments ({upcomingAppointments.length})
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    {upcomingAppointments.map((appointment) => (
                      <Card key={appointment.id} className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-12 h-12 bg-gray-100">
                              <User className="w-6 h-6 text-gray-600" />
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {appointment.patient_name}
                                </h3>
                                <Badge 
                                  variant="outline" 
                                  className={`${getStatusColor(appointment.status)}`}
                                >
                                  {appointment.status.replace("-", " ")}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatDateTime(appointment.start_time)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{appointment.department || "General"}</span>
                                </div>
                                {appointment.doctor_name && (
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>{appointment.doctor_name}</span>
                                  </div>
                                )}
                              </div>
                              
                              {appointment.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700">{appointment.notes}</p>
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

              {appointments.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments</h3>
                  <p className="text-gray-500">No appointments scheduled at this time.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default AppointmentsPage;
