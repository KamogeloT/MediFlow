import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Calendar, 
  Activity, 
  MapPin, 
  Stethoscope, 
  Clock, 
  AlertTriangle, 
  Workflow, 
  LogOut, 
  ChevronRight, 
  User,
  Search,
  Upload,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { QueueItem, fetchQueueByDoctor } from "@/lib/queue";
import { getCurrentDoctorProfile } from "@/lib/consultations";
import { useAuth } from "@/lib/auth";
import WorkflowAuditPanel from "./WorkflowAuditPanel";

const DoctorView = () => {
  const { user } = useAuth();
  const [currentPatient, setCurrentPatient] = useState<QueueItem | null>(null);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);
  const [doctorProfile, setDoctorProfile] = useState<{
    id: string;
    full_name: string;
    department_id: string;
    department_name: string;
  } | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyMyDepartments, setOnlyMyDepartments] = useState(true);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [vitals, setVitals] = useState({
    bp: "",
    hr: "",
    temp: "",
    spo2: ""
  });
  const [reasonForVisit, setReasonForVisit] = useState("Regular checkup");
  const [isLoading, setIsLoading] = useState(true);
  
  // Billing state
  const [currentInvoice, setCurrentInvoice] = useState<{
    id: string;
    items: Array<{
      service_id: string;
      service_name: string;
      price: number;
      quantity: number;
    }>;
    total: number;
  } | null>(null);
  const [billingHistory, setBillingHistory] = useState<Array<{
    id: string;
    invoice_number: string;
    date: string;
    status: string;
    total: number;
  }>>([]);

  // Load doctor profile
  useEffect(() => {
    const loadDoctorProfile = async () => {
      if (user?.id) {
        try {
          const profile = await getCurrentDoctorProfile(user.id);
          setDoctorProfile(profile);
        } catch (error) {
          console.error('Failed to load doctor profile:', error);
        }
      }
    };

    loadDoctorProfile();
  }, [user]);

  // Load real queue data
  useEffect(() => {
    const loadQueue = async () => {
      if (user?.id) {
        try {
          setIsLoading(true);
          console.log('Loading queue for doctor:', user.id);
          const queueData = await fetchQueueByDoctor(user.id);
          console.log('Queue data loaded:', queueData);
          setQueue(queueData);
          
          // Select first queue item if available
          if (queueData.length > 0) {
            setSelectedQueueItem(queueData[0]);
            setCurrentPatient(queueData[0]);
          }
        } catch (error) {
          console.error('Failed to load queue:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadQueue();
  }, [user]);

  // Load billing data when patient changes
  useEffect(() => {
    const loadBillingData = async () => {
      if (selectedQueueItem?.patient_id) {
        try {
          // Load current invoice and billing history
          // This would integrate with the billing system
          setCurrentInvoice({
            id: 'temp-invoice',
            items: [
              { service_id: '1', service_name: 'General Consultation', price: 150, quantity: 1 },
              { service_id: '2', service_name: 'Blood Pressure Check', price: 50, quantity: 1 }
            ],
            total: 200
          });
          
          setBillingHistory([
            { id: '1', invoice_number: 'INV-2024-001', date: 'Dec 15, 2024', status: 'Finalized', total: 200 },
            { id: '2', invoice_number: 'INV-2024-002', date: 'Dec 10, 2024', status: 'Open', total: 150 }
          ]);
        } catch (error) {
          console.error('Failed to load billing data:', error);
        }
      }
    };

    loadBillingData();
  }, [selectedQueueItem]);

  const handleQueueItemSelect = (item: QueueItem) => {
    setSelectedQueueItem(item);
    setCurrentPatient(item);
  };

  // Billing functions
  const addServiceToInvoice = (serviceName: string, price: number) => {
    if (!currentInvoice) {
      // Create new invoice
      setCurrentInvoice({
        id: `invoice-${Date.now()}`,
        items: [{ service_id: `service-${Date.now()}`, service_name: serviceName, price, quantity: 1 }],
        total: price
      });
    } else {
      // Add to existing invoice
      const newItems = [...currentInvoice.items];
      const existingItemIndex = newItems.findIndex(item => item.service_name === serviceName);
      
      if (existingItemIndex >= 0) {
        newItems[existingItemIndex].quantity += 1;
      } else {
        newItems.push({ service_id: `service-${Date.now()}`, service_name: serviceName, price, quantity: 1 });
      }
      
      const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setCurrentInvoice({ ...currentInvoice, items: newItems, total: newTotal });
    }
  };

  const finalizeInvoice = () => {
    if (currentInvoice) {
      // Add to billing history
      const newInvoice = {
        id: currentInvoice.id,
        invoice_number: `INV-${new Date().getFullYear()}-${String(billingHistory.length + 1).padStart(3, '0')}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Finalized',
        total: currentInvoice.total
      };
      
      setBillingHistory([newInvoice, ...billingHistory]);
      setCurrentInvoice(null);
    }
  };

  const filteredQueue = queue.filter(item => {
    if (onlyMyDepartments && doctorProfile?.department_id && item.department_id !== doctorProfile?.department_id) {
      return false;
    }
    if (searchTerm && !item.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const formatWaitTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Refresh queue data
  const refreshQueue = async () => {
    if (user?.id) {
      try {
        const queueData = await fetchQueueByDoctor(user.id);
        setQueue(queueData);
      } catch (error) {
        console.error('Failed to refresh queue:', error);
      }
    }
  };

  // Start consultation
  const startConsultation = () => {
    if (selectedQueueItem) {
      // Update queue item status to 'in-progress'
      setQueue(prev => prev.map(item => 
        item.id === selectedQueueItem.id 
          ? { ...item, status: 'in-progress' }
          : item
      ));
      setSelectedQueueItem(prev => prev ? { ...prev, status: 'in-progress' } : null);
    }
  };

  // Check in patient
  const checkInPatient = () => {
    if (selectedQueueItem) {
      // Update queue item status to 'checked-in'
      setQueue(prev => prev.map(item => 
        item.id === selectedQueueItem.id 
          ? { ...item, status: 'checked-in' }
          : item
      ));
      setSelectedQueueItem(prev => prev ? { ...prev, status: 'checked-in' } : null);
    }
  };

  // Start patient consultation
  const startPatientConsultation = () => {
    if (selectedQueueItem) {
      // Update queue item status to 'consulting'
      setQueue(prev => prev.map(item => 
        item.id === selectedQueueItem.id 
          ? { ...item, status: 'consulting' }
          : item
      ));
      setSelectedQueueItem(prev => prev ? { ...prev, status: 'consulting' } : null);
    }
  };

  // Route patient
  const routePatient = () => {
    // This would integrate with the routing system
    console.log('Routing patient to another department');
  };

  // Save draft
  const saveDraft = () => {
    // Save current consultation state as draft
    console.log('Saving consultation draft');
  };

  // Save and continue
  const saveAndContinue = () => {
    // Save current consultation state
    console.log('Saving consultation and continuing');
  };

  // Discard changes
  const discardChanges = () => {
    // Reset form fields to original values
    setConsultationNotes("");
    setVitals({ bp: "", hr: "", temp: "", spo2: "" });
    setReasonForVisit("Regular checkup");
    console.log('Discarding unsaved changes');
  };

  // Upload file
  const uploadFile = () => {
    // This would open file upload dialog
    console.log('Opening file upload dialog');
  };

  // Open attachment
  const openAttachment = (filename: string) => {
    // This would open the attachment
    console.log('Opening attachment:', filename);
  };

  // Relink to queue
  const relinkToQueue = () => {
    // This would relink the patient to the queue
    console.log('Relinking patient to queue');
  };

  // View audit log
  const viewAuditLog = () => {
    // This would show the audit log
    console.log('Showing audit log');
  };

  // Create invoice
  const createInvoice = () => {
    // Create a new invoice
    setCurrentInvoice({
      id: `invoice-${Date.now()}`,
      items: [],
      total: 0
    });
  };

  // View invoice details
  const viewInvoiceDetails = () => {
    // This would show invoice details
    console.log('Showing invoice details');
  };

  // Manage billing
  const manageBilling = () => {
    // Navigate to billing tab
    const billingTab = document.querySelector('[data-value="billing"]') as HTMLElement;
    if (billingTab) {
      billingTab.click();
    }
  };

  // Start billing
  const startBilling = () => {
    // Navigate to billing tab
    const billingTab = document.querySelector('[data-value="billing"]') as HTMLElement;
    if (billingTab) {
      billingTab.click();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6" />
            <h1 className="text-xl font-semibold">
              Consultation • <span className="text-muted-foreground">{doctorProfile?.full_name || 'Loading...'}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={refreshQueue}>Refresh Queue</Button>
            <Button className="rounded-2xl" onClick={startConsultation}>Start Consultation</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        {/* Left: Queue & Navigation */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Patient Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading queue...</p>
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="text-center py-4">
                  <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No patients in queue</p>
                </div>
              ) : (
                filteredQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border hover:bg-accent/40 cursor-pointer transition-all ${
                      selectedQueueItem?.id === item.id ? 'bg-accent/40 border-primary' : ''
                    }`}
                    onClick={() => handleQueueItemSelect(item)}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.patient_name}</p>
                        <Badge variant={item.status === 'waiting' ? 'secondary' : 'outline'}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3" /> {formatWaitTime(item.estimated_wait_time || 0)}
                        <span>•</span>
                        <Stethoscope className="h-3 w-3" /> {item.department_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" /> {formatDate(item.added_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Checkbox 
                  id="mine" 
                  checked={onlyMyDepartments}
                  onCheckedChange={(checked) => setOnlyMyDepartments(checked as boolean)}
                />
                <label htmlFor="mine">Only my departments</label>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search patients, MRN, visit no…" 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Center: Patient Workspace */}
        <section className="col-span-12 lg:col-span-6 space-y-4">
          {selectedQueueItem ? (
            <>
              {/* Patient header card */}
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold">{selectedQueueItem.patient_name}</h2>
                        <Badge variant="secondary">45 yrs</Badge>
                        <Badge variant="secondary">Male</Badge>
                        <Badge>{selectedQueueItem.department_name || 'Unknown Department'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        You can only see patients from your assigned departments.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="rounded-2xl" onClick={checkInPatient}>Check In</Button>
                      <Button className="rounded-2xl" onClick={startPatientConsultation}>Start</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="consultation" className="w-full">
                <TabsList className="grid grid-cols-4 rounded-2xl">
                  <TabsTrigger value="consultation">Consultation</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="routing">Routing</TabsTrigger>
                </TabsList>

                <TabsContent value="consultation" className="space-y-4 mt-4">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Reason for Visit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input 
                        value={reasonForVisit}
                        onChange={(e) => setReasonForVisit(e.target.value)}
                        placeholder="Enter reason for visit"
                      />
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Vitals (Quick)</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3">
                        <Input 
                          placeholder="BP" 
                          value={vitals.bp}
                          onChange={(e) => setVitals(prev => ({ ...prev, bp: e.target.value }))}
                        />
                        <Input 
                          placeholder="HR" 
                          value={vitals.hr}
                          onChange={(e) => setVitals(prev => ({ ...prev, hr: e.target.value }))}
                        />
                        <Input 
                          placeholder="Temp" 
                          value={vitals.temp}
                          onChange={(e) => setVitals(prev => ({ ...prev, temp: e.target.value }))}
                        />
                        <Input 
                          placeholder="SpO2" 
                          value={vitals.spo2}
                          onChange={(e) => setVitals(prev => ({ ...prev, spo2: e.target.value }))}
                        />
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Allergies & Alerts</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Alert variant="destructive" className="rounded-xl">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Queue item not found</AlertTitle>
                          <AlertDescription>
                            Patient is not attached to a live queue item. Re-link below.
                          </AlertDescription>
                        </Alert>
                        <div className="flex gap-2">
                          <Button variant="outline" className="rounded-2xl" onClick={relinkToQueue}>Relink to Queue</Button>
                          <Button variant="ghost" className="rounded-2xl" onClick={viewAuditLog}>View Audit Log</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Consultation Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea 
                        placeholder="Enter detailed consultation notes here…" 
                        className="min-h-[140px]"
                        value={consultationNotes}
                        onChange={(e) => setConsultationNotes(e.target.value)}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="billing" className="mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Service Selection */}
                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          Add Services
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input 
                              placeholder="Search services..." 
                              className="flex-1"
                            />
                            <Button size="sm" className="rounded-xl">
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 border rounded-lg">
                              <div>
                                <p className="font-medium">General Consultation</p>
                                <p className="text-xs text-muted-foreground">R 150.00</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl"
                                onClick={() => addServiceToInvoice('General Consultation', 150)}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex items-center justify-between p-2 border rounded-lg">
                              <div>
                                <p className="font-medium">Blood Pressure Check</p>
                                <p className="text-xs text-muted-foreground">R 50.00</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl"
                                onClick={() => addServiceToInvoice('Blood Pressure Check', 50)}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex items-center justify-between p-2 border rounded-lg">
                              <div>
                                <p className="font-medium">ECG</p>
                                <p className="text-xs text-muted-foreground">R 300.00</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl"
                                onClick={() => addServiceToInvoice('ECG', 300)}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex items-center justify-between p-2 border rounded-lg">
                              <div>
                                <p className="font-medium">Laboratory Tests</p>
                                <p className="text-xs text-muted-foreground">R 250.00</p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl"
                                onClick={() => addServiceToInvoice('Laboratory Tests', 250)}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Current Invoice */}
                    <Card className="rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Current Invoice
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {currentInvoice ? (
                            <>
                              {currentInvoice.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <span>{item.service_name}</span>
                                  <span>R {item.price.toFixed(2)}</span>
                                </div>
                              ))}
                              <Separator />
                              <div className="flex items-center justify-between font-medium">
                                <span>Total</span>
                                <span>R {currentInvoice.total.toFixed(2)}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="rounded-xl flex-1"
                                  onClick={finalizeInvoice}
                                >
                                  Finalize Invoice
                                </Button>
                                                              <Button size="sm" variant="outline" className="rounded-xl" onClick={viewInvoiceDetails}>
                                View Details
                              </Button>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <p>No active invoice</p>
                              <Button size="sm" className="mt-2 rounded-xl" onClick={createInvoice}>
                                Create Invoice
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Billing History */}
                  <Card className="rounded-2xl mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Billing History</CardTitle>
                    </CardHeader>
                                          <CardContent>
                        <div className="space-y-2">
                          {billingHistory.length > 0 ? (
                            billingHistory.map((invoice) => (
                              <div key={invoice.id} className="flex items-center justify-between p-2 border rounded-lg">
                                <div>
                                  <p className="font-medium">{invoice.invoice_number}</p>
                                  <p className="text-xs text-muted-foreground">{invoice.date}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={invoice.status === 'Finalized' ? 'secondary' : 'outline'}>
                                    {invoice.status}
                                  </Badge>
                                  <span className="font-medium">R {invoice.total.toFixed(2)}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <p>No billing history</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="workflow" className="mt-4">
                  <WorkflowAuditPanel 
                    queueItemId={selectedQueueItem.id}
                    title="Workflow Timeline"
                  />
                </TabsContent>

                <TabsContent value="routing" className="mt-4">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Routing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">From Department</p>
                          <Input defaultValue={selectedQueueItem.department_name || 'Unknown'} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">To Department</p>
                          <Input placeholder="Select…" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Reason</p>
                          <Input placeholder="e.g. Cardiac symptoms" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button className="rounded-2xl" onClick={routePatient}>Route Patient</Button>
                        <Button variant="outline" className="rounded-2xl" onClick={saveDraft}>Save Draft</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="p-8 text-center">
                <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Patient Selected</h3>
                <p className="text-muted-foreground">
                  {isLoading ? 'Loading queue...' : 'Select a patient from the queue to begin consultation'}
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Right: Patient Snapshot */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          {selectedQueueItem ? (
            <>
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Patient Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">MRN</span>
                    <span>MRN-009723</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Doctor</span>
                    <span>{doctorProfile?.full_name || 'Loading...'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Room</span>
                    <span>G12</span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Upcoming Appointment
                  </div>
                  <div className="text-xs">{formatDate(selectedQueueItem.added_at)}</div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Billing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {currentInvoice ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Current Total</span>
                        <span className="font-medium">R {currentInvoice.total.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Services</span>
                        <span>{currentInvoice.items.length}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full rounded-xl"
                        onClick={manageBilling}
                      >
                        Manage Billing
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-muted-foreground mb-2">No active invoice</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full rounded-xl"
                        onClick={startBilling}
                      >
                        Start Billing
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Attachments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Referral.pdf</span>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openAttachment('Referral.pdf')}>Open</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ECG.png</span>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openAttachment('ECG.png')}>Open</Button>
                  </div>
                  <Button className="w-full rounded-2xl mt-2" variant="secondary" onClick={uploadFile}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : 'Patient details will appear here'}
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </main>

      <footer className="sticky bottom-0 z-30 border-t bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Auto-save is on • Last saved 2 mins ago</div>
                            <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-2xl" onClick={discardChanges}>Discard</Button>
                    <Button className="rounded-2xl" onClick={saveAndContinue}>Save & Continue</Button>
                  </div>
        </div>
      </footer>
    </div>
  );
};

export default DoctorView;

