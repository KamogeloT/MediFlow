import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createPatient } from "@/lib/patients";
import { notify } from "@/lib/notifications";
import { addToQueue } from "@/lib/queue";
import { validateSAIdNumber } from "@/lib/utils";
import { BillingProfileForm, BillingProfileData } from "./BillingProfileForm";
import { User, Phone, Mail, MapPin, Calendar, Heart, Shield, Plus, Clock, CreditCard } from "lucide-react";

interface PatientRegistrationProps {
  onSubmit?: (data: any) => void;
  initialData?: any;
  isEdit?: boolean;
}

const PatientRegistration = ({
  onSubmit = () => {},
  initialData = {},
  isEdit = false,
}: PatientRegistrationProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [addToQueueEnabled, setAddToQueueEnabled] = useState(false);
  const [idNumberValidation, setIdNumberValidation] = useState<{
    isValid: boolean;
    error?: string;
    formatted?: string;
    dateOfBirth?: string;
  } | null>(null);
  const [isSouthAfricanCitizen, setIsSouthAfricanCitizen] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("South Africa");
  const [queueData, setQueueData] = useState({
    departmentId: "",
    priority_code: "normal" as "low" | "normal" | "high" | "urgent",
    notes: "",
  });
  const [billingProfile, setBillingProfile] = useState<BillingProfileData>({
    billing_type: 'cash'
  });

  // List of countries for non-SA citizens
  const countries = [
    "South Africa", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia",
    "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
    "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia",
    "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo",
    "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji",
    "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala",
    "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
    "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
    "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
    "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
    "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
    "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
    "Somalia", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
    "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];

  // Load departments when component mounts
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { fetchDepartments } = await import('@/lib/departments');
        const depts = await fetchDepartments();
        setDepartments(depts);
        if (depts.length > 0) {
          setQueueData(prev => ({ ...prev, departmentId: depts[0].id }));
        }
      } catch (error) {
        console.error("Failed to load departments", error);
      }
    };
    
    loadDepartments();
  }, []);

  const handleCitizenshipChange = (isCitizen: boolean) => {
    setIsSouthAfricanCitizen(isCitizen);
    setSelectedCountry(isCitizen ? "South Africa" : "");
    setIdNumberValidation(null);
    
    // Clear the ID number field when switching
    const idField = document.getElementById('saIdNumber') as HTMLInputElement;
    if (idField) {
      idField.value = '';
    }
    
    // Clear the DOB field when switching from SA citizen
    if (!isCitizen) {
      const dobField = document.getElementById('dob') as HTMLInputElement;
      if (dobField) {
        dobField.value = '';
      }
    }
  };

  const handleIdNumberChange = (value: string) => {
    if (isSouthAfricanCitizen) {
      // SA Citizen: Validate 13-digit ID number
      if (value.length === 13) {
        const validation = validateSAIdNumber(value);
        setIdNumberValidation(validation);
        
        // If validation is successful and we have a date of birth, update the DOB field
        if (validation.isValid && validation.dateOfBirth) {
          const dobField = document.getElementById('dob') as HTMLInputElement;
          if (dobField) {
            // Convert the formatted date (DD/MM/YYYY) to YYYY-MM-DD format for the date input
            const [day, month, year] = validation.dateOfBirth.split('/');
            const isoDate = `${year}-${month}-${day}`;
            dobField.value = isoDate;
          }
        }
      } else {
        setIdNumberValidation(null);
      }
    } else {
      // Non-SA Citizen: Validate passport number (any length, alphanumeric)
      if (value.length > 0) {
        const isValidPassport = /^[A-Za-z0-9]+$/.test(value);
        setIdNumberValidation({
          isValid: isValidPassport,
          error: isValidPassport ? undefined : "Passport number can only contain letters and numbers",
          formatted: value,
          dateOfBirth: undefined
        });
      } else {
        setIdNumberValidation(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const saIdNumber = (formData.get("saIdNumber") as string) || "";
      const firstName = (formData.get("firstName") as string) || "";
      const lastName = (formData.get("lastName") as string) || "";
      const full_name = `${firstName} ${lastName}`.trim();
      
             // Validate ID Number/Passport based on citizenship
       if (!saIdNumber) {
         throw new Error(isSouthAfricanCitizen 
           ? "Please enter a valid South African ID Number" 
           : "Please enter a valid Passport Number");
       }
       
       if (isSouthAfricanCitizen) {
         // SA Citizen: Validate 13-digit ID number
         if (!/^\d{13}$/.test(saIdNumber)) {
           throw new Error("Please enter a valid 13-digit South African ID Number");
         }
         
         // Check if ID number is already validated
         if (idNumberValidation && !idNumberValidation.isValid) {
           throw new Error(idNumberValidation.error || "Invalid South African ID Number");
         }
       } else {
         // Non-SA Citizen: Validate passport number
         if (!/^[A-Za-z0-9]+$/.test(saIdNumber)) {
           throw new Error("Passport number can only contain letters and numbers");
         }
         
         if (!selectedCountry) {
           throw new Error("Please select your country of citizenship");
         }
       }
      
             // Create the patient with ID Number/Passport
       const patient = await createPatient({ 
         full_name,
         sa_id_number: saIdNumber
       });

       // Create billing profile if billing type is selected
       if (billingProfile.billing_type) {
         try {
           const { createBillingProfile } = await import('@/lib/billing');
           await createBillingProfile(
             patient.id,
             billingProfile.billing_type,
             billingProfile.billing_type === 'medical_aid' ? {
               provider_name: billingProfile.provider_name,
               membership_number: billingProfile.membership_number,
               plan_type: billingProfile.plan_type
             } : undefined
           );
         } catch (billingError) {
           console.error('Billing profile creation failed:', billingError);
           // Don't fail the entire registration if billing profile fails
         }
       }
      
      // If add to queue is enabled, add them to the queue
      if (addToQueueEnabled && queueData.departmentId) {
        try {
                     await addToQueue({
             patient_id: patient.id,
             patient_name: patient.full_name,
             priority_code: queueData.priority_code,
             department_id: queueData.departmentId,
             notes: queueData.notes.trim() || undefined,
             is_walk_in: true,
           });
          
          toast({
            title: "Patient registered and added to queue",
            description: `${full_name} has been registered and added to the queue.`,
          });
        } catch (queueError) {
          const errorMessage = (queueError as Error).message;
          
          // Check if it's an authentication error
          if (errorMessage.includes("Authentication required")) {
            toast({
              title: "Session expired",
              description: "Please log in again to add patients to the queue.",
              variant: "destructive",
            });
            // Don't reset the form, let user try again after re-authentication
            return;
          }
          
          // Patient was created but queue addition failed for other reasons
          toast({
            title: "Patient registered but queue addition failed",
            description: `${full_name} was registered but could not be added to the queue: ${errorMessage}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Patient registered successfully",
          description: `${full_name} has been added to the system.`,
        });
      }
      
      notify("New patient registered", { body: full_name });
      onSubmit(patient);
      
      // Reset form and queue data
      const form = document.querySelector('form');
      if (form) form.reset();
      setAddToQueueEnabled(false);
      setQueueData({
        departmentId: departments.length > 0 ? departments[0].id : "",
        priority_code: "normal",
        notes: "",
      });
      setBillingProfile({ billing_type: 'cash' });
      
    } catch (error) {
      toast({
        title: "Registration failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <>
      <div className="h-full flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <Tabs defaultValue="personal" className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Info
                </TabsTrigger>
                <TabsTrigger value="medical" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Medical History
                </TabsTrigger>
                              <TabsTrigger value="emergency" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Emergency Contact
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing Profile
              </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto">
                             <TabsContent value="personal" className="p-6 space-y-6">
                 {/* Citizenship Section */}
                 <div className="space-y-4">
                   <div className="space-y-2">
                     <Label className="text-sm font-medium flex items-center gap-2">
                       <Shield className="w-4 h-4" />
                       Citizenship Status
                     </Label>
                     <div className="flex gap-4">
                       <div className="flex items-center space-x-2">
                         <input
                           type="radio"
                           id="saCitizen"
                           name="citizenship"
                           checked={isSouthAfricanCitizen}
                           onChange={() => handleCitizenshipChange(true)}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                         />
                         <Label htmlFor="saCitizen" className="text-sm">South African Citizen</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <input
                           type="radio"
                           id="nonSaCitizen"
                           name="citizenship"
                           checked={!isSouthAfricanCitizen}
                           onChange={() => handleCitizenshipChange(false)}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                         />
                         <Label htmlFor="nonSaCitizen" className="text-sm">Non-South African Citizen</Label>
                       </div>
                     </div>
                   </div>

                   {/* Country Selection for Non-SA Citizens */}
                   {!isSouthAfricanCitizen && (
                     <div className="space-y-2">
                       <Label htmlFor="country" className="text-sm font-medium">Country of Citizenship *</Label>
                       <Select 
                         value={selectedCountry} 
                         onValueChange={setSelectedCountry}
                       >
                         <SelectTrigger className="h-10">
                           <SelectValue placeholder="Select your country" />
                         </SelectTrigger>
                         <SelectContent>
                           {countries.map((country) => (
                             <SelectItem key={country} value={country}>
                               {country}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   )}
                 </div>

                 {/* ID Number/Passport Field */}
                 <div className="space-y-2">
                                     <Label htmlFor="saIdNumber" className="text-sm font-medium flex items-center gap-2">
                     <Shield className="w-4 h-4" />
                     {isSouthAfricanCitizen ? "South African ID Number *" : "Passport Number *"}
                   </Label>
                   <Input
                     id="saIdNumber"
                     name="saIdNumber"
                     placeholder={isSouthAfricanCitizen ? "8001015009087" : "Enter passport number"}
                     defaultValue={initialData.saIdNumber}
                     className="h-10 font-mono"
                     maxLength={isSouthAfricanCitizen ? 13 : 50}
                     pattern={isSouthAfricanCitizen ? "[0-9]{13}" : "[A-Za-z0-9]+"}
                     required
                     onChange={(e) => handleIdNumberChange(e.target.value)}
                   />
                                     {idNumberValidation && (
                     <div className="space-y-1">
                       <p className={`text-xs ${idNumberValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                         {idNumberValidation.error || idNumberValidation.formatted}
                       </p>
                     </div>
                   )}
                                                          <p className="text-xs text-gray-500">
                       {isSouthAfricanCitizen 
                         ? "Enter the 13-digit South African ID Number (format: YYMMDD0000000)"
                         : "Enter your passport number (letters and numbers only)"
                       }
                     </p>
                     {!isSouthAfricanCitizen && selectedCountry && (
                       <p className="text-xs text-blue-600">
                         📍 Country of Citizenship: {selectedCountry}
                       </p>
                     )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      defaultValue={initialData.firstName}
                      className="h-10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      defaultValue={initialData.lastName}
                      className="h-10"
                      required
                    />
                  </div>
                </div>

                                 <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <Label htmlFor="dob" className="text-sm font-medium flex items-center gap-2">
                       <Calendar className="w-4 h-4" />
                       Date of Birth
                       {isSouthAfricanCitizen && idNumberValidation?.isValid && idNumberValidation?.dateOfBirth && (
                         <span className="text-xs text-blue-600">(Auto-filled from ID)</span>
                       )}
                     </Label>
                     <Input 
                       id="dob" 
                       type="date" 
                       defaultValue={initialData.dob}
                       className="h-10"
                       readOnly={isSouthAfricanCitizen && idNumberValidation?.isValid && !!idNumberValidation?.dateOfBirth}
                     />
                     {isSouthAfricanCitizen && idNumberValidation?.isValid && idNumberValidation?.dateOfBirth && (
                       <p className="text-xs text-blue-600">
                         📅 Auto-populated from ID Number: {idNumberValidation.dateOfBirth}
                       </p>
                     )}
                   </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gender</Label>
                    <RadioGroup
                      defaultValue={initialData.gender || "male"}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="text-sm">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="text-sm">Female</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other" className="text-sm">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Enter full address"
                    defaultValue={initialData.address}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      defaultValue={initialData.phone}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      defaultValue={initialData.email}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Queue Integration Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">Queue Management</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="addToQueue"
                        checked={addToQueueEnabled}
                        onChange={(e) => setAddToQueueEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="addToQueue" className="text-sm font-medium">
                        Add patient to queue after registration
                      </Label>
                    </div>

                    {addToQueueEnabled && (
                      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="queueDepartment" className="text-sm font-medium">Department *</Label>
                            <Select 
                              value={queueData.departmentId} 
                              onValueChange={(value) => setQueueData(prev => ({ ...prev, departmentId: value }))}
                            >
                              <SelectTrigger className="h-10">
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
                             <Label htmlFor="queuePriority" className="text-sm font-medium">Priority Level</Label>
                             <Select 
                               value={queueData.priority_code} 
                               onValueChange={(value: any) => setQueueData(prev => ({ ...prev, priority_code: value }))}
                             >
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low Priority</SelectItem>
                                <SelectItem value="normal">Normal Priority</SelectItem>
                                <SelectItem value="high">High Priority</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="queueNotes" className="text-sm font-medium">Queue Notes (Optional)</Label>
                          <Textarea
                            id="queueNotes"
                            value={queueData.notes}
                            onChange={(e) => setQueueData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Add any relevant notes for the queue..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="text-sm font-medium">Known Allergies</Label>
                  <Textarea
                    id="allergies"
                    placeholder="List any known allergies (e.g., penicillin, latex, etc.)"
                    defaultValue={initialData.allergies}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications" className="text-sm font-medium">Current Medications</Label>
                  <Textarea
                    id="medications"
                    placeholder="List current medications with dosages"
                    defaultValue={initialData.medications}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodType" className="text-sm font-medium">Blood Type</Label>
                  <Select defaultValue={initialData.bloodType || "unknown"}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="a+">A+</SelectItem>
                      <SelectItem value="a-">A-</SelectItem>
                      <SelectItem value="b+">B+</SelectItem>
                      <SelectItem value="b-">B-</SelectItem>
                      <SelectItem value="ab+">AB+</SelectItem>
                      <SelectItem value="ab-">AB-</SelectItem>
                      <SelectItem value="o+">O+</SelectItem>
                      <SelectItem value="o-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="emergency" className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyName" className="text-sm font-medium">Emergency Contact Name</Label>
                    <Input
                      id="emergencyName"
                      placeholder="Enter patient name"
                      defaultValue={initialData.emergencyName}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyRelation" className="text-sm font-medium">Relationship</Label>
                    <Input
                      id="emergencyRelation"
                      placeholder="Spouse"
                      defaultValue={initialData.emergencyRelation}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Emergency Contact Phone
                  </Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    defaultValue={initialData.emergencyPhone}
                    className="h-10"
                  />
                </div>
              </TabsContent>

              <TabsContent value="billing" className="p-6 space-y-6">
                <BillingProfileForm
                  initialData={billingProfile}
                  onSubmit={setBillingProfile}
                  isLoading={isLoading}
                />
              </TabsContent>
            </div>
          </Tabs>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {addToQueueEnabled && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span>Patient will be added to queue after registration</span>
                </div>
              )}
              <div className="flex space-x-3">
                <Button type="button" variant="outline" className="h-10 px-6">
                  Cancel
                </Button>
                <Button type="submit" className="h-10 px-6" disabled={isLoading}>
                  {isLoading ? "Processing..." : (isEdit ? "Update Patient" : "Register Patient")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

    </>
  );
};

export default PatientRegistration;
