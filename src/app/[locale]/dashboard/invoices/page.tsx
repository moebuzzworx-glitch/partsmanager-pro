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
import { Download, Loader2, Trash2, Edit, Check, X } from "lucide-react";
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
import { getUserInvoices, deleteInvoice, updateInvoicePaidStatus, type StoredInvoice } from "@/lib/invoices-utils";
import { generateInvoicePdf } from "@/components/dashboard/invoice-generator";
import { getUserSettings } from "@/lib/settings-utils";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import { useToast } from "@/hooks/use-toast";

export default function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [updatingPaidId, setUpdatingPaidId] = useState<string | null>(null);

  const fetchInvoicesList = async () => {
    if (!firestore || !user) return;
    try {
      setIsLoading(true);
      const fetchedInvoices = await getUserInvoices(firestore, user.uid);
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!firestore || !user) return;

    fetchInvoicesList();
  }, [firestore, user]);

  const handleRegenerateInvoice = async (invoice: StoredInvoice) => {
    if (!firestore || !user) return;

    try {
      setRegeneratingId(invoice.id || '');
      
      // Get fresh company settings
      const settings = await getUserSettings(firestore, user.uid);
      
      // Use stored company info or fetch from settings
      const companyInfo = invoice.companyInfo || {
        companyName: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        rc: settings.rc,
        nif: settings.nif,
        art: settings.art,
        nis: settings.nis,
        rib: settings.rib,
        logoUrl: (settings as any).logoUrl,
      };

      // Regenerate PDF from stored data
      const formData = {
        isProforma: invoice.isProforma,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        clientName: invoice.clientName,
        clientAddress: invoice.clientAddress || '',
        clientNis: invoice.clientNis || '',
        clientNif: invoice.clientNif || '',
        clientRc: invoice.clientRc || '',
        clientArt: invoice.clientArt || '',
        clientRib: invoice.clientRib || '',
        lineItems: invoice.lineItems,
        paymentMethod: invoice.paymentMethod || 'Espèce',
        applyVatToAll: invoice.applyVatToAll,
      };

      await generateInvoicePdf(
        formData,
        companyInfo,
        invoice.defaultVat || 0,
        invoice.applyVatToAll
      );

      toast({
        title: 'Success',
        description: 'Invoice regenerated and downloaded successfully.',
      });
    } catch (error) {
      console.error('Error regenerating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!firestore) return;

    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await deleteInvoice(firestore, invoiceId);
      if (success) {
        setInvoices(invoices.filter(inv => inv.id !== invoiceId));
        toast({
          title: 'Success',
          description: 'Invoice deleted successfully.',
        });
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete invoice.',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePaidStatus = async (invoice: StoredInvoice) => {
    if (!firestore || !invoice.id) return;

    try {
      setUpdatingPaidId(invoice.id);
      const newPaidStatus = !invoice.paid;
      const success = await updateInvoicePaidStatus(firestore, invoice.id, newPaidStatus);
      
      if (success) {
        setInvoices(invoices.map(inv => 
          inv.id === invoice.id ? { ...inv, paid: newPaidStatus } : inv
        ));
        toast({
          title: 'Success',
          description: `Invoice marked as ${newPaidStatus ? 'paid' : 'unpaid'}.`,
        });
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice status.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPaidId(null);
    }
  };

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
                <CreateInvoiceDialog 
                  locale={locale} 
                  dictionary={dictionary}
                  onInvoiceCreated={fetchInvoicesList}
                />
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
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No invoices found. Create one to get started!
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map(invoice => (
                      <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.clientName}</TableCell>
                          <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {invoice.total?.toFixed(2) || '0.00'} DZD
                          </TableCell>
                          <TableCell>
                            <Badge variant={invoice.paid ? 'default' : 'secondary'}>
                              {invoice.paid ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                             <Button 
                               variant="outline" 
                               size="sm"
                               disabled={invoice.isProforma || updatingPaidId === invoice.id}
                               onClick={() => handleTogglePaidStatus(invoice)}
                               title={invoice.isProforma ? 'Proforma invoices cannot be marked as paid' : invoice.paid ? 'Mark as Unpaid' : 'Mark as Paid'}
                               className={invoice.isProforma ? 'opacity-50 cursor-not-allowed' : ''}
                             >
                                  {updatingPaidId === invoice.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                  ) : invoice.paid ? (
                                    <X className="h-4 w-4 text-red-600"/>
                                  ) : (
                                    <Check className="h-4 w-4 text-green-600"/>
                                  )}
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               disabled={regeneratingId === invoice.id}
                               onClick={() => handleRegenerateInvoice(invoice)}
                             >
                                  {regeneratingId === invoice.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                  ) : (
                                    <Download className="mr-2 h-4 w-4"/>
                                  )}
                                  Download
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               className="text-destructive hover:text-destructive"
                               onClick={() => invoice.id && handleDeleteInvoice(invoice.id)}
                             >
                                  <Trash2 className="h-4 w-4"/>
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
