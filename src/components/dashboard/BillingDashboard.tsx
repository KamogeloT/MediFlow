import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, FileText, TrendingUp, Users, CreditCard, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BillingStats {
  totalInvoices: number;
  openInvoices: number;
  closedInvoices: number;
  finalizedInvoices: number;
  totalRevenue: number;
  cashRevenue: number;
  medicalAidRevenue: number;
}

export function BillingDashboard() {
  const [stats, setStats] = useState<BillingStats>({
    totalInvoices: 0,
    openInvoices: 0,
    closedInvoices: 0,
    finalizedInvoices: 0,
    totalRevenue: 0,
    cashRevenue: 0,
    medicalAidRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBillingStats();
  }, []);

  const fetchBillingStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch invoice counts and revenue
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('status, total_amount, billing_profiles(billing_type)');

      if (invoicesError) throw invoicesError;

      let openCount = 0, closedCount = 0, finalizedCount = 0;
      let totalRevenue = 0, cashRevenue = 0, medicalAidRevenue = 0;

      invoices?.forEach(invoice => {
        switch (invoice.status) {
          case 'open':
            openCount++;
            break;
          case 'closed':
            closedCount++;
            break;
          case 'finalized':
            finalizedCount++;
            break;
        }

        totalRevenue += invoice.total_amount || 0;
        
        if (invoice.billing_profiles?.billing_type === 'cash') {
          cashRevenue += invoice.total_amount || 0;
        } else if (invoice.billing_profiles?.billing_type === 'medical_aid') {
          medicalAidRevenue += invoice.total_amount || 0;
        }
      });

      setStats({
        totalInvoices: invoices?.length || 0,
        openInvoices: openCount,
        closedInvoices: closedCount,
        finalizedInvoices: finalizedCount,
        totalRevenue,
        cashRevenue,
        medicalAidRevenue
      });

    } catch (error) {
      console.error('Error fetching billing stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, variant = 'default' }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    variant?: 'default' | 'secondary' | 'success';
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${
            variant === 'success' ? 'bg-green-100' : 
            variant === 'secondary' ? 'bg-blue-100' : 
            'bg-gray-100'
          }`}>
            <Icon className={`w-6 h-6 ${
              variant === 'success' ? 'text-green-600' : 
              variant === 'secondary' ? 'text-blue-600' : 
              'text-gray-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading billing dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Billing Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View Reports
          </Button>
          <Button>
            <DollarSign className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Invoices"
          value={stats.totalInvoices}
          icon={FileText}
        />
        <StatCard
          title="Open Invoices"
          value={stats.openInvoices}
          icon={TrendingUp}
          variant="secondary"
        />
        <StatCard
          title="Total Revenue"
          value={`R ${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Active Patients"
          value="Loading..."
          icon={Users}
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Cash Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              R {stats.cashRevenue.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.totalRevenue > 0 ? `${((stats.cashRevenue / stats.totalRevenue) * 100).toFixed(1)}%` : '0%'} of total revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Medical Aid Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              R {stats.medicalAidRevenue.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.totalRevenue > 0 ? `${((stats.medicalAidRevenue / stats.totalRevenue) * 100).toFixed(1)}%` : '0%'} of total revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <FileText className="w-6 h-6 mb-2" />
              <span>Create Invoice</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Users className="w-6 h-6 mb-2" />
              <span>Patient Billing</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <TrendingUp className="w-6 h-6 mb-2" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Billing Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Recent billing activity will appear here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
