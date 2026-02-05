'use client';

export const dynamic = 'force-dynamic';

import { MoreHorizontal, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { use } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/lib/config";
import { AddSupplierDialog } from "@/components/dashboard/add-supplier-dialog";
import { EditSupplierDialog } from "@/components/dashboard/edit-supplier-dialog";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, deleteDoc, doc, where } from "firebase/firestore";
import { ProtectedActionDialog } from "@/components/protected-action-dialog";

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contactName?: string;
  address?: string;
  rc?: string;
  nis?: string;
  nif?: string;
  rib?: string;
}

export default function SuppliersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const { firestore, user } = useFirebase();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  const confirmDeleteSupplier = async () => {
    if (!firestore || !supplierToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'suppliers', supplierToDelete));
      setSuppliers(prev => prev.filter(s => s.id !== supplierToDelete));
    } catch (error) {
      console.error('Error deleting supplier:', error);
    } finally {
      setSupplierToDelete(null);
    }
  };

  const fetchSuppliers = async () => {
    if (!firestore || !user?.uid) return;
    try {
      setIsLoading(true);
      const suppliersRef = collection(firestore, 'suppliers');
      const q = query(suppliersRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const fetchedSuppliers: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        fetchedSuppliers.push({
          id: doc.id,
          name: doc.data().name || '',
          email: doc.data().email || '',
          phone: doc.data().phone || '',
          contactName: doc.data().contactName || '',
          address: doc.data().address || '',
          rc: doc.data().rc || '',
          nis: doc.data().nis || '',
          nif: doc.data().nif || '',
          rib: doc.data().rib || '',
        });
      });

      setSuppliers(fetchedSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
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

  // Fetch suppliers from Firestore
  useEffect(() => {
    if (!firestore) return;
    fetchSuppliers();
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

  const d = dictionary.stockPage; // Using stockPage translations for now
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <ProtectedActionDialog
        open={!!supplierToDelete}
        onOpenChange={(open) => !open && setSupplierToDelete(null)}
        onConfirm={confirmDeleteSupplier}
        title={dictionary.suppliers?.deleteTitle || "Delete Supplier?"}
        description={dictionary.suppliers?.deleteConfirmMessage || "This requires your deletion password."}
        resourceName={suppliers.find(s => s.id === supplierToDelete)?.name}
        dictionary={dictionary}
      />
      <div>
        <h1 className="text-3xl font-headline font-bold">{dictionary.dashboard.suppliers}</h1>
        <p className="text-muted-foreground">{dictionary.suppliers?.description || 'Manage your supplier information.'}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{dictionary.suppliers?.title || 'Suppliers'}</CardTitle>
            <div className="flex items-center gap-4">
              <Input
                placeholder={dictionary.suppliers?.searchPlaceholder || 'Search suppliers...'}
                className="w-full max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <AddSupplierDialog dictionary={dictionary} onSupplierAdded={fetchSuppliers} />
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
                  <TableHead>{dictionary.table?.name || 'Name'}</TableHead>
                  <TableHead className="hidden md:table-cell">{dictionary.table?.email || 'Email'}</TableHead>
                  <TableHead className="hidden md:table-cell">{dictionary.table?.phone || 'Phone'}</TableHead>
                  <TableHead>
                    <span className="sr-only">{d.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {suppliers.length === 0 ? (dictionary.suppliers?.noDataTitle || 'No suppliers found. Add one to get started!') : (dictionary.suppliers?.noDataSearch || 'No suppliers match your search.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}
                        <div className="text-xs text-muted-foreground md:hidden">
                          {supplier.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {supplier.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {supplier.phone}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">{d.actions}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{d.actions}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setEditingSupplier(supplier);
                              setEditDialogOpen(true);
                            }}>
                              {d.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSupplierToDelete(supplier.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              {d.delete}
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
                .replace('{count}', filteredSuppliers.length.toString())
                .replace('{total}', suppliers.length.toString())
            }} />
            {' '}
            {dictionary.suppliers?.itemName || 'suppliers'}
          </div>
        </CardFooter>
      </Card>

      {editingSupplier && (
        <EditSupplierDialog
          supplier={editingSupplier}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSupplierUpdated={() => {
            setEditDialogOpen(false);
            setEditingSupplier(null);
            // Refresh suppliers
            const refreshSuppliers = async () => {
              if (!firestore || !user?.uid) return;
              try {
                const suppliersRef = collection(firestore, 'suppliers');
                const q = query(suppliersRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);

                const fetchedSuppliers: Supplier[] = [];
                querySnapshot.forEach((doc) => {
                  fetchedSuppliers.push({
                    id: doc.id,
                    name: doc.data().name || '',
                    email: doc.data().email || '',
                    phone: doc.data().phone || '',
                    contactName: doc.data().contactName || '',
                    address: doc.data().address || '',
                    rc: doc.data().rc || '',
                    nis: doc.data().nis || '',
                    nif: doc.data().nif || '',
                    rib: doc.data().rib || '',
                  });
                });
                setSuppliers(fetchedSuppliers);
              } catch (error) {
                console.error('Error fetching suppliers:', error);
              }
            };
            refreshSuppliers();
          }}
          dictionary={dictionary}
        />
      )}
    </div>
  );
}
