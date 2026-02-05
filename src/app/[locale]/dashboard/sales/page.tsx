'use client';

export const dynamic = 'force-dynamic';

import { MoreHorizontal, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { use } from "react";
import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/lib/config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogSaleDialog } from "@/components/dashboard/log-sale-dialog";
import { EditSaleDialog } from "@/components/dashboard/edit-sale-dialog";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, where, doc, getDoc, deleteDoc } from "firebase/firestore";
import { ProtectedActionDialog } from "@/components/protected-action-dialog";
import { generateDocumentPdf } from "@/components/dashboard/document-generator";
import { getUserSettings } from "@/lib/settings-utils";
import { saveInvoiceData } from "@/lib/invoices-utils";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { getNextDocumentNumber, updateLastDocumentNumber } from "@/lib/settings-utils";

interface Sale {
  id: string;
  product: string;
  customer: string;
  customerId?: string;
  date: string;
  quantity: number;
  amount: number;
  unitPrice?: number;
  reference?: string;
}

export default function SalesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const confirmDeleteSale = async () => {
    if (!firestore || !saleToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'sales', saleToDelete));
      setSales(prev => prev.filter(s => s.id !== saleToDelete));
      toast({ title: "Success", description: "Sale deleted successfully." });
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast({ title: "Error", description: "Failed to delete sale.", variant: "destructive" });
    } finally {
      setSaleToDelete(null);
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

  const fetchSales = async () => {
    if (!firestore || !user?.uid) return;
    try {
      setIsLoading(true);
      const salesRef = collection(firestore, 'sales');
      const q = query(salesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const fetchedSales: Sale[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedSales.push({
          id: doc.id,
          product: data.product || '',
          customer: data.customer || '',
          customerId: data.customerId || '',
          date: data.date ? new Date(data.date.toDate?.() || data.date).toISOString() : new Date().toISOString(),
          quantity: data.quantity || 0,
          amount: data.amount || 0,
          unitPrice: data.unitPrice,
          reference: data.reference,
        });
      });

      setSales(fetchedSales);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSaleSelection = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSales(new Set(filteredSales.map(s => s.id)));
    } else {
      setSelectedSales(new Set());
    }
  };

  const handleGenerateReceipt = async (salesToProcess: Sale[]) => {
    if (!firestore || !user || salesToProcess.length === 0) return;

    // Validate same customer
    const firstCustomer = salesToProcess[0].customer;
    const sameCustomer = salesToProcess.every(s => s.customer === firstCustomer);

    if (!sameCustomer) {
      toast({
        title: dictionary?.errors?.title || "Error",
        description: dictionary?.sales?.sameCustomerError || "Please select sales from the same customer.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({ title: dictionary?.sales?.generating || "Generating...", description: dictionary?.sales?.generatingDescription || "Preparing document..." });

      const settings = await getUserSettings(firestore, user.uid);

      // Get customer data from the first sale (assuming same customer)
      let customerData: any = {};
      if (salesToProcess[0].customerId) {
        const customerDoc = await getDoc(doc(firestore, 'customers', salesToProcess[0].customerId));
        if (customerDoc.exists()) {
          customerData = customerDoc.data();
        }
      }

      // Get proper document number
      const invoiceNumber = getNextDocumentNumber(settings, 'SALES_RECEIPT');

      const receiptData = {
        invoiceNumber: invoiceNumber,
        invoiceDate: new Date().toISOString(), // Grouped receipt date is now
        clientName: firstCustomer,
        clientAddress: customerData?.address || '',
        clientNis: customerData?.nis || '',
        clientNif: customerData?.nif || '',
        clientRc: customerData?.rc || '',
        clientArt: customerData?.art || '',
        clientRib: customerData?.rib || '',
        lineItems: salesToProcess.map(sale => ({
          reference: sale.reference || '',
          designation: sale.product,
          quantity: sale.quantity,
          unitPrice: sale.unitPrice || (sale.amount / (sale.quantity || 1)),
          unit: 'pcs'
        })),
        paymentMethod: 'Espèce',
        applyVatToAll: false,
        isProforma: false,
        discountType: 'amount' as const,
        discountValue: 0,
      };

      const companyInfo = {
        companyName: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        logoUrl: (settings as any).logoUrl,
        rc: settings.rc, nif: settings.nif, art: settings.art, nis: settings.nis, rib: settings.rib
      };

      // Save the receipt to invoices collection for tracking
      await saveInvoiceData(
        firestore,
        user.uid,
        receiptData,
        companyInfo as any,
        0, // defaultVat
        receiptData.lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0), // total
        receiptData.lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0), // subtotal
        0, // vatAmount
        'SALES_RECEIPT',
        true // Paid
      );

      // Update the sequence number
      await updateLastDocumentNumber(firestore, user.uid, settings, 'SALES_RECEIPT');

      await generateDocumentPdf(receiptData as any, 'SALES_RECEIPT', companyInfo as any, 0, false, 0, false, dictionary);
      toast({ title: dictionary?.common?.success || "Success", description: dictionary?.sales?.receiptSuccess || "Receipt generated successfully." });
      setSelectedSales(new Set()); // Clear selection
    } catch (e) {
      console.error(e);
      toast({ title: dictionary?.errors?.title || "Error", description: dictionary?.sales?.generationFailed || "Generation failed.", variant: "destructive" });
    }
  };

  // Fetch sales from Firestore
  useEffect(() => {
    if (!firestore) return;
    fetchSales();
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

  const filteredSales = sales.filter((sale) =>
    sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">

      <ProtectedActionDialog
        open={!!saleToDelete}
        onOpenChange={(open) => !open && setSaleToDelete(null)}
        onConfirm={confirmDeleteSale}
        title={dictionary?.stockPage?.deleteTitle || "Delete Sale?"}
        description={dictionary?.stockPage?.deleteConfirmMessageSingle || "This action cannot be undone."}
        resourceName={sales.find(s => s.id === saleToDelete)?.product}
        dictionary={dictionary}
      />
      <div>
        <h1 className="text-3xl font-headline font-bold">
          {dictionary.dashboard.sales}
        </h1>
        <p className="text-muted-foreground">{dictionary.sales?.description || 'Manage your sales transactions.'}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{dictionary.sales?.title || 'Sales'}</CardTitle>
            <div className="flex items-center gap-4">
              {selectedSales.size > 0 && (
                <Button
                  variant="default"
                  onClick={() => {
                    const salesToProcess = sales.filter(s => selectedSales.has(s.id));
                    handleGenerateReceipt(salesToProcess);
                  }}
                >
                  {dictionary?.sales?.generateWrappedReceipt || 'Generate Grouped Receipt'} ({selectedSales.size})
                </Button>
              )}
              <Input
                placeholder={dictionary.sales?.searchPlaceholder || 'Search sales...'}
                className="w-full max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <LogSaleDialog dictionary={dictionary} onSaleAdded={fetchSales} />
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
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={filteredSales.length > 0 && selectedSales.size === filteredSales.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{dictionary.table?.product || 'Product'}</TableHead>
                  <TableHead className="hidden sm:table-cell">{dictionary.table?.customer || 'Customer'}</TableHead>
                  <TableHead className="hidden sm:table-cell">{dictionary.table?.date || 'Date'}</TableHead>
                  <TableHead className="hidden md:table-cell">{dictionary.table?.quantity || 'Quantity'}</TableHead>
                  <TableHead className="text-right">{dictionary.table?.amount || 'Amount'}</TableHead>
                  <TableHead>
                    <span className="sr-only">{dictionary.stockPage?.actions || 'Actions'}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {sales.length === 0 ? (dictionary.sales?.noDataTitle || 'No sales found. Log one to get started!') : (dictionary.sales?.noDataSearch || 'No sales match your search.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSales.has(sale.id)}
                          onCheckedChange={() => toggleSaleSelection(sale.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{sale.product}</TableCell>
                      <TableCell className="hidden sm:table-cell">{sale.customer}</TableCell>
                      <TableCell className="hidden sm:table-cell">{new Date(sale.date).toLocaleDateString()}</TableCell>
                      <TableCell className="hidden md:table-cell">{sale.quantity}</TableCell>
                      <TableCell className="text-right">{sale.amount.toFixed(2)} {dictionary?.dashboard?.currency || 'DZD'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">{dictionary?.table?.actions || 'Actions'}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{dictionary?.table?.actions || 'Actions'}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleGenerateReceipt([sale])}>
                              {dictionary?.sales?.generateReceipt || 'Generate Receipt'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setEditingSale(sale);
                              setEditDialogOpen(true);
                            }}>
                              {dictionary?.table?.edit || 'Edit'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSaleToDelete(sale.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              {dictionary?.table?.delete || 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            <span dangerouslySetInnerHTML={{
              __html: (dictionary.table?.showing || 'Showing <strong>1-{count}</strong> of <strong>{total}</strong>')
                .replace('{count}', filteredSales.length.toString())
                .replace('{total}', sales.length.toString())
            }} />
            {' '}
            {dictionary.sales?.itemName || 'sales'}
          </div>
        </CardFooter>
      </Card>
      {editingSale && (
        <EditSaleDialog
          sale={editingSale}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSaleUpdated={() => fetchSales()}
          dictionary={dictionary}
        />
      )}
    </div>
  );
}
