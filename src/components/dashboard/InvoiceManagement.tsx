import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Eye, CheckCircle, XCircle } from 'lucide-react';
import { getPatientInvoices, getInvoiceDetails, closeInvoice, finalizeInvoice } from '@/lib/billing';
import { Invoice, InvoiceItem } from '@/lib/billing';

interface InvoiceManagementProps {
  patientId: string;
}

export function InvoiceManagement({ patientId }: InvoiceManagementProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [patientId]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getPatientInvoices(patientId);
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const { data, error } = await getInvoiceDetails(invoice.id);
      if (error) throw error;
      setInvoiceItems(data || []);
      setSelectedInvoice(invoice);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    }
  };

  const handleCloseInvoice = async (invoiceId: string) => {
    try {
      const { error } = await closeInvoice(invoiceId);
      if (error) throw error;
      await fetchInvoices();
    } catch (error) {
      console.error('Error closing invoice:', error);
    }
  };

  const handleFinalizeInvoice = async (invoiceId: string) => {
    try {
      const { error } = await finalizeInvoice(invoiceId);
      if (error) throw error;
      await fetchInvoices();
    } catch (error) {
      console.error('Error finalizing invoice:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'default',
      closed: 'secondary',
      finalized: 'success'
    };
    
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const getStatusActions = (invoice: Invoice) => {
    if (invoice.status === 'open') {
      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleCloseInvoice(invoice.id)}>
            <XCircle className="w-4 h-4 mr-1" />
            Close
          </Button>
        </div>
      );
    } else if (invoice.status === 'closed') {
      return (
        <Button size="sm" onClick={() => handleFinalizeInvoice(invoice.id)}>
          <CheckCircle className="w-4 h-4 mr-1" />
          Finalize
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Patient Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No invoices found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>R {invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {getStatusActions(invoice)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Details - {selectedInvoice.invoice_number}</span>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span> {getStatusBadge(selectedInvoice.status)}
                </div>
                <div>
                  <span className="font-medium">Total:</span> R {selectedInvoice.total_amount.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date(selectedInvoice.created_at).toLocaleString()}
                </div>
                {selectedInvoice.closed_at && (
                  <div>
                    <span className="font-medium">Closed:</span> {new Date(selectedInvoice.closed_at).toLocaleString()}
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.service_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>R {item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>R {item.total_price.toFixed(2)}</TableCell>
                      <TableCell>{new Date(item.added_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  Download PDF
                </Button>
                {selectedInvoice.status === 'open' && (
                  <Button onClick={() => handleCloseInvoice(selectedInvoice.id)}>
                    <XCircle className="w-4 h-4 mr-1" />
                    Close Invoice
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
