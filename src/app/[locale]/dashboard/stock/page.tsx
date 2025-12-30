'use client';

export const dynamic = 'force-dynamic';

import { MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ProgressModal } from "@/components/ui/progress-modal";

import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/lib/config";
import { cn } from "@/lib/utils";
import { AddProductDialog } from "@/components/dashboard/add-product-dialog";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { bulkDeleteViaAPI } from "@/lib/api-bulk-operations";
import { useToast } from "@/hooks/use-toast";
import { getProductsByUser, getStorageSize, initDB } from "@/lib/indexeddb";
import { useOffline } from "@/hooks/use-offline";

interface Product {
  id: string;
  name: string;
  sku?: string;
  reference?: string;
  brand?: string;
  stock?: number;
  quantity?: number;
  purchasePrice?: number;
  price?: number;
}

export default function StockPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [displayLimit, setDisplayLimit] = useState(50); // Initial load: 50 items
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const LOAD_MORE_INCREMENT = 50;

  const fetchProducts = async () => {
    if (!firestore || !user?.uid) return;
    try {
      setIsLoading(true);
      
      // Initialize IndexedDB
      await initDB();
      
      // STEP 1: Try to load from IndexedDB first (instant)
      let fetchedProducts: Product[] = [];
      try {
        const cachedProducts = await getProductsByUser(user.uid);
        if (cachedProducts && cachedProducts.length > 0) {
          fetchedProducts = cachedProducts.map((doc: any) => ({
            id: doc.id,
            name: doc.name || '',
            sku: doc.reference || '',
            reference: doc.reference || '',
            brand: doc.brand || '',
            stock: doc.stock || 0,
            quantity: doc.stock || 0,
            purchasePrice: doc.purchasePrice || 0,
            price: doc.price || 0,
          }));
          console.log(`✅ Loaded ${fetchedProducts.length} products from IndexedDB`);
        }
      } catch (localErr) {
        console.warn('Failed to load from IndexedDB:', localErr);
      }
      
      // Display cached products immediately
      setProducts(fetchedProducts);
      setDisplayedProducts(fetchedProducts.slice(0, 50));
      setDisplayLimit(50);
      
      // STEP 2: Sync with Firebase in background (async, doesn't block UI)
      try {
        const productsRef = collection(firestore, 'products');
        const q = query(productsRef, where('deleted', '!=', true), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const freshProducts: Product[] = [];
        querySnapshot.forEach((doc) => {
          freshProducts.push({
            id: doc.id,
            name: doc.data().name || '',
            sku: doc.data().reference || '',
            reference: doc.data().reference || '',
            brand: doc.data().brand || '',
            stock: doc.data().stock || 0,
            quantity: doc.data().stock || 0,
            purchasePrice: doc.data().purchasePrice || 0,
            price: doc.data().price || 0,
          });
        });
        
        // Only update if we got fresh data from Firebase
        // If freshProducts is empty, it might mean sync hasn't completed yet, so keep IndexedDB data
        if (freshProducts.length > 0) {
          setProducts(freshProducts);
          setDisplayedProducts(freshProducts.slice(0, 50));
          setDisplayLimit(50);
        }
        console.log(`✅ Updated from Firebase with ${freshProducts.length} products`);
      } catch (firebaseErr) {
        console.warn('Failed to fetch from Firebase (using cached data):', firebaseErr);
        // Data remains from IndexedDB
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update displayed products when search or displayLimit changes
  useEffect(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setDisplayedProducts(filtered.slice(0, displayLimit));
  }, [searchTerm, products, displayLimit]);

  // Load dictionary
  useEffect(() => {
    const loadDictionary = async () => {
      const dict = await getDictionary(locale);
      setDictionary(dict);
    };
    loadDictionary();
  }, [locale]);

  // Fetch products from Firestore
  useEffect(() => {
    if (!firestore) return;
    fetchProducts();
  }, [firestore]);

  const handleDeleteProduct = async (productId: string) => {
    if (!user) return;
    
    setIsDeleting(true);
    setDeleteProgress(0);
    try {
      // Call API endpoint for single delete
      await bulkDeleteViaAPI(user, [productId], 'products', (progress: number) => {
        setDeleteProgress(progress);
      });
      setProducts(products.filter(p => p.id !== productId));
      toast({
        title: d.deletedSuccessTitle || 'Success',
        description: d.deletedSuccessMessageSingle || 'Product moved to trash',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: d.deleteErrorTitle || 'Error',
        description: error instanceof Error ? error.message : (d.deleteErrorGeneralSingle || 'An error occurred while deleting the product'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
    }
  };

  const handleToggleSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === displayedProducts.length && displayedProducts.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(displayedProducts.map(p => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) return;

    const confirmMessage = (d.deleteConfirmMessage || 'Delete {count} product(s)? They will be moved to trash.')
      .replace('{count}', selectedProducts.size.toString());
    
    if (!confirm(confirmMessage)) {
      return;
    }

    if (!user) return;

    setIsDeleting(true);
    setDeleteProgress(0);
    try {
      // Call API endpoint for bulk delete (server-side batching)
      await bulkDeleteViaAPI(user, Array.from(selectedProducts), 'products', (progress: number) => {
        setDeleteProgress(progress);
      });

      // Remove deleted items from local state
      setProducts(products.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      toast({
        title: d.deletedSuccessTitle || 'Success',
        description: (d.deletedSuccessMessage || '{count} product(s) moved to trash')
          .replace('{count}', selectedProducts.size.toString()),
      });
    } catch (error) {
      console.error('Error batch deleting products:', error);
      toast({
        title: d.deleteErrorTitle || 'Error',
        description: error instanceof Error ? error.message : (d.deleteErrorGeneral || 'An error occurred while deleting products'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
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

  const d = dictionary.stockPage;
  const totalFilteredCount = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  ).length;

  return (
    <div className="space-y-8">
      <ProgressModal
        isOpen={isDeleting}
        progress={deleteProgress}
        title="Deleting Products"
        message={`Deleting ${selectedProducts.size} product(s)...`}
        isCancelable={false}
      />
      <div>
        <h1 className="text-3xl font-headline font-bold">{d.title}</h1>
        <p className="text-muted-foreground">{d.description}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{d.product}</CardTitle>
            <div className="flex items-center gap-2">
              {selectedProducts.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBatchDelete}
                >
                  {d.deleteSelected || 'Delete Selected'} ({selectedProducts.size})
                </Button>
              )}
              <Input 
                placeholder={d.searchPlaceholder} 
                className="w-full max-w-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <AddProductDialog dictionary={dictionary} onProductAdded={fetchProducts} />
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
                      checked={selectedProducts.size === displayedProducts.length && displayedProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{d.designation}</TableHead>
                  <TableHead>{d.reference}</TableHead>
                  <TableHead>{d.brand}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.stock}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.purchasePrice}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.sellingPrice}</TableHead>
                  <TableHead className="w-[50px]">
                    <span className="sr-only">{d.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {products.length === 0 ? (d.noDataTitle || 'No products found. Add one to get started!') : (d.noDataSearch || 'No products match your search.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="w-[50px]">
                        <Checkbox 
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => handleToggleSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.brand}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.quantity}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.purchasePrice?.toFixed(2)} {dictionary?.dashboard?.currency || 'DZD'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.price?.toFixed(2)} {dictionary?.dashboard?.currency || 'DZD'}
                      </TableCell>
                      <TableCell className="w-[50px]">
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
                            <DropdownMenuItem>{d.edit}</DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => handleDeleteProduct(product.id)}
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
        <CardFooter className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Showing <strong>{displayedProducts.length}</strong> of <strong>{totalFilteredCount}</strong> {d.itemName || 'products'}
          </div>
          {displayedProducts.length < totalFilteredCount && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDisplayLimit(prev => prev + LOAD_MORE_INCREMENT)}
            >
              Load More
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
