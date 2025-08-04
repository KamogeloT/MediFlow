import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";
import { fetchAppointments, Appointment } from "@/lib/appointments";
import { format } from "date-fns";

const UpcomingAppointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const load = async () => {
      const all = await fetchAppointments();
      const upcoming = all
        .filter(
          (a) =>
            a.doctor_id === user?.id && new Date(a.start_time) > new Date(),
        )
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        )
        .slice(0, 5);
      setAppointments(upcoming);
    };
    if (user) {
      load();
    }
  }, [user]);

  return (
    <Card className="w-full bg-white p-4" id="appointments">
      <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
      <ScrollArea className="h-60">
        <ul className="space-y-2">
          {appointments.map((a) => (
            <li key={a.id} className="flex justify-between text-sm">
              <span>{a.patient_name}</span>
              <span>{format(new Date(a.start_time), "PP p")}</span>
            </li>
          ))}
          {appointments.length === 0 && (
            <p className="text-sm text-gray-500">No upcoming appointments</p>
          )}
        </ul>
      </ScrollArea>
    </Card>
  );
};

export default UpcomingAppointments;
