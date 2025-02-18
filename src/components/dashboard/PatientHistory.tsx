import React from "react";
import { Card } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { CalendarDays, Clock, FileText, Stethoscope } from "lucide-react";

interface Visit {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
  treatment: string;
  notes: string;
}

interface PatientHistoryProps {
  visits?: Visit[];
  patientName?: string;
}

const defaultVisits: Visit[] = [
  {
    id: "1",
    date: "2024-03-15",
    doctor: "Dr. Sarah Johnson",
    diagnosis: "Common Cold",
    treatment: "Rest and OTC medication",
    notes: "Patient presented with mild fever and congestion",
  },
  {
    id: "2",
    date: "2024-02-28",
    doctor: "Dr. Michael Chen",
    diagnosis: "Annual Check-up",
    treatment: "No treatment required",
    notes: "All vitals normal. Recommended regular exercise.",
  },
  {
    id: "3",
    date: "2024-01-10",
    doctor: "Dr. Sarah Johnson",
    diagnosis: "Migraine",
    treatment: "Prescribed pain medication",
    notes: "Follow-up in 2 weeks if symptoms persist",
  },
];

const PatientHistory = ({
  visits = defaultVisits,
  patientName = "John Doe",
}: PatientHistoryProps) => {
  return (
    <Card className="h-full w-full bg-white p-6">
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Patient History
          </h2>
          <p className="text-gray-500">{patientName}</p>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {visits.map((visit) => (
              <div key={visit.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{visit.date}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    <span>Past Visit</span>
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Stethoscope className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {visit.doctor}
                      </p>
                      <p className="text-sm text-gray-600">{visit.diagnosis}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Treatment
                      </p>
                      <p className="text-sm text-gray-600">{visit.treatment}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {visit.notes}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};

export default PatientHistory;
