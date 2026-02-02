'use client';

export const dynamic = 'force-dynamic';

import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/lib/config";
import { useEffect, useState } from "react";
import { use } from "react";
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
import { AddCustomerDialog } from "@/components/dashboard/add-customer-dialog";
import { EditCustomerDialog } from "@/components/dashboard/edit-customer-dialog";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, deleteDoc, doc, where } from "firebase/firestore";
import { ProtectedActionDialog } from "@/components/protected-action-dialog";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  rc?: string;
  nis?: string;
  nif?: string;
}

export default function CustomersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const { firestore, user } = useFirebase();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const confirmDeleteCustomer = async () => {
    if (!firestore || !customerToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'customers', customerToDelete));
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete));
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setCustomerToDelete(null);
    }
  };

  const fetchCustomers = async () => {
    if (!firestore || !user?.uid) return;
    try {
      setIsLoading(true);
      const customersRef = collection(firestore, 'customers');
      const q = query(customersRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const fetchedCustomers: Customer[] = [];
      querySnapshot.forEach((doc) => {
        fetchedCustomers.push({
          id: doc.id,
          name: doc.data().name || '',
          email: doc.data().email || '',
          phone: doc.data().phone || '',
          address: doc.data().address || '',
          rc: doc.data().rc || '',
          nis: doc.data().nis || '',
          nif: doc.data().nif || '',
        });
      });

      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
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

  // Fetch customers from Firestore
  useEffect(() => {
    if (!firestore) return;
    fetchCustomers();
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

  const d = dictionary.stockPage; // Reuse some translations
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <ProtectedActionDialog
        open={!!customerToDelete}
        onOpenChange={(open) => !open && setCustomerToDelete(null)}
        onConfirm={confirmDeleteCustomer}
        title={dictionary.customers?.deleteTitle || "Delete Customer?"}
        description={dictionary.customers?.deleteConfirmMessage || "This requires your deletion password."}
        resourceName={customers.find(c => c.id === customerToDelete)?.name}
      />
      <div>
        <h1 className="text-3xl font-headline font-bold">
          {dictionary.dashboard.customers}
        </h1>
        <p className="text-muted-foreground">{dictionary.customers?.description || 'Manage your customer information.'}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{dictionary.customers?.title || 'Customers'}</CardTitle>
            <div className="flex items-center gap-4">
              <Input
                placeholder={dictionary.customers?.searchPlaceholder || 'Search customers...'}
                className="w-full max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <AddCustomerDialog dictionary={dictionary} onCustomerAdded={fetchCustomers} />
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
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {customers.length === 0 ? (dictionary.customers?.noDataTitle || 'No customers found. Add one to get started!') : (dictionary.customers?.noDataSearch || 'No customers match your search.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.name}
                        <div className="text-xs text-muted-foreground md:hidden">
                          {customer.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {customer.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {customer.phone}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">{d.actions}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{d.actions}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              setEditingCustomer(customer);
                              setEditDialogOpen(true);
                            }}>
                              {d.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setCustomerToDelete(customer.id)}
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
                .replace('{count}', filteredCustomers.length.toString())
                .replace('{total}', customers.length.toString())
            }} />
            {' '}
            {dictionary.customers?.itemName || 'customers'}
          </div>
        </CardFooter>
      </Card>

      {editingCustomer && (
        <EditCustomerDialog
          customer={editingCustomer}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onCustomerUpdated={() => {
            setEditDialogOpen(false);
            setEditingCustomer(null);
            // Refresh customers
            const refreshCustomers = async () => {
              if (!firestore) return;
              try {
                const customersRef = collection(firestore, 'customers');
                const q = query(customersRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);

                const fetchedCustomers: Customer[] = [];
                querySnapshot.forEach((doc) => {
                  fetchedCustomers.push({
                    id: doc.id,
                    name: doc.data().name || '',
                    email: doc.data().email || '',
                    phone: doc.data().phone || '',
                    address: doc.data().address || '',
                    rc: doc.data().rc || '',
                    nis: doc.data().nis || '',
                    nif: doc.data().nif || '',
                  });
                });
                setCustomers(fetchedCustomers);
              } catch (error) {
                console.error('Error fetching customers:', error);
              }
            };
            refreshCustomers();
          }}
        />
      )}
    </div>
  );
}
