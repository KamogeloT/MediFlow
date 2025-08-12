import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Clock, User, MapPin, Mail, X, Plus, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchDepartments, fetchDoctorsByDepartment, Department, Doctor } from "@/lib/departments";
import { 
  fetchAppointmentsByDoctor, 
  fetchAllAppointments, 
  createAppointment, 
  updateAppointmentStatus,
  deleteAppointment,
  checkAppointmentConflicts,
  searchPatients,
  getPatientById,
  syncAppointmentsWithQueue,
  type Appointment,
  type CreateAppointmentData,
  type Patient
} from "@/lib/appointments";
import { useAuth } from "@/lib/auth";

const AppointmentsPage = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  // Department and Doctor state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    start_time: "",
    end_time: "",
    notes: "",
  });

  // Load appointments based on user role
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        
        if (user?.user_metadata?.role === "doctor") {
          // Doctor sees only their appointments
          const doctorAppointments = await fetchAppointmentsByDoctor(user.id);
          setAppointments(doctorAppointments);
        } else {
          // Front desk sees all appointments
          const allAppointments = await fetchAllAppointments();
          setAppointments(allAppointments);
        }
      } catch (error) {
        console.error("Failed to load appointments", error);
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
  }, [user, toast]);

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

    if (selectedDepartmentId) {
      loadDoctors();
    }
  }, [selectedDepartmentId, toast]);

  // Search patients when query changes
  useEffect(() => {
    const searchPatientsDebounced = setTimeout(async () => {
      if (patientSearchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const results = await searchPatients(patientSearchQuery.trim());
        setSearchResults(results);
      } catch (error) {
        console.error("Failed to search patients", error);
        toast({
          title: "Failed to search patients",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchPatientsDebounced);
  }, [patientSearchQuery, toast]);

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
      await updateAppointmentStatus(appointmentId, newStatus);
      
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setFormData(prev => ({ ...prev, start_time: "", end_time: "", notes: "" }));
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery(patient.full_name);
    setShowPatientSearch(false);
  };

  const handleNewAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient || !selectedDepartmentId || !formData.start_time || !formData.end_time) {
      toast({
        title: "Missing information",
        description: "Please select a patient, department, and set appointment times",
        variant: "destructive",
      });
      return;
    }

    // Validate time format and logic
    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);
    const now = new Date();

    console.log('Time validation:', {
      startTime: formData.start_time,
      endTime: formData.end_time,
      startTimeObj: startTime,
      endTimeObj: endTime,
      now: now,
      startIsValid: !isNaN(startTime.getTime()),
      endIsValid: !isNaN(endTime.getTime()),
      startIsFuture: startTime > now,
      endIsAfterStart: endTime > startTime
    });

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      toast({
        title: "Invalid time format",
        description: "Please select valid start and end times",
        variant: "destructive",
      });
      return;
    }

    if (startTime <= now) {
      toast({
        title: "Invalid start time",
        description: "Start time must be in the future",
        variant: "destructive",
      });
      return;
    }

    if (endTime <= startTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, assign to first available doctor in department
      const availableDoctors = doctors.filter(d => d.department_id === selectedDepartmentId);
      if (availableDoctors.length === 0) {
        toast({
          title: "No doctors available",
          description: "No doctors are assigned to this department",
          variant: "destructive",
        });
        return;
      }

      const selectedDoctor = availableDoctors[0];
      console.log('Selected doctor for appointment:', selectedDoctor);

      // Check for appointment conflicts
      console.log('Checking conflicts for:', {
        doctorId: selectedDoctor.id,
        startTime: formData.start_time,
        endTime: formData.end_time
      });

      const hasConflict = await checkAppointmentConflicts(
        selectedDoctor.id,
        formData.start_time,
        formData.end_time
      );

      if (hasConflict) {
        toast({
          title: "Appointment conflict",
          description: "The selected time conflicts with an existing appointment. Please choose a different time.",
          variant: "destructive",
        });
        return;
      }

      const appointmentData: CreateAppointmentData = {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.full_name,
        doctor_id: selectedDoctor.id,
        department_id: selectedDepartmentId,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
      };

      console.log('Creating appointment with data:', appointmentData);

      const newAppointment = await createAppointment(appointmentData);
      
      setAppointments(prev => [newAppointment, ...prev]);
      
      toast({
        title: "Appointment created",
        description: `Appointment scheduled for ${selectedPatient.full_name}. Patient has been added to the queue.`,
      });

      // Reset form and close modal
      setFormData({
        start_time: "",
        end_time: "",
        notes: "",
      });
      setSelectedPatient(null);
      setPatientSearchQuery("");
      setSelectedDepartmentId("");
      setShowModal(false);
    } catch (error) {
      console.error('Failed to create appointment:', error);
      toast({
        title: "Failed to create appointment",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
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
    return aptDate > today;
  });

  const isDoctor = user?.user_metadata?.role === "doctor";

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isDoctor ? "My Appointments" : "All Appointments"}
              </h1>
              <p className="text-gray-600">
                {isDoctor 
                  ? "View and manage your scheduled appointments" 
                  : "Manage all appointments across all departments"
                }
              </p>
            </div>
          </div>
                     <div className="flex gap-2">
             {!isDoctor && (
               <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
                 <Plus className="w-4 h-4 mr-2" />
                 New Appointment
               </Button>
             )}
             <Button 
               onClick={async () => {
                 try {
                   await syncAppointmentsWithQueue();
                   toast({
                     title: "Queue synced",
                     description: "Existing appointments have been added to the queue",
                   });
                   // Reload appointments to refresh the view
                   window.location.reload();
                 } catch (error) {
                   toast({
                     title: "Sync failed",
                     description: (error as Error).message,
                     variant: "destructive",
                   });
                 }
               }}
               variant="outline"
               className="text-sm"
             >
               Sync Queue
             </Button>
           </div>
        </div>
      </div>

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
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Appointments</h2>
                {todayAppointments.length > 0 ? (
                  <div className="grid gap-4">
                    {todayAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onStatusUpdate={handleStatusUpdate}
                        isDoctor={isDoctor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No appointments scheduled for today
                  </div>
                )}
              </div>

              {/* Upcoming Appointments */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
                {upcomingAppointments.length > 0 ? (
                  <div className="grid gap-4">
                    {upcomingAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onStatusUpdate={handleStatusUpdate}
                        isDoctor={isDoctor}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No upcoming appointments
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* New Appointment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment by selecting a patient, department, and time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewAppointment} className="space-y-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              <Popover open={showPatientSearch} onOpenChange={setShowPatientSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={showPatientSearch}
                    className="w-full justify-between"
                  >
                    {selectedPatient ? selectedPatient.full_name : "Search for a patient..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search patients by name, email, or phone..."
                      value={patientSearchQuery}
                      onValueChange={setPatientSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isSearching ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Searching...
                          </div>
                        ) : (
                          "No patients found."
                        )}
                      </CommandEmpty>
                      <CommandGroup>
                        {searchResults.map((patient) => (
                          <CommandItem
                            key={patient.id}
                            onSelect={() => handlePatientSelect(patient)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{patient.full_name}</span>
                              {patient.email && (
                                <span className="text-sm text-gray-500">{patient.email}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedPatient && (
                <div className="text-sm text-gray-600">
                  Selected: {selectedPatient.full_name}
                  {selectedPatient.email && ` • ${selectedPatient.email}`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select value={selectedDepartmentId} onValueChange={handleDepartmentChange}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={handleFormChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  value={formData.end_time}
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
                value={formData.notes}
                onChange={handleFormChange}
                placeholder="Add appointment notes..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedPatient || !selectedDepartmentId}>
                Create Appointment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Appointment Card Component
const AppointmentCard = ({ 
  appointment, 
  onStatusUpdate, 
  isDoctor 
}: { 
  appointment: Appointment; 
  onStatusUpdate: (id: string, status: Appointment["status"]) => void;
  isDoctor: boolean;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (newStatus: Appointment["status"]) => {
    setIsUpdating(true);
    await onStatusUpdate(appointment.id, newStatus);
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
              <h3 className="font-semibold text-gray-900">{appointment.patient_name}</h3>
              <p className="text-sm text-gray-500">
                {appointment.doctor_name && `Dr. ${appointment.doctor_name}`}
                {appointment.department_name && ` • ${appointment.department_name}`}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDateTime(appointment.start_time)}</span>
            </div>
          </div>
          
          {appointment.notes && (
            <p className="text-sm text-gray-600 mt-2">{appointment.notes}</p>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge className={getStatusColor(appointment.status)}>
            {appointment.status.replace('-', ' ')}
          </Badge>
          
          {!isDoctor && (
            <Select 
              value={appointment.status} 
              onValueChange={(value: Appointment["status"]) => handleStatusChange(value)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentsPage;
