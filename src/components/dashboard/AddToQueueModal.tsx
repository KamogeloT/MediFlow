import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import { addToQueue, AddToQueueData } from "@/lib/queue";
import { fetchDepartments, fetchDoctorsByDepartment, Department, Doctor } from "@/lib/departments";
import { searchPatients, type Patient } from "@/lib/appointments";
import { AlertTriangle, Clock, Building2, FileText, User, Search, Loader2 } from "lucide-react";

interface AddToQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string; // Optional now since we'll search for patients
  patientName?: string; // Optional now since we'll search for patients
  onSuccess?: () => void;
}

const AddToQueueModal = ({
  isOpen,
  onClose,
  patientId: initialPatientId,
  patientName: initialPatientName,
  onSuccess,
}: AddToQueueModalProps) => {
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [notes, setNotes] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  
  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState(initialPatientName || "");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    initialPatientId && initialPatientName ? { id: initialPatientId, full_name: initialPatientName } : null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  
  const { toast } = useToast();

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const depts = await fetchDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error("Failed to fetch departments", error);
        toast({
          title: "Failed to load departments",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    if (isOpen) {
      loadDepartments();
    }
  }, [isOpen, toast]);

  // Load doctors when department changes
  useEffect(() => {
    const loadDoctors = async () => {
      if (!departmentId) {
        setDoctors([]);
        setDoctorId("");
        return;
      }

      try {
        setIsLoadingDoctors(true);
        const doctorsList = await fetchDoctorsByDepartment(departmentId);
        setDoctors(doctorsList);
        setDoctorId(""); // Reset doctor selection
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

    if (departmentId) {
      loadDoctors();
    }
  }, [departmentId, toast]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!selectedPatient) {
        toast({
          title: "Patient required",
          description: "Please select a patient from the search results",
          variant: "destructive",
        });
        return;
      }

      const selectedDepartment = departments.find(d => d.id === departmentId);
      const selectedDoctor = doctors.find(d => d.id === doctorId);
      
      const queueData: AddToQueueData = {
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.full_name,
        priority,
        notes: notes.trim() || undefined,
        department_id: departmentId,
        doctor_id: doctorId === "none" ? undefined : doctorId || undefined,
      };

      await addToQueue(queueData);
      
      toast({
        title: "Patient added to queue",
        description: `${selectedPatient.full_name} has been added to the queue with ${priority} priority${selectedDepartment ? ` in ${selectedDepartment.name}` : ''}.`,
      });

      onSuccess?.();
      onClose();
      
      // Reset form
      setPriority("normal");
      setNotes("");
      setDepartmentId("");
      setDoctorId("");
      setSelectedPatient(null);
      setPatientSearchQuery("");
    } catch (error) {
      toast({
        title: "Failed to add to queue",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setPriority("normal");
    setNotes("");
    setDepartmentId("");
    setDoctorId("");
    setSelectedPatient(null);
    setPatientSearchQuery(initialPatientName || "");
    onClose();
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery(patient.full_name);
    setShowPatientSearch(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Add Patient to Queue
          </DialogTitle>
          <DialogDescription>
            Search for a patient and add them to the queue with priority level and department assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label htmlFor="priority" className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Priority Level
              </Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select priority" />
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
              <Label htmlFor="department" className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Department *
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={
                    isLoadingDepartments ? "Loading..." : "Select department"
                  } />
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

          {departmentId && (
            <div className="space-y-2">
              <Label htmlFor="doctor" className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Doctor (Optional)
              </Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={
                    isLoadingDoctors ? "Loading..." : "Select doctor (optional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific doctor</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any special notes, symptoms, or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={handleClose} className="h-10 px-6">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedPatient || !departmentId} 
              className="h-10 px-6"
            >
              {isSubmitting ? "Adding..." : "Add to Queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddToQueueModal;
