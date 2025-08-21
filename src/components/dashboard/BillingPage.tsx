import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BillingDashboard } from './BillingDashboard';
import { InvoiceManagement } from './InvoiceManagement';

interface BillingPageProps {
  patientId?: string;
}

export function BillingPage({ patientId }: BillingPageProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <BillingDashboard />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          {patientId ? (
            <InvoiceManagement patientId={patientId} />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Select a patient to view their invoices</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Billing reports will be available here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
