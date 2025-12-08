
'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CircleAlert, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Sale, Customer } from '@/lib/types';


export default function BillingPage() {
    const firestore = useFirestore();

    const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore]);
    const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection);

    const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersCollection);

  const [searchQuery, setSearchQuery] = useState('');

  const getCustomerName = (customerId: string) => {
    return customers?.find((c) => c.id === customerId)?.name || 'Unknown';
  };

  const invoicesWithStatus = useMemo(() => {
    if (!sales) return [];
    return sales.map((sale, index) => {
      // This is mock logic for status, replace with real logic if available
      const statuses = ['Paid', 'Due', 'Overdue'];
      const status = statuses[index % 3];
      
      let dueDate: Date | null = null;
      if (sale.date) {
        dueDate = sale.date instanceof Date ? sale.date : (sale.date as any).toDate();
        dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
      }

      return { ...sale, status, dueDate };
    });
  }, [sales]);


  const overdueInvoices = invoicesWithStatus.filter(inv => inv.status === 'Overdue');
  const outstandingInvoices = invoicesWithStatus.filter(inv => inv.status === 'Due');
  
  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return invoicesWithStatus;
    return invoicesWithStatus.filter(invoice =>
      (invoice.id && invoice.id.toLowerCase().replace('sal', 'INV').includes(searchQuery.toLowerCase())) ||
      (invoice.customerId && getCustomerName(invoice.customerId).toLowerCase().includes(searchQuery.toLowerCase())) ||
      (invoice.status && invoice.status.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [invoicesWithStatus, searchQuery, getCustomerName]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };
  
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US').format(d);
  }

  const isLoading = isLoadingSales || isLoadingCustomers;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Client Billing"
        description="Manage customer invoices and track payments."
        actions={
            <CreateInvoiceDialog />
        }
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6 grid gap-6 items-start">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                    <FileText className="w-5 h-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold font-headline">
                        {formatPrice(outstandingInvoices.reduce((acc, inv) => acc + inv.total, 0))}
                    </div>
                    <p className="text-xs text-muted-foreground">{outstandingInvoices.length} invoices due</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
                    <CircleAlert className="w-5 h-5 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold font-headline text-destructive">
                        {formatPrice(overdueInvoices.reduce((acc, inv) => acc + inv.total, 0))}
                    </div>
                    <p className="text-xs text-muted-foreground">{overdueInvoices.length} invoices overdue</p>
                </CardContent>
            </Card>
        </div>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>A list of the most recent invoices.</CardDescription>
            </div>
            <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by ID, customer, or status..."
                    className="pl-8 w-full sm:w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center">Loading invoices...</TableCell>
                        </TableRow>
                    )}
                    {!isLoading && filteredInvoices.slice(0, 5).map((invoice) => (
                        <TableRow key={invoice.id}>
                            <TableCell className="font-mono text-xs">{invoice.id.replace('sal', 'INV')}</TableCell>
                            <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                            <TableCell>{formatDate(invoice.date)}</TableCell>
                            <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : 'N/A'}</TableCell>
                            <TableCell>{formatPrice(invoice.total)}</TableCell>
                            <TableCell>
                                <Badge 
                                    variant={
                                        invoice.status === 'Paid' ? 'default' : 
                                        invoice.status === 'Overdue' ? 'destructive' : 'secondary'
                                    } 
                                    className={invoice.status === 'Paid' ? 'bg-emerald-500' : ''}
                                >
                                    {invoice.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm">
                                    {invoice.status === 'Overdue' ? 'Send Reminder' : 'View Details'}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
