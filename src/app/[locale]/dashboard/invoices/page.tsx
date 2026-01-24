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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebase } from "@/firebase/provider";
import { getUserInvoices, deleteInvoice, updateInvoicePaidStatus, type StoredInvoice } from "@/lib/invoices-utils";

import { generateDocumentPdf } from "@/components/dashboard/document-generator";
import { getUserSettings } from "@/lib/settings-utils";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [activeTab, setActiveTab] = useState<string>('INVOICE');

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

  const handleDownloadDocument = async (invoice: StoredInvoice, type: 'INVOICE' | 'DELIVERY_NOTE') => {
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
        logoUrl: (settings as any).logoUrl,
        rc: settings.rc, nif: settings.nif, art: settings.art, nis: settings.nis, rib: settings.rib
      } as any;

      // Reconstruct form data from stored invoice
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

      await generateDocumentPdf(
        formData,
        type,
        companyInfo,
        invoice.defaultVat || 0,
        invoice.applyVatToAll
      );

      toast({
        title: 'Success',
        description: dictionary.invoices?.regenerateSuccess || 'Document generated successfully.',
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Error',
        description: dictionary.invoices?.regenerateError || 'Failed to generate document.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!firestore) return;

    if (!confirm(dictionary.invoices?.deleteConfirm || 'Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await deleteInvoice(firestore, invoiceId);
      if (success) {
        setInvoices(invoices.filter(inv => inv.id !== invoiceId));
        toast({
          title: 'Success',
          description: dictionary.invoices?.deleteInvoiceSuccess || 'Invoice deleted successfully.',
        });
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: 'Error',
        description: dictionary.invoices?.deleteInvoiceErrorDescription || 'Failed to delete invoice.',
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
          description: newPaidStatus ? (dictionary.invoices?.paidSuccessfully || 'Invoice paid status updated.') : (dictionary.invoices?.unpaidSuccessfully || 'Invoice unpaid status updated.'),
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

  // Filter and sort invoices
  const filteredAndSortedInvoices = invoices
    .filter(invoice => {
      // Filter by Document Type based on Active Tab
      const docType = invoice.documentType || 'INVOICE';
      if (docType !== activeTab) return false;

      // Filter by Search Term
      return invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ? new Date(a.createdAt.toDate()).getTime() : new Date(a.invoiceDate).getTime();
      const dateB = b.createdAt?.toDate?.() ? new Date(b.createdAt.toDate()).getTime() : new Date(b.invoiceDate).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

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
        <p className="text-muted-foreground">{dictionary.invoices?.description || 'Generate and manage invoices.'}</p>
      </div>

      <Tabs defaultValue="INVOICE" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="INVOICE">Factures</TabsTrigger>
            <TabsTrigger value="PURCHASE_ORDER">Bons de Commande</TabsTrigger>
            <TabsTrigger value="DELIVERY_NOTE">Bons de Livraison</TabsTrigger>
          </TabsList>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <CardTitle>
                  {activeTab === 'INVOICE' && (dictionary.invoices?.title || 'Invoices')}
                  {activeTab === 'PURCHASE_ORDER' && 'Bons de Commande'}
                  {activeTab === 'DELIVERY_NOTE' && 'Bons de Livraison'}
                </CardTitle>
                <CreateInvoiceDialog
                  locale={locale}
                  dictionary={dictionary}
                  onInvoiceCreated={fetchInvoicesList}
                  defaultType={activeTab as any}
                />
              </div>
              <div className="flex gap-4 items-center">
                <Input
                  placeholder={dictionary.invoices?.searchPlaceholder || 'Search by number or name...'}
                  className="flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'newest' | 'oldest')}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder={dictionary.invoices?.sortPlaceholder || 'Sort by...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{dictionary.invoices?.sortNewest || 'Newest First'}</SelectItem>
                    <SelectItem value="oldest">{dictionary.invoices?.sortOldest || 'Oldest First'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <TableHead>{dictionary.table?.invoiceNumber || 'Number'}</TableHead>
                    <TableHead>{activeTab === 'PURCHASE_ORDER' ? 'Fournisseur' : (dictionary.table?.client || 'Client')}</TableHead>
                    <TableHead>{dictionary.table?.date || 'Date'}</TableHead>
                    <TableHead className="text-right">{dictionary.table?.amount || 'Amount'}</TableHead>
                    <TableHead>{dictionary.table?.status || 'Status'}</TableHead>
                    <TableHead className="text-right">{dictionary.table?.actions || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {invoices.length === 0 ? (dictionary.invoices?.noDataTitle || 'No documents found.') : (dictionary.invoices?.noDataSearch || 'No documents match your search.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedInvoices.map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {invoice.total?.toFixed(2) || '0.00'} {dictionary?.dashboard?.currency || 'DZD'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.paid ? 'default' : 'secondary'}>
                            {invoice.paid ? dictionary.invoices?.paid || 'Paid' : dictionary.invoices?.unpaid || 'Unpaid'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={invoice.isProforma || updatingPaidId === invoice.id || activeTab === 'DELIVERY_NOTE'}
                            onClick={() => handleTogglePaidStatus(invoice)}
                            title={invoice.isProforma ? dictionary.invoices?.cannotMarkProforma || 'Proforma' : invoice.paid ? dictionary.invoices?.markAsUnpaid || 'Mark as Unpaid' : dictionary.invoices?.markAsPaid || 'Mark as Paid'}
                            className={invoice.isProforma ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            {updatingPaidId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : invoice.paid ? (
                              <X className="h-4 w-4 text-red-600" />
                            ) : (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={regeneratingId === invoice.id}
                              >
                                {regeneratingId === invoice.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="mr-2 h-4 w-4" />
                                )}
                                {regeneratingId === invoice.id ? dictionary.invoices?.regenerating || 'Generating...' : dictionary.invoices?.download || 'Download'}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleDownloadDocument(invoice, activeTab as any)}>
                                {activeTab === 'INVOICE' ? 'Facture' : activeTab === 'PURCHASE_ORDER' ? 'Bon de Commande' : 'Bon de Livraison'}
                              </DropdownMenuItem>
                              {activeTab === 'INVOICE' && (
                                <DropdownMenuItem onClick={() => handleDownloadDocument(invoice, 'DELIVERY_NOTE')}>
                                  Bon de Livraison
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => invoice.id && handleDeleteInvoice(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </Tabs>
    </div>
  );
}
