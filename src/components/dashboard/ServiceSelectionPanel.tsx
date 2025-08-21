import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, DollarSign, Heart } from 'lucide-react';
import { getDepartmentServices } from '@/lib/billing';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  cash_price: number;
  medical_aid_price: number;
  is_cross_department: boolean;
}

export interface SelectedService {
  service_id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ServiceSelectionPanelProps {
  departmentId: string;
  billingType: 'cash' | 'medical_aid';
  onServiceAdd: (service: SelectedService) => void;
  className?: string;
}

export function ServiceSelectionPanel({ 
  departmentId, 
  billingType, 
  onServiceAdd, 
  className = '' 
}: ServiceSelectionPanelProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchDepartmentServices();
  }, [departmentId]);

  const fetchDepartmentServices = async () => {
    try {
      const { data, error } = await getDepartmentServices(departmentId);
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleAddService = () => {
    if (!selectedService || quantity < 1) return;
    
    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    const unitPrice = billingType === 'cash' ? service.cash_price : service.medical_aid_price;
    const totalPrice = unitPrice * quantity;

    onServiceAdd({
      service_id: service.id,
      service_name: service.name,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice
    });

    setSelectedService('');
    setQuantity(1);
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Service
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Search Services</Label>
          <Input
            placeholder="Search for services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Select Service</Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a service" />
            </SelectTrigger>
            <SelectContent>
              {filteredServices.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - R {billingType === 'cash' ? service.cash_price : service.medical_aid_price}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24"
          />
        </div>

        <Button 
          onClick={handleAddService} 
          disabled={!selectedService}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Invoice
        </Button>
      </CardContent>
    </Card>
  );
}
