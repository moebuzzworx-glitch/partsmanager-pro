
'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Sale, Customer } from '@/lib/types';

export default function SalesPage() {
    const firestore = useFirestore();

    const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore]);
    const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection);

    const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
    const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersCollection);

    const [searchQuery, setSearchQuery] = useState('');

  const getCustomerName = (customerId: string) => {
    return customers?.find((c) => c.id === customerId)?.name || 'Unknown';
  };

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

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!searchQuery) return sales;
    return sales.filter(sale =>
      sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerName(sale.customerId).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sales, searchQuery, customers]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Sales"
        description="Review all customer sales."
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Sale
          </Button>
        }
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <Card>
            <CardHeader>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by ID or customer..."
                        className="pl-8 sm:w-[300px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoadingSales || isLoadingCustomers) && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading sales...</TableCell>
                    </TableRow>
                )}
                {!isLoadingSales && !isLoadingCustomers && filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs">{sale.id}</TableCell>
                    <TableCell>{formatDate(sale.date)}</TableCell>
                    <TableCell className="font-medium">
                      {getCustomerName(sale.customerId)}
                    </TableCell>
                    <TableCell>{sale.items.length}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(sale.total)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Print Receipt</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
