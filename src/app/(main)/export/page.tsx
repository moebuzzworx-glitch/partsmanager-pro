
'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Product, Supplier, Customer, Sale, Purchase } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export default function ExportPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: products, isLoading: loadingProducts } = useCollection<Product>(
    useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore])
  );
  const { data: suppliers, isLoading: loadingSuppliers } = useCollection<Supplier>(
    useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore])
  );
  const { data: customers, isLoading: loadingCustomers } = useCollection<Customer>(
    useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore])
  );
  const { data: sales, isLoading: loadingSales } = useCollection<Sale>(
    useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore])
  );
  const { data: purchases, isLoading: loadingPurchases } = useCollection<Purchase>(
    useMemoFirebase(() => firestore ? collection(firestore, 'purchases') : null, [firestore])
  );

  const handleExport = (data: any[] | null, fileName: string, sheetName: string) => {
    if (!data || data.length === 0) {
      toast({
        title: 'No Data to Export',
        description: `There is no data available for ${sheetName}.`,
        variant: 'destructive',
      });
      return;
    }

    try {
        // We need to process the data to handle Timestamps or other non-serializable types
        const processedData = data.map(item => {
            const newItem: any = {};
            for(const key in item) {
                if (item[key]?.toDate && typeof item[key].toDate === 'function') {
                    newItem[key] = item[key].toDate().toISOString();
                } else if (Array.isArray(item[key])) {
                    // For now, we'll stringify arrays like sale/purchase items
                    newItem[key] = JSON.stringify(item[key]);
                }
                 else {
                    newItem[key] = item[key];
                }
            }
            return newItem;
        });


        const worksheet = XLSX.utils.json_to_sheet(processedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        toast({
            title: 'Export Successful',
            description: `${fileName}.xlsx has been downloaded.`,
        });
    } catch (error) {
        console.error("Export failed:", error);
        toast({
            title: 'Export Failed',
            description: 'An error occurred while generating the file.',
            variant: 'destructive',
        });
    }
  };

  const exportCards = [
    {
      title: 'Export Stock List',
      description: 'Download a complete list of all products in your inventory.',
      data: products?.filter(p => !p.deletedAt),
      isLoading: loadingProducts,
      fileName: 'stock_list_export',
      sheetName: 'Products',
    },
    {
      title: 'Export Suppliers',
      description: 'Download a list of all your suppliers and their contact information.',
      data: suppliers,
      isLoading: loadingSuppliers,
      fileName: 'suppliers_export',
      sheetName: 'Suppliers',
    },
    {
      title: 'Export Customers',
      description: 'Download a list of all your customers and their contact information.',
      data: customers,
      isLoading: loadingCustomers,
      fileName: 'customers_export',
      sheetName: 'Customers',
    },
    {
      title: 'Export Sales Data',
      description: 'Download a complete history of all sales transactions.',
      data: sales,
      isLoading: loadingSales,
      fileName: 'sales_export',
      sheetName: 'Sales',
    },
    {
      title: 'Export Purchases Data',
      description: 'Download a complete history of all purchase orders.',
      data: purchases,
      isLoading: loadingPurchases,
      fileName: 'purchases_export',
      sheetName: 'Purchases',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Export Data"
        description="Download your application data in XLSX format."
      />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exportCards.map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleExport(card.data, card.fileName, card.sheetName)}
                  disabled={card.isLoading || !card.data || card.data.length === 0}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {card.isLoading ? 'Loading data...' : 'Download XLSX'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
