'use client';

export const dynamic = 'force-dynamic';

import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
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
import { LogPurchaseDialog } from "@/components/dashboard/log-purchase-dialog";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, deleteDoc, doc, where } from "firebase/firestore";
import { ProtectedActionDialog } from "@/components/protected-action-dialog";

interface PurchaseItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Purchase {
  id: string;
  supplier: string;
  date: string;
  items: PurchaseItem[];
  totalAmount: number;
}

export default function PurchasesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const { firestore, user } = useFirebase();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null);

  const confirmDeletePurchase = async () => {
    if (!firestore || !purchaseToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'purchases', purchaseToDelete));
      setPurchases(prev => prev.filter(p => p.id !== purchaseToDelete));
    } catch (error) {
      console.error('Error deleting purchase:', error);
    } finally {
      setPurchaseToDelete(null);
    }
  };

  const fetchPurchases = async () => {
    if (!firestore || !user?.uid) return;
    try {
      setIsLoading(true);
      const purchasesRef = collection(firestore, 'purchases');
      const q = query(purchasesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const fetchedPurchases: Purchase[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPurchases.push({
          id: doc.id,
          supplier: data.supplier || '',
          date: data.date ? new Date(data.date.toDate?.() || data.date).toISOString() : new Date().toISOString(),
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
        });
      });

      setPurchases(fetchedPurchases);
    } catch (error) {
      console.error('Error fetching purchases:', error);
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

  // Fetch purchases from Firestore
  useEffect(() => {
    if (!firestore) return;
    fetchPurchases();
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

  const filteredPurchases = purchases.filter((purchase) =>
    purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.items.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <ProtectedActionDialog
        open={!!purchaseToDelete}
        onOpenChange={(open) => !open && setPurchaseToDelete(null)}
        onConfirm={confirmDeletePurchase}
        title={dictionary?.stockPage?.deleteTitle || "Delete Purchase?"}
        description={dictionary?.stockPage?.deleteConfirmMessageSingle || "This action cannot be undone."}
        resourceName={purchases.find(p => p.id === purchaseToDelete)?.supplier}
      />
      <div>
        <h1 className="text-3xl font-headline font-bold">
          {dictionary.dashboard.purchases}
        </h1>
        <p className="text-muted-foreground">{dictionary.purchases?.description || 'Manage your purchase orders.'}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{dictionary.purchases?.title || 'Purchases'}</CardTitle>
            <div className="flex items-center gap-4">
              <Input
                placeholder={dictionary.purchases?.searchPlaceholder || 'Search purchases...'}
                className="w-full max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <LogPurchaseDialog dictionary={dictionary} onPurchaseAdded={fetchPurchases} />
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
                  <TableHead>{dictionary.table?.items || 'Items'}</TableHead>
                  <TableHead className="hidden sm:table-cell">{dictionary.table?.supplier || 'Supplier'}</TableHead>
                  <TableHead className="hidden sm:table-cell">{dictionary.table?.date || 'Date'}</TableHead>
                  <TableHead className="text-right">{dictionary.table?.totalAmount || 'Total Amount'}</TableHead>
                  <TableHead>
                    <span className="sr-only">{dictionary.stockPage?.actions || 'Actions'}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {purchases.length === 0 ? (dictionary.purchases?.noDataTitle || 'No purchases found. Log one to get started!') : (dictionary.purchases?.noDataSearch || 'No purchases match your search.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">
                        <div className="text-sm">
                          {purchase.items.map((item, idx) => (
                            <div key={idx} className="flex gap-2">
                              <span>{item.description}</span>
                              <span className="text-muted-foreground">({item.quantity}x @ {item.unitPrice.toFixed(2)} {dictionary?.dashboard?.currency || 'DZD'})</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{purchase.supplier}</TableCell>
                      <TableCell className="hidden sm:table-cell">{new Date(purchase.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-medium">{purchase.totalAmount.toFixed(2)} {dictionary?.dashboard?.currency || 'DZD'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setPurchaseToDelete(purchase.id)} className="text-destructive">
                              Delete Purchase
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
            {(dictionary.table?.showingText || 'Showing').replace('{start}', '1').replace('{end}', String(filteredPurchases.length)).replace('{total}', String(purchases.length))} <strong>1-{filteredPurchases.length}</strong> {dictionary.table?.of || 'of'} <strong>{purchases.length}</strong> {dictionary.purchases?.itemName || 'purchases'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
