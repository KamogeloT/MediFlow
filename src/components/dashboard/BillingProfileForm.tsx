import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { CreditCard, Heart, Building2 } from 'lucide-react';

export interface BillingProfileData {
  billing_type: 'cash' | 'medical_aid';
  provider_name?: string;
  membership_number?: string;
  plan_type?: string;
  authorisation_required?: boolean;
}

interface BillingProfileFormProps {
  initialData?: Partial<BillingProfileData>;
  onSubmit: (data: BillingProfileData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const medicalAidProviders = [
  'Discovery Health',
  'Bonitas',
  'Medihelp',
  'Fedhealth',
  'Momentum Health',
  'Bestmed',
  'GEMS',
  'Selfmed',
  'Other'
];

const planTypes = [
  'Comprehensive',
  'Standard',
  'Basic',
  'Network',
  'Savings',
  'Other'
];

export function BillingProfileForm({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: BillingProfileFormProps) {
  const [billingType, setBillingType] = useState<'cash' | 'medical_aid'>(initialData.billing_type || 'cash');
  const [providerName, setProviderName] = useState(initialData.provider_name || '');
  const [membershipNumber, setMembershipNumber] = useState(initialData.membership_number || '');
  const [planType, setPlanType] = useState(initialData.plan_type || '');
  const [authorisationRequired, setAuthorisationRequired] = useState(initialData.authorisation_required || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const billingData: BillingProfileData = {
      billing_type: billingType,
      ...(billingType === 'medical_aid' && {
        provider_name: providerName,
        membership_number: membershipNumber,
        plan_type: planType,
        authorisation_required: authorisationRequired
      })
    };

    onSubmit(billingData);
  };

  const handleBillingTypeChange = (value: 'cash' | 'medical_aid') => {
    setBillingType(value);
    if (value === 'cash') {
      setProviderName('');
      setMembershipNumber('');
      setPlanType('');
      setAuthorisationRequired(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Billing Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Billing Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Billing Type</Label>
            <RadioGroup 
              value={billingType} 
              onValueChange={handleBillingTypeChange}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="w-4 h-4" />
                  Cash Payment
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medical_aid" id="medical_aid" />
                <Label htmlFor="medical_aid" className="flex items-center gap-2 cursor-pointer">
                  <Heart className="w-4 h-4" />
                  Medical Aid
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Medical Aid Details */}
          {billingType === 'medical_aid' && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Medical Aid Provider *</Label>
                  <Select value={providerName} onValueChange={setProviderName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicalAidProviders.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="membership">Membership Number *</Label>
                  <Input
                    id="membership"
                    value={membershipNumber}
                    onChange={(e) => setMembershipNumber(e.target.value)}
                    placeholder="e.g., 123456789"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan Type</Label>
                  <Select value={planType} onValueChange={setPlanType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan type" />
                    </SelectTrigger>
                    <SelectContent>
                      {planTypes.map((plan) => (
                        <SelectItem key={plan} value={plan}>
                          {plan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={authorisationRequired}
                      onChange={(e) => setAuthorisationRequired(e.target.checked)}
                      className="rounded"
                    />
                    Authorisation Required
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Billing Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
