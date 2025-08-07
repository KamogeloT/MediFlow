import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import { useToast } from "@/components/ui/use-toast";
import { addToQueue, AddToQueueData } from "@/lib/queue";
import { fetchDepartments, Department } from "@/lib/departments";
import { AlertTriangle, Clock, Building2, FileText } from "lucide-react";

interface AddToQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
}

const AddToQueueModal = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onSuccess,
}: AddToQueueModalProps) => {
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [notes, setNotes] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedDepartment = departments.find(d => d.id === departmentId);
      
      const queueData: AddToQueueData = {
        patient_id: patientId,
        priority,
        notes: notes.trim() || undefined,
        department: selectedDepartment?.name || undefined,
      };

      await addToQueue(queueData);
      
      toast({
        title: "Patient added to queue",
        description: `${patientName} has been added to the queue with ${priority} priority.`,
      });

      onSuccess?.();
      onClose();
      
      setPriority("normal");
      setNotes("");
      setDepartmentId("");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Add {patientName} to Queue
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
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
                Department
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={
                    isLoadingDepartments ? "Loading..." : "Select department"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-6">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-10 px-6">
              {isSubmitting ? "Adding..." : "Add to Queue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddToQueueModal;
