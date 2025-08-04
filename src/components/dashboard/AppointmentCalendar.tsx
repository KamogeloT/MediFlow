import React, { useEffect, useState } from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  subscribeToAppointments,
  updateAppointment,
  Appointment,
} from "@/lib/appointments";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const locales = {
  "en-US": enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patient_id?: string;
  doctor_id?: string | null;
  department?: string | null;
}

const departmentColors: Record<string, string> = {
  cardiology: "#f87171",
  neurology: "#60a5fa",
  orthopedics: "#34d399",
};

const toCalendarEvent = (a: Appointment): CalendarEvent => ({
  id: a.id,
  title: a.patient_name || "Appointment",
  start: new Date(a.start_time),
  end: new Date(a.end_time),
  patient_id: a.patient_id,
  doctor_id: a.doctor_id,
  department: a.department,
});

const AppointmentCalendar: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{
    id?: string;
    patient_id: string;
    department: string;
    start: Date;
    end: Date;
  }>({
    patient_id: "",
    department: "",
    start: new Date(),
    end: new Date(),
  });

  useEffect(() => {
    const load = async () => {
      const apps = await fetchAppointments();
      setEvents(apps.map(toCalendarEvent));
      const { data } = await supabase
        .from("patients")
        .select("id, full_name")
        .order("full_name");
      setPatients(data ?? []);
    };
    load();
    const unsub = subscribeToAppointments(() => load());
    return () => {
      unsub();
    };
  }, []);

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setForm({ patient_id: "", department: "", start, end });
    setDialogOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setForm({
      id: event.id,
      patient_id: event.patient_id || "",
      department: event.department || "",
      start: event.start,
      end: event.end,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      patient_id: form.patient_id,
      doctor_id: user?.id ?? null,
      department: form.department,
      start_time: form.start.toISOString(),
      end_time: form.end.toISOString(),
      status: "scheduled",
    };
    if (form.id) {
      await updateAppointment(form.id, payload);
    } else {
      await createAppointment(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!form.id) return;
    await deleteAppointment(form.id);
    setDialogOpen(false);
  };

  const eventPropGetter = (event: CalendarEvent) => {
    const backgroundColor = event.department
      ? departmentColors[event.department] || "#3174ad"
      : "#3174ad";
    return { style: { backgroundColor } };
  };

  return (
    <div className="p-6 bg-white w-full h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Appointment Calendar</h2>
        <Button
          onClick={() => {
            setForm({
              patient_id: "",
              department: "",
              start: new Date(),
              end: new Date(new Date().getTime() + 30 * 60000),
            });
            setDialogOpen(true);
          }}
        >
          New Appointment
        </Button>
      </div>
      <BigCalendar
        localizer={localizer}
        events={events}
        selectable
        style={{ height: 500 }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventPropGetter}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit" : "New"} Appointment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="patient">Patient</Label>
              <Select
                value={form.patient_id}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, patient_id: v }))
                }
              >
                <SelectTrigger id="patient">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={form.department}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, department: v }))
                }
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                  <SelectItem value="neurology">Neurology</SelectItem>
                  <SelectItem value="orthopedics">Orthopedics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="datetime-local"
                value={format(form.start, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    start: new Date(e.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="datetime-local"
                value={format(form.end, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    end: new Date(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            {form.id && (
              <Button variant="destructive" onClick={handleDelete}>
                Cancel Appointment
              </Button>
            )}
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentCalendar;

