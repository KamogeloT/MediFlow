import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Weight, 
  AlertTriangle, 
  Stethoscope,
  Users,
  Clock,
  FileText,
  Plus,
  Eye,
  Edit
} from "lucide-react";

interface PatientVitals {
  id?: string;
  patient_id: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  pain_level?: number;
  notes?: string;
  is_abnormal?: boolean;
  abnormal_notes?: string;
}

interface PatientAllergy {
  id?: string;
  patient_id: string;
  allergy_type: 'medication' | 'food' | 'environmental' | 'latex' | 'other';
  allergen_name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reaction_description?: string;
  onset_date?: string;
  last_reaction_date?: string;
  management_plan?: string;
  emergency_medication?: string;
  notes?: string;
}

interface NurseNote {
  id?: string;
  patient_id: string;
  note_type: 'vital_signs' | 'patient_assessment' | 'medication_administration' | 'patient_education' | 'care_coordination' | 'symptom_observation' | 'treatment_response' | 'discharge_planning' | 'other';
  note_title: string;
  note_content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_flagged?: boolean;
  flag_reason?: string;
}

interface PatientOverview {
  patient_id: string;
  full_name: string;
  date_of_birth: string;
  address: string;
  email: string;
  phone: string;
  blood_type: string;
  medical_history: string;
  current_medications: string;
  allergies: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  last_vitals_date: string;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  temperature: number;
  oxygen_saturation: number;
  vitals_abnormal: boolean;
  current_queue_status: string;
  current_priority: string;
  department_name: string;
  queued_at: string;
  latest_note_title: string;
  latest_note_date: string;
  latest_note_priority: string;
}

const NurseDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientOverview[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Form states
  const [vitalsForm, setVitalsForm] = useState<PatientVitals>({
    patient_id: "",
    blood_pressure_systolic: undefined,
    blood_pressure_diastolic: undefined,
    heart_rate: undefined,
    temperature: undefined,
    respiratory_rate: undefined,
    oxygen_saturation: undefined,
    weight_kg: undefined,
    height_cm: undefined,
    pain_level: undefined,
    notes: "",
  });

  const [allergyForm, setAllergyForm] = useState<PatientAllergy>({
    patient_id: "",
    allergy_type: 'medication',
    allergen_name: "",
    severity: 'mild',
    reaction_description: "",
    management_plan: "",
    emergency_medication: "",
    notes: "",
  });

  const [noteForm, setNoteForm] = useState<NurseNote>({
    patient_id: "",
    note_type: 'patient_assessment',
    note_title: "",
    note_content: "",
    priority: 'normal',
  });

  useEffect(() => {
    if (user) {
      loadPatients();
    }
  }, [user]);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('nurse_patient_overview')
        .select('*')
        .order('current_priority', { ascending: true })
        .order('queued_at', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const vitalsData = {
        ...vitalsForm,
        patient_id: selectedPatient.patient_id,
        recorded_by: user?.id,
      };

      // Calculate BMI if weight and height are provided
      if (vitalsData.weight_kg && vitalsData.height_cm) {
        vitalsData.bmi = Number(((vitalsData.weight_kg / Math.pow(vitalsData.height_cm / 100, 2))).toFixed(2));
      }

      // Check if vitals are abnormal
      vitalsData.is_abnormal = checkVitalsAbnormal(vitalsData);

      const { error } = await supabase
        .from('patient_vitals')
        .insert([vitalsData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vitals recorded successfully",
      });

      // Reset form and reload patients
      setVitalsForm({
        patient_id: "",
        blood_pressure_systolic: undefined,
        blood_pressure_diastolic: undefined,
        heart_rate: undefined,
        temperature: undefined,
        respiratory_rate: undefined,
        oxygen_saturation: undefined,
        weight_kg: undefined,
        height_cm: undefined,
        pain_level: undefined,
        notes: "",
      });
      loadPatients();
    } catch (error) {
      console.error('Error recording vitals:', error);
      toast({
        title: "Error",
        description: "Failed to record vitals",
        variant: "destructive",
      });
    }
  };

  const handleAllergySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const allergyData = {
        ...allergyForm,
        patient_id: selectedPatient.patient_id,
        recorded_by: user?.id,
      };

      const { error } = await supabase
        .from('patient_allergies')
        .insert([allergyData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Allergy recorded successfully",
      });

      // Reset form and reload patients
      setAllergyForm({
        patient_id: "",
        allergy_type: 'medication',
        allergen_name: "",
        severity: 'mild',
        reaction_description: "",
        management_plan: "",
        emergency_medication: "",
        notes: "",
      });
      loadPatients();
    } catch (error) {
      console.error('Error recording allergy:', error);
      toast({
        title: "Error",
        description: "Failed to record allergy",
        variant: "destructive",
      });
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const noteData = {
        ...noteForm,
        patient_id: selectedPatient.patient_id,
        nurse_id: user?.id,
      };

      const { error } = await supabase
        .from('nurse_notes')
        .insert([noteData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note recorded successfully",
      });

      // Reset form and reload patients
      setNoteForm({
        patient_id: "",
        note_type: 'patient_assessment',
        note_title: "",
        note_content: "",
        priority: 'normal',
      });
      loadPatients();
    } catch (error) {
      console.error('Error recording note:', error);
      toast({
        title: "Error",
        description: "Failed to record note",
        variant: "destructive",
      });
    }
  };

  const checkVitalsAbnormal = (vitals: PatientVitals): boolean => {
    return !!(
      (vitals.blood_pressure_systolic && (vitals.blood_pressure_systolic < 90 || vitals.blood_pressure_systolic > 140)) ||
      (vitals.blood_pressure_diastolic && (vitals.blood_pressure_diastolic < 60 || vitals.blood_pressure_diastolic > 90)) ||
      (vitals.heart_rate && (vitals.heart_rate < 60 || vitals.heart_rate > 100)) ||
      (vitals.temperature && (vitals.temperature < 36.0 || vitals.temperature > 37.5)) ||
      (vitals.respiratory_rate && (vitals.respiratory_rate < 12 || vitals.respiratory_rate > 20)) ||
      (vitals.oxygen_saturation && vitals.oxygen_saturation < 95)
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'checked_in': return 'bg-blue-500';
      case 'in-consultation': return 'bg-purple-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Nurse Dashboard</h1>
        <Badge variant="secondary" className="text-sm">
          {patients.length} Patients
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {patients.map((patient) => (
                <div
                  key={patient.patient_id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPatient?.patient_id === patient.patient_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{patient.full_name}</h4>
                    <Badge className={`text-xs ${getPriorityColor(patient.current_priority)}`}>
                      {patient.current_priority}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {patient.department_name || 'No Department'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {patient.current_queue_status || 'Not in Queue'}
                    </div>
                    {patient.vitals_abnormal && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Abnormal Vitals
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Patient Details and Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              {selectedPatient ? selectedPatient.full_name : 'Select a Patient'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="vitals">Vitals</TabsTrigger>
                  <TabsTrigger value="allergies">Allergies</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                                 {/* Overview Tab */}
                 <TabsContent value="overview" className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label className="text-sm font-medium">Basic Info</Label>
                       <div className="text-sm text-gray-600 space-y-1 mt-1">
                         <div>Age: {new Date().getFullYear() - new Date(selectedPatient.date_of_birth).getFullYear()} years</div>
                         <div>Blood Type: {selectedPatient.blood_type || 'Unknown'}</div>
                         <div>Phone: {selectedPatient.phone || 'Not provided'}</div>
                       </div>
                     </div>
                     <div>
                       <Label className="text-sm font-medium">Current Status</Label>
                       <div className="text-sm text-gray-600 space-y-1 mt-1">
                         <div>Department: {selectedPatient.department_name || 'None'}</div>
                         <div>Queue Status: <Badge className={getStatusColor(selectedPatient.current_queue_status)}>{selectedPatient.current_queue_status || 'Not in Queue'}</Badge></div>
                         <div>Priority: <Badge className={getPriorityColor(selectedPatient.current_priority)}>{selectedPatient.current_priority || 'None'}</Badge></div>
                       </div>
                     </div>
                   </div>

                   {selectedPatient.address && (
                     <div>
                       <Label className="text-sm font-medium">Address</Label>
                       <div className="text-sm text-gray-600 mt-1">{selectedPatient.address}</div>
                     </div>
                   )}

                   {selectedPatient.medical_history && (
                     <div>
                       <Label className="text-sm font-medium">Medical History</Label>
                       <div className="text-sm text-gray-600 mt-1">{selectedPatient.medical_history}</div>
                     </div>
                   )}

                   {selectedPatient.current_medications && (
                     <div>
                       <Label className="text-sm font-medium">Current Medications</Label>
                       <div className="text-sm text-gray-600 mt-1">{selectedPatient.current_medications}</div>
                     </div>
                   )}

                   {selectedPatient.allergies && (
                     <div>
                       <Label className="text-sm font-medium">Allergies</Label>
                       <div className="text-sm text-gray-600 mt-1">{selectedPatient.allergies}</div>
                     </div>
                   )}

                   {selectedPatient.emergency_contact_name && (
                     <div>
                       <Label className="text-sm font-medium">Emergency Contact</Label>
                       <div className="text-sm text-gray-600 mt-1">
                         {selectedPatient.emergency_contact_name} - {selectedPatient.emergency_contact_phone}
                       </div>
                     </div>
                   )}

                   {selectedPatient.last_vitals_date && (
                     <div>
                       <Label className="text-sm font-medium">Latest Vitals</Label>
                       <div className="text-sm text-gray-600 mt-1">
                         Recorded: {new Date(selectedPatient.last_vitals_date).toLocaleString()}
                         {selectedPatient.vitals_abnormal && (
                           <Badge variant="destructive" className="ml-2">Abnormal</Badge>
                         )}
                       </div>
                     </div>
                   )}
                 </TabsContent>

                {/* Vitals Tab */}
                <TabsContent value="vitals" className="space-y-4">
                  <form onSubmit={handleVitalsSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bp_systolic">Blood Pressure Systolic (mmHg)</Label>
                        <Input
                          id="bp_systolic"
                          type="number"
                          value={vitalsForm.blood_pressure_systolic || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, blood_pressure_systolic: Number(e.target.value) || undefined }))}
                          placeholder="120"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bp_diastolic">Blood Pressure Diastolic (mmHg)</Label>
                        <Input
                          id="bp_diastolic"
                          type="number"
                          value={vitalsForm.blood_pressure_diastolic || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, blood_pressure_diastolic: Number(e.target.value) || undefined }))}
                          placeholder="80"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="heart_rate">Heart Rate (bpm)</Label>
                        <Input
                          id="heart_rate"
                          type="number"
                          value={vitalsForm.heart_rate || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, heart_rate: Number(e.target.value) || undefined }))}
                          placeholder="72"
                        />
                      </div>
                      <div>
                        <Label htmlFor="temperature">Temperature (°C)</Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          value={vitalsForm.temperature || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, temperature: Number(e.target.value) || undefined }))}
                          placeholder="36.8"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="respiratory_rate">Respiratory Rate (breaths/min)</Label>
                        <Input
                          id="respiratory_rate"
                          type="number"
                          value={vitalsForm.respiratory_rate || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, respiratory_rate: Number(e.target.value) || undefined }))}
                          placeholder="16"
                        />
                      </div>
                      <div>
                        <Label htmlFor="oxygen_saturation">Oxygen Saturation (%)</Label>
                        <Input
                          id="oxygen_saturation"
                          type="number"
                          value={vitalsForm.oxygen_saturation || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, oxygen_saturation: Number(e.target.value) || undefined }))}
                          placeholder="98"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={vitalsForm.weight_kg || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, weight_kg: Number(e.target.value) || undefined }))}
                          placeholder="70.0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="height">Height (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          step="0.1"
                          value={vitalsForm.height_cm || ''}
                          onChange={(e) => setVitalsForm(prev => ({ ...prev, height_cm: Number(e.target.value) || undefined }))}
                          placeholder="170.0"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pain_level">Pain Level (0-10)</Label>
                      <Input
                        id="pain_level"
                        type="number"
                        min="0"
                        max="10"
                        value={vitalsForm.pain_level || ''}
                        onChange={(e) => setVitalsForm(prev => ({ ...prev, pain_level: Number(e.target.value) || undefined }))}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="vitals_notes">Notes</Label>
                      <Textarea
                        id="vitals_notes"
                        value={vitalsForm.notes || ''}
                        onChange={(e) => setVitalsForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional observations..."
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Record Vitals
                    </Button>
                  </form>
                </TabsContent>

                {/* Allergies Tab */}
                <TabsContent value="allergies" className="space-y-4">
                  <form onSubmit={handleAllergySubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="allergy_type">Allergy Type</Label>
                        <Select
                          value={allergyForm.allergy_type}
                          onValueChange={(value: any) => setAllergyForm(prev => ({ ...prev, allergy_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medication">Medication</SelectItem>
                            <SelectItem value="food">Food</SelectItem>
                            <SelectItem value="environmental">Environmental</SelectItem>
                            <SelectItem value="latex">Latex</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="allergen_name">Allergen Name</Label>
                        <Input
                          id="allergen_name"
                          value={allergyForm.allergen_name}
                          onChange={(e) => setAllergyForm(prev => ({ ...prev, allergen_name: e.target.value }))}
                          placeholder="e.g., Penicillin, Peanuts"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="severity">Severity</Label>
                      <Select
                        value={allergyForm.severity}
                        onValueChange={(value: any) => setAllergyForm(prev => ({ ...prev, severity: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Mild</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="severe">Severe</SelectItem>
                          <SelectItem value="life-threatening">Life-threatening</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reaction_description">Reaction Description</Label>
                      <Textarea
                        id="reaction_description"
                        value={allergyForm.reaction_description || ''}
                        onChange={(e) => setAllergyForm(prev => ({ ...prev, reaction_description: e.target.value }))}
                        placeholder="Describe the allergic reaction..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="management_plan">Management Plan</Label>
                        <Textarea
                          id="management_plan"
                          value={allergyForm.management_plan || ''}
                          onChange={(e) => setAllergyForm(prev => ({ ...prev, management_plan: e.target.value }))}
                          placeholder="How to manage this allergy..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergency_medication">Emergency Medication</Label>
                        <Input
                          id="emergency_medication"
                          value={allergyForm.emergency_medication || ''}
                          onChange={(e) => setAllergyForm(prev => ({ ...prev, emergency_medication: e.target.value }))}
                          placeholder="e.g., EpiPen, Antihistamine"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="allergy_notes">Additional Notes</Label>
                      <Textarea
                        id="allergy_notes"
                        value={allergyForm.notes || ''}
                        onChange={(e) => setAllergyForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional information..."
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Record Allergy
                    </Button>
                  </form>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4">
                  <form onSubmit={handleNoteSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="note_type">Note Type</Label>
                        <Select
                          value={noteForm.note_type}
                          onValueChange={(value: any) => setNoteForm(prev => ({ ...prev, note_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vital_signs">Vital Signs</SelectItem>
                            <SelectItem value="patient_assessment">Patient Assessment</SelectItem>
                            <SelectItem value="medication_administration">Medication Administration</SelectItem>
                            <SelectItem value="patient_education">Patient Education</SelectItem>
                            <SelectItem value="care_coordination">Care Coordination</SelectItem>
                            <SelectItem value="symptom_observation">Symptom Observation</SelectItem>
                            <SelectItem value="treatment_response">Treatment Response</SelectItem>
                            <SelectItem value="discharge_planning">Discharge Planning</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={noteForm.priority}
                          onValueChange={(value: any) => setNoteForm(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="note_title">Note Title</Label>
                      <Input
                        id="note_title"
                        value={noteForm.note_title}
                        onChange={(e) => setNoteForm(prev => ({ ...prev, note_title: e.target.value }))}
                        placeholder="Brief title for the note..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="note_content">Note Content</Label>
                      <Textarea
                        id="note_content"
                        value={noteForm.note_content}
                        onChange={(e) => setNoteForm(prev => ({ ...prev, note_content: e.target.value }))}
                        placeholder="Detailed notes and observations..."
                        rows={6}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a patient from the list to view details and perform actions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NurseDashboard;
