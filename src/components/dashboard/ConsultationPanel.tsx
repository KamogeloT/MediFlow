import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, FileText, Stethoscope, Pill, Save } from "lucide-react";

interface ConsultationPanelProps {
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  currentVisitReason?: string;
}

const ConsultationPanel = ({
  patientName = "John Doe",
  patientAge = 45,
  patientGender = "Male",
  currentVisitReason = "Regular checkup",
}: ConsultationPanelProps) => {
  return (
    <div className="h-full w-full bg-white p-4">
      <Card className="h-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">{patientName}</h2>
              <p className="text-gray-600">
                {patientAge} years • {patientGender}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="text-gray-500">Visit Duration: 15:00</span>
            </div>
          </div>

          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="notes">
                <FileText className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="examination">
                <Stethoscope className="h-4 w-4 mr-2" />
                Examination
              </TabsTrigger>
              <TabsTrigger value="diagnosis">
                <FileText className="h-4 w-4 mr-2" />
                Diagnosis
              </TabsTrigger>
              <TabsTrigger value="prescription">
                <Pill className="h-4 w-4 mr-2" />
                Prescription
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-300px)]">
              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Reason for Visit</Label>
                    <Input defaultValue={currentVisitReason} className="mt-2" />
                  </div>
                  <div>
                    <Label>Consultation Notes</Label>
                    <Textarea
                      placeholder="Enter detailed consultation notes here..."
                      className="mt-2 h-[200px]"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="examination" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Vital Signs</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Input placeholder="Blood Pressure" />
                      <Input placeholder="Heart Rate" />
                      <Input placeholder="Temperature" />
                      <Input placeholder="Respiratory Rate" />
                    </div>
                  </div>
                  <div>
                    <Label>Physical Examination</Label>
                    <Textarea
                      placeholder="Enter physical examination findings..."
                      className="mt-2 h-[200px]"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="diagnosis" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Primary Diagnosis</Label>
                    <Input
                      placeholder="Enter primary diagnosis"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Secondary Diagnoses</Label>
                    <Textarea
                      placeholder="Enter any secondary diagnoses..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Additional diagnostic notes..."
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="prescription" className="space-y-4">
                <div className="space-y-4">
                  <div className="border p-4 rounded-lg">
                    <Label>Medication 1</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Input placeholder="Medication Name" />
                      <Input placeholder="Dosage" />
                      <Input placeholder="Frequency" />
                      <Input placeholder="Duration" />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    + Add Another Medication
                  </Button>
                  <Separator />
                  <div>
                    <Label>Special Instructions</Label>
                    <Textarea
                      placeholder="Enter any special instructions or precautions..."
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end mt-6 gap-4">
            <Button variant="outline">Cancel</Button>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Consultation
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConsultationPanel;
