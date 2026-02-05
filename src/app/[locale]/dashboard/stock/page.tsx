'use client';

import { EditProductDialog } from "@/components/dashboard/edit-product-dialog";

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
import { hybridDeleteProduct } from "@/lib/hybrid-import-v2";
import { useToast } from "@/hooks/use-toast";
import { getProductsByUserExcludingPending, getStorageSize, initDB } from "@/lib/indexeddb";
import { useOffline } from "@/hooks/use-offline";
import { ProtectedActionDialog } from "@/components/protected-action-dialog";

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

  // Protection State
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchProducts = async () => {
    if (!firestore || !user?.uid) return;
    try {
      setIsLoading(true);

      // Initialize IndexedDB
      await initDB();

      // STEP 1: Try to load from IndexedDB first (instant)
      let fetchedProducts: Product[] = [];
      try {
        // Fetch active products, excluding those with pending deletes
        const cachedProducts = await getProductsByUserExcludingPending(user.uid);
        if (cachedProducts && cachedProducts.length > 0) {
          // Map products to display format
          fetchedProducts = cachedProducts
            .map((doc: any) => ({
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
          console.log(`✅ Loaded ${fetchedProducts.length} active products from IndexedDB (deleted products preserved for restore)`);
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
        const q = query(productsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        const freshProducts: Product[] = [];

        // Process all documents for display (filtering only)
        for (const doc of querySnapshot.docs) {
          const firebaseData = doc.data();

          if (firebaseData.isDeleted !== true) {
            freshProducts.push({
              id: doc.id,
              name: firebaseData.name || '',
              sku: firebaseData.reference || '',
              reference: firebaseData.reference || '',
              brand: firebaseData.brand || '',
              stock: firebaseData.stock || 0,
              quantity: firebaseData.stock || 0,
              purchasePrice: firebaseData.purchasePrice || 0,
              price: firebaseData.price || 0,
            });
          }
        }

        console.log(`[Stock] Fetched ${freshProducts.length} active products from Firebase`);

        if (freshProducts.length > 0) {
          const mergedProducts: Product[] = [];
          const seenIds = new Set<string>();

          for (const fresh of freshProducts) {
            mergedProducts.push(fresh);
            seenIds.add(fresh.id);
          }

          for (const existing of fetchedProducts) {
            if (!seenIds.has(existing.id) && existing.isDeleted !== true) {
              mergedProducts.push(existing);
            }
          }

          console.log(`[Stock] Merged: ${freshProducts.length} from Firebase + ${mergedProducts.length - freshProducts.length} new local = ${mergedProducts.length} total`);
          setProducts(mergedProducts);
          setDisplayedProducts(mergedProducts.slice(0, 50));
          setDisplayLimit(50);
        }
        console.log(`✅ Updated from Firebase with ${freshProducts.length} products`);
      } catch (firebaseErr) {
        console.warn('Failed to fetch from Firebase (using cached data):', firebaseErr);
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

  const executeDeleteProduct = async (productId: string) => {
    if (!user) return;

    setIsDeleting(true);
    setDeleteProgress(0);
    try {
      await hybridDeleteProduct(user, productId);

      setProducts(products.filter(p => p.id !== productId));
      setDeleteProgress(100);

      toast({
        title: dictionary?.stockPage?.deletedSuccessTitle || 'Success',
        description: dictionary?.stockPage?.deletedSuccessMessageSingle || 'Product moved to trash',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: dictionary?.stockPage?.deleteErrorTitle || 'Error',
        description: error instanceof Error ? error.message : (dictionary?.stockPage?.deleteErrorGeneralSingle || 'An error occurred while deleting the product'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
      setProductToDelete(null); // Close dialog
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

  const executeBatchDelete = async () => {
    // No redundant confirmation here, handled by Dialog
    if (selectedProducts.size === 0) return;
    if (!user) return;

    setIsDeleting(true);
    setDeleteProgress(0);
    try {
      const productIds = Array.from(selectedProducts);
      const totalProducts = productIds.length;
      let processedCount = 0;

      for (const productId of productIds) {
        await hybridDeleteProduct(user, productId);
        processedCount++;
        setDeleteProgress(Math.round((processedCount / totalProducts) * 100));
      }

      setProducts(products.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      toast({
        title: dictionary?.stockPage?.deletedSuccessTitle || 'Success',
        description: (dictionary?.stockPage?.deletedSuccessMessage || '{count} product(s) moved to trash')
          .replace('{count}', selectedProducts.size.toString()),
      });
    } catch (error) {
      console.error('Error batch deleting products:', error);
      toast({
        title: dictionary?.stockPage?.deleteErrorTitle || 'Error',
        description: error instanceof Error ? error.message : (dictionary?.stockPage?.deleteErrorGeneral || 'An error occurred while deleting products'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
      setConfirmBatchDelete(false); // Close dialog
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
      <ProtectedActionDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        onConfirm={() => productToDelete && executeDeleteProduct(productToDelete)}
        title={dictionary?.stockPage?.deleteTitle || "Delete Product?"}
        description={dictionary?.stockPage?.deleteConfirmMessageSingle || "This requires your deletion password."}
        resourceName={products.find(p => p.id === productToDelete)?.name}
        dictionary={dictionary}
      />

      <ProtectedActionDialog
        open={confirmBatchDelete}
        onOpenChange={setConfirmBatchDelete}
        onConfirm={executeBatchDelete}
        title={d.deleteMultipleTitle || "Delete Multiple Products?"}
        description={(d.deleteMultipleDescription || "This will delete {count} products. This requires your deletion password.")
          .replace('{count}', selectedProducts.size.toString())}
        dictionary={dictionary}
      />

      <ProgressModal
        isOpen={isDeleting}
        progress={deleteProgress}
        title={d.deletingTitle || "Deleting Products"}
        message={(d.deletingMessage || "Deleting {count} product(s)...")
          .replace('{count}', (selectedProducts.size > 0 ? selectedProducts.size : 1).toString())}
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
                  onClick={() => setConfirmBatchDelete(true)}
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
              <AddProductDialog dictionary={dictionary} onProductAdded={fetchProducts} products={products} />
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
                            <DropdownMenuItem onClick={() => {
                              setEditingProduct(product);
                              setEditDialogOpen(true);
                            }}>
                              {d.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setProductToDelete(product.id)}
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
            <span dangerouslySetInnerHTML={{
              __html: (d.showingResult || 'Showing <strong>{count}</strong> of <strong>{total}</strong> {items}')
                .replace('{count}', displayedProducts.length.toString())
                .replace('{total}', totalFilteredCount.toString())
                .replace('{items}', d.product ? (totalFilteredCount > 1 ? (d.product + 's') : d.product) : 'products')
            }} />
          </div>
          {displayedProducts.length < totalFilteredCount && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayLimit(prev => prev + LOAD_MORE_INCREMENT)}
            >
              {d.loadMore || 'Load More'}
            </Button>
          )}
        </CardFooter>
      </Card>
      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onProductUpdated={() => {
            fetchProducts();
          }}
          dictionary={dictionary}
        />
      )}
    </div>
  );
}
