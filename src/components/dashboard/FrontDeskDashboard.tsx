import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  Clock, 
  UserPlus, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  Plus,
  Eye,
  CheckSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import WorkflowExplanation from "./WorkflowExplanation";

interface Appointment {
  id: string;
  patient_id: string;
  department_id: string;
  patient_name: string;
  department_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  status_name: string;
  reason: string;
  created_at: string;
}

interface QueueItem {
  id: string;
  patient_id: string;
  patient_name: string;
  department_name: string;
  priority_id: number;
  priority_code: string;
  priority_name: string;
  priority_color: string;
  wait_time_minutes: number;
  status: string;
  estimated_wait_time: number;
  added_at: string;
}

interface Department {
  id: string;
  name: string;
}

const FrontDeskDashboard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Navigation state
  const [currentView, setCurrentView] = useState<'dashboard' | 'new-patient' | 'quick-registration'>('dashboard');

  useEffect(() => {
    fetchDashboardData();
    fetchDepartments();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get today's appointments using the new status view - simpler query to avoid join issues
      const today = new Date().toISOString().split('T')[0];
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments_with_status')
        .select(`
          id,
          patient_id,
          department_id,
          appointment_date,
          appointment_time,
          status_code,
          status_name,
          reason,
          created_at
        `)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      } else {
        // Get patient and department names separately to avoid join issues
        const patientIds = [...new Set(appointmentsData?.map(apt => apt.patient_id).filter(Boolean) || [])];
        const departmentIds = [...new Set(appointmentsData?.map(apt => apt.department_id).filter(Boolean) || [])];
        
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, full_name')
          .in('id', patientIds);
        
        const { data: deptData } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', departmentIds);

        const patientMap = new Map(patientData?.map(p => [p.id, p.full_name]) || []);
        const departmentMap = new Map(deptData?.map(dept => [dept.id, dept.name]) || []);

        const formattedAppointments = appointmentsData?.map(apt => ({
          id: apt.id,
          patient_id: apt.patient_id,
          department_id: apt.department_id,
          patient_name: patientMap.get(apt.patient_id) || 'Unknown',
          department_name: departmentMap.get(apt.department_id) || 'Unknown',
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          status: apt.status_code,
          status_name: apt.status_name,
          reason: apt.reason,
          created_at: apt.created_at
        })) || [];
        setAppointments(formattedAppointments);
      }

      // Get current queue items - using the new priority lookup system
      const { data: queueData, error: queueError } = await supabase
        .from('queue_with_priority_details')
        .select(`
          id,
          patient_id,
          priority_id,
          priority_code,
          priority_name,
          priority_color,
          wait_time_minutes,
          status,
          estimated_wait_time,
          added_at,
          patient_name,
          department_id,
          department_name
        `)
        .eq('status', 'waiting')
        .order('priority_sort_order', { ascending: true })
        .order('added_at', { ascending: true });

      if (queueError) {
        console.error('Error fetching queue:', queueError);
      } else {
        // Get patient and department names separately to avoid join issues
        const patientIds = [...new Set(queueData?.map(item => item.patient_id).filter(Boolean) || [])];
        const departmentIds = [...new Set(queueData?.map(item => item.department_id).filter(Boolean) || [])];
        
        const { data: patientData } = await supabase
          .from('patients')
          .select('id, full_name')
          .in('id', patientIds);
        
        const { data: deptData } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', departmentIds);

        const patientMap = new Map(patientData?.map(p => [p.id, p.full_name]) || []);
        const departmentMap = new Map(deptData?.map(dept => [dept.id, dept.name]) || []);

        const formattedQueue = queueData?.map(item => ({
          id: item.id,
          patient_id: item.patient_id,
          patient_name: item.patient_name || 'Unknown',
          department_name: item.department_name || 'Unknown',
          priority_id: item.priority_id || 3,
          priority_code: item.priority_code || 'normal',
          priority_name: item.priority_name || 'Normal',
          priority_color: item.priority_color || 'gray',
          wait_time_minutes: item.wait_time_minutes || 30,
          status: item.status,
          estimated_wait_time: item.estimated_wait_time,
          added_at: item.added_at
        })) || [];
        setQueueItems(formattedQueue);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching departments:', error);
      } else {
        setDepartments(data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleCheckIn = async (appointmentId: string, patientId: string, departmentId: string) => {
    try {
      // Step 1: Update appointment status to 'checked_in' using the new status system
      const { error: updateError } = await supabase
        .rpc('update_appointment_status', {
          appointment_uuid: appointmentId,
          new_status_code: 'checked_in',
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (updateError) {
        console.error('Appointment update error:', updateError);
        
        // Check if it's a constraint violation
        if (updateError.code === '23514') {
          throw new Error(`Status constraint violation: The status 'checked_in' is not allowed. Please run the database fix script.`);
        }
        
        throw updateError;
      }

      // Step 2: Add patient to department queue
      const { error: queueError } = await supabase
        .from('queue')
        .insert({
          patient_id: patientId,
          department_id: departmentId,
          priority_id: 3, // Normal priority (ID: 3)
          status: 'waiting',
          is_appointment_based: true,
          appointment_id: appointmentId,
          estimated_wait_time: 30, // Default 30 minutes
          added_at: new Date().toISOString(),
          patient_name: appointments.find(apt => apt.id === appointmentId)?.patient_name || 'Unknown'
        });

      if (queueError) {
        console.error('Queue insert error:', queueError);
        throw queueError;
      }

      // Step 3: Log the workflow action (already handled by update_appointment_status function)
      // The function automatically logs status changes to audit_logs

      toast({
        title: "Patient checked in successfully",
        description: "Patient has been added to department queue. Appointment archived.",
      });

      // Refresh data to show updated status
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error during check-in:', error);
      
      let errorMessage = "There was an error processing the check-in";
      
      if (error.message && error.message.includes('Status constraint violation')) {
        errorMessage = error.message;
      } else if (error.code === '23514') {
        errorMessage = "Database constraint error: Status 'checked_in' not allowed. Please contact administrator.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Check-in failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleViewPatient = (patientId: string) => {
    // Navigate to patient details page or open modal
    toast({
      title: "View Patient",
      description: `Viewing patient ID: ${patientId}`,
    });
    // TODO: Implement patient view navigation
  };

  const handleNewPatient = () => {
    setCurrentView('new-patient');
    toast({
      title: "New Patient",
      description: "Navigate to patient registration",
    });
    // TODO: Implement navigation to patient registration
  };

  const handleQuickRegistration = () => {
    setCurrentView('quick-registration');
    toast({
      title: "Quick Registration",
      description: "Navigate to quick registration form",
    });
    // TODO: Implement navigation to quick registration
  };

  const handleRefresh = () => {
    fetchDashboardData();
    toast({
      title: "Refreshed",
      description: "Dashboard data has been refreshed",
    });
  };

  // Filter appointments and queue items
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === "all" || apt.department_id === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const filteredQueueItems = queueItems.filter(item => {
    const matchesSearch = item.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === "all" || 
                             departments.find(d => d.name === item.department_name)?.id === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  // If not on dashboard view, show navigation back
  if (currentView !== 'dashboard') {
    return (
      <div className="p-6">
        <Button 
          variant="outline" 
          onClick={() => setCurrentView('dashboard')}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">
            {currentView === 'new-patient' ? 'New Patient Registration' : 'Quick Registration'}
          </h2>
          <p className="text-gray-600">
            {currentView === 'new-patient' 
              ? 'Navigate to the full patient registration form' 
              : 'Navigate to the quick registration form'
            }
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This functionality will be implemented in the next phase
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Front Desk Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage appointments, check-ins, and patient flow</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleNewPatient}>
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
          <Button size="sm" onClick={handleQuickRegistration}>
            <UserPlus className="w-4 h-4 mr-2" />
            Quick Registration
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <Clock className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Workflow Explanation */}
      <WorkflowExplanation />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.filter(a => a.status === 'scheduled').length}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.filter(a => a.status === 'checked_in').length}</div>
            <p className="text-xs text-muted-foreground">Appointments archived, patients in queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Queue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueItems.length}</div>
            <p className="text-xs text-muted-foreground">Patients waiting for consultation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find specific appointments or queue items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by patient name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-48">
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Today's Appointments</TabsTrigger>
          <TabsTrigger value="queue">Active Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Appointments for Today</CardTitle>
              <CardDescription>
                Check-in patients to archive appointments and add them to department queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading appointments...</p>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No appointments found for today</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{appointment.patient_name}</p>
                              <p className="text-sm text-gray-600">{appointment.department_name}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                              <p>{new Date(appointment.appointment_date).toLocaleDateString()}</p>
                              <p>{appointment.appointment_time}</p>
                            </div>
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {appointment.reason}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            appointment.status === 'scheduled' ? 'secondary' :
                            appointment.status === 'checked_in' ? 'default' :
                            appointment.status === 'completed' ? 'outline' : 'destructive'
                          }>
                            {appointment.status_name}
                          </Badge>
                          {appointment.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => handleCheckIn(appointment.id, appointment.patient_id, appointment.department_id)}
                            >
                              <CheckSquare className="w-4 h-4 mr-1" />
                              Check In
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPatient(appointment.patient_id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Active Queue</CardTitle>
              <CardDescription>Patients currently waiting for consultation</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading queue...</p>
                </div>
              ) : filteredQueueItems.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No patients in queue</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {filteredQueueItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium">{item.patient_name}</p>
                              <p className="text-sm text-gray-600">{item.department_name}</p>
                            </div>
                            <div className="text-sm text-gray-500">
                              <p>Wait: ~{item.estimated_wait_time} min</p>
                              <p>Since: {new Date(item.added_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            item.priority_code === 'urgent' ? 'destructive' :
                            item.priority_code === 'high' ? 'default' :
                            item.priority_code === 'normal' ? 'secondary' : 'outline'
                          }>
                            {item.priority_name}
                          </Badge>
                          <Badge variant="outline">{item.status}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPatient(item.patient_id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FrontDeskDashboard;
