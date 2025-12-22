'use client';

export const dynamic = 'force-dynamic';

import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/lib/config";
import { useEffect, useState } from "react";
import { use } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query } from "firebase/firestore";
import { CreateInvoiceDialogWrapper } from "@/components/dashboard/create-invoice-dialog-wrapper";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

export default function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const { firestore } = useFirebase();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);

  // Load dictionary
  useEffect(() => {
    const loadDictionary = async () => {
      const dict = await getDictionary(locale);
      setDictionary(dict);
    };
    loadDictionary();
  }, [locale]);

  // Fetch invoices from Firestore
  useEffect(() => {
    if (!firestore) return;

    const fetchInvoices = async () => {
      try {
        setIsLoading(true);
        const invoicesRef = collection(firestore, 'invoices');
        const q = query(invoicesRef);
        const querySnapshot = await getDocs(q);
        
        const fetchedInvoices: Invoice[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedInvoices.push({
            id: doc.id,
            invoiceNumber: data.invoiceNumber || `INV-${doc.id}`,
            customer: data.clientName || '',
            date: data.invoiceDate ? new Date(data.invoiceDate).toISOString() : new Date().toISOString(),
            amount: data.total || 0,
            status: data.status || 'Pending',
          });
        });

        // Sort by date descending
        fetchedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [firestore]);

  if (!dictionary) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">
          {dictionary.dashboard.invoices}
        </h1>
        <p className="text-muted-foreground">Generate and manage invoices.</p>
      </div>
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Invoices</CardTitle>
                <CreateInvoiceDialogWrapper locale={locale} dictionary={dictionary} />
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create one to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                      <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.customer}</TableCell>
                          <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                              <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'}>
                                  {invoice.status}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right">{invoice.amount.toFixed(2)} DZD</TableCell>
                          <TableCell className="text-right">
                             <Button variant="outline" size="sm">
                                  <Download className="mr-2 h-4 w-4"/>
                                  PDF
                             </Button>
                          </TableCell>
                      </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
