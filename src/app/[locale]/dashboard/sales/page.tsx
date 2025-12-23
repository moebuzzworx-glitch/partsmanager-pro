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
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, where } from "firebase/firestore";

interface Sale {
  id: string;
  product: string;
  customer: string;
  date: string;
  quantity: number;
  amount: number;
}

export default function SalesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const { firestore } = useFirebase();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load dictionary
  useEffect(() => {
    const loadDictionary = async () => {
      const dict = await getDictionary(locale);
      setDictionary(dict);
    };
    loadDictionary();
  }, [locale]);

  const fetchSales = async () => {
    if (!firestore) return;
    try {
      setIsLoading(true);
      const salesRef = collection(firestore, 'sales');
      const q = query(salesRef);
      const querySnapshot = await getDocs(q);
      
      const fetchedSales: Sale[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedSales.push({
          id: doc.id,
          product: data.product || '',
          customer: data.customer || '',
          date: data.date ? new Date(data.date.toDate?.() || data.date).toISOString() : new Date().toISOString(),
          quantity: data.quantity || 0,
          amount: data.amount || 0,
        });
      });

      setSales(fetchedSales);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoading(false);
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {sales.length === 0 ? (dictionary.sales?.noDataTitle || 'No sales found. Log one to get started!') : (dictionary.sales?.noDataSearch || 'No sales match your search.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
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
                            <DropdownMenuItem>{dictionary?.table?.edit || 'Edit'}</DropdownMenuItem>
                            <DropdownMenuItem>{dictionary?.table?.delete || 'Delete'}</DropdownMenuItem>
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
            {(dictionary.table?.showingText || 'Showing').replace('{start}', '1').replace('{end}', String(filteredSales.length)).replace('{total}', String(sales.length))} <strong>1-{filteredSales.length}</strong> {dictionary.table?.of || 'of'} <strong>{sales.length}</strong> {dictionary.sales?.itemName || 'sales'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
