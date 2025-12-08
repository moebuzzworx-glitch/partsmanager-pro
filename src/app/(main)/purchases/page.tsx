
'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
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
import { MoreHorizontal, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AddPurchaseDialog } from './add-purchase-dialog';
import { Button } from '@/components/ui/button';
import type { Supplier, Purchase } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function PurchasesPage() {
  const firestore = useFirestore();

  const suppliersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersCollection);

  const purchasesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'purchases') : null, [firestore]);
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesCollection);

  const [searchQuery, setSearchQuery] = useState('');

  const getSupplierName = (supplierId: string) => {
    return suppliers?.find((s) => s.id === supplierId)?.name || 'Unknown';
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
  
  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    if (!searchQuery) return purchases;
    return purchases.filter(purchase =>
      purchase.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSupplierName(purchase.supplierId).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [purchases, searchQuery, suppliers]);


  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Purchases"
        description="Track all your stock purchases."
        actions={
          <AddPurchaseDialog suppliers={suppliers || []} />
        }
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <Card>
            <CardHeader>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by ID or supplier..."
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
                  <TableHead>Purchase ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoadingPurchases || isLoadingSuppliers) && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading purchases...</TableCell>
                    </TableRow>
                )}
                {!isLoadingPurchases && !isLoadingSuppliers && filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono text-xs">{purchase.id}</TableCell>
                    <TableCell>{formatDate(purchase.date)}</TableCell>
                    <TableCell className="font-medium">
                      {getSupplierName(purchase.supplierId)}
                    </TableCell>
                    <TableCell>{purchase.items.length}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(purchase.total)}
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
                          <DropdownMenuItem>Print Invoice</DropdownMenuItem>
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
