import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Plus,
  Filter,
  Download
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchAllPatients, type Patient } from "@/lib/patients";

const PatientsPage = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const { toast } = useToast();

  // Load all patients
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setIsLoading(true);
        const allPatients = await fetchAllPatients();
        setPatients(allPatients);
        setFilteredPatients(allPatients);
      } catch (error) {
        console.error("Failed to load patients:", error);
        toast({
          title: "Failed to load patients",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, [toast]);

  // Filter patients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient =>
      patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPatients(filtered);
  }, [searchQuery, patients]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const exportPatients = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Date of Birth', 'Age', 'Gender', 'Address'],
      ...filteredPatients.map(patient => [
        patient.full_name,
        patient.email || '',
        patient.phone || '',
        patient.date_of_birth || '',
        patient.date_of_birth ? getAge(patient.date_of_birth).toString() : '',
        patient.gender || '',
        patient.address || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patients.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Directory</h1>
            <p className="text-gray-600">Manage and view all registered patients</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={exportPatients}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search patients by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredPatients.length}</div>
            <div className="text-sm text-gray-600">Total Patients</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredPatients.filter(p => p.date_of_birth && getAge(p.date_of_birth) < 18).length}
            </div>
            <div className="text-sm text-gray-600">Minors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredPatients.filter(p => p.date_of_birth && getAge(p.date_of_birth) >= 65).length}
            </div>
            <div className="text-sm text-gray-600">Seniors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {filteredPatients.filter(p => p.gender === 'Female').length}
            </div>
            <div className="text-sm text-gray-600">Female</div>
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? 'No patients found' : 'No patients registered'}
                </h3>
                <p className="text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'Start by registering your first patient'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredPatients.map((patient) => (
                  <Card key={patient.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 bg-blue-100">
                        <User className="w-6 h-6 text-blue-600" />
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {patient.full_name}
                          </h3>
                          {patient.date_of_birth && (
                            <Badge variant="outline" className="text-xs">
                              {getAge(patient.date_of_birth)} years
                            </Badge>
                          )}
                          {patient.gender && (
                            <Badge variant="outline" className="text-xs">
                              {patient.gender}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          {patient.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              {patient.email}
                            </div>
                          )}
                          {patient.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.date_of_birth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(patient.date_of_birth)}
                            </div>
                          )}
                        </div>
                        {patient.address && (
                          <p className="text-sm text-gray-500 mt-2">
                            {patient.address}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default PatientsPage;
