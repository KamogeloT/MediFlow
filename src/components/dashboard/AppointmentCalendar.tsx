import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Clock } from "lucide-react";

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
}

interface AppointmentCalendarProps {
  appointments?: Appointment[];
  onAddAppointment?: (appointment: Omit<Appointment, "id">) => void;
}

const AppointmentCalendar = ({
  appointments = [
    { id: "1", patientName: "John Doe", time: "09:00", type: "Check-up" },
    { id: "2", patientName: "Jane Smith", time: "10:30", type: "Follow-up" },
    {
      id: "3",
      patientName: "Mike Johnson",
      time: "14:00",
      type: "Consultation",
    },
  ],
  onAddAppointment = () => {},
}: AppointmentCalendarProps) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = React.useState(true);

  return (
    <div className="p-6 bg-white w-full h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Appointment Calendar</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Patient Name</Label>
                <Input id="name" placeholder="Enter patient name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Appointment Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkup">Check-up</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6">
        <Card className="p-4 flex-1">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
          />
        </Card>

        <Card className="p-4 flex-1">
          <h3 className="text-lg font-medium mb-4">
            Appointments for {date?.toLocaleDateString()}
          </h3>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-3 mb-2 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="text-sm text-gray-500">{appointment.type}</p>
                </div>
                <div className="flex items-center text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{appointment.time}</span>
                </div>
              </div>
            ))}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentCalendar;
