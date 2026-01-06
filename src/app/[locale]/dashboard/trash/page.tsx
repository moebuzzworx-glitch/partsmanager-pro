'use client';

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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Trash, Loader2 } from "lucide-react";
import { ProgressModal } from "@/components/ui/progress-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getDeletedProductsByUser, initDB, getPendingDeleteProductIds } from "@/lib/indexeddb";
import { hybridRestoreProduct, hybridPermanentlyDeleteProduct } from "@/lib/hybrid-import-v2";
import { useToast } from "@/hooks/use-toast";

export default function TrashPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = use(params);
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [dictionary, setDictionary] = useState<any>(null);
  const [allDeletedItems, setAllDeletedItems] = useState<any[]>([]);
  const [displayedItems, setDisplayedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actionProgress, setActionProgress] = useState(0);
  const [isActioning, setIsActioning] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);
  const LOAD_MORE_INCREMENT = 50;


  // Load dictionary
  useEffect(() => {
    const loadDictionary = async () => {
      const dict = await getDictionary(locale);
      setDictionary(dict);
    };
    loadDictionary();
  }, [locale]);

  // Update displayed items when displayLimit or allDeletedItems changes
  useEffect(() => {
    setDisplayedItems(allDeletedItems.slice(0, displayLimit));
  }, [displayLimit, allDeletedItems]);

  // Fetch deleted products from IndexedDB + Firebase
  useEffect(() => {
    if (!user?.uid) return;

    const fetchDeletedItems = async () => {
      try {
        setIsLoading(true);
        
        // Initialize IndexedDB
        await initDB();
        
        // Get pending delete IDs to exclude products still being deleted
        const pendingDeleteIds = await getPendingDeleteProductIds(user.uid);
        
        // STEP 1: Fetch deleted products from IndexedDB
        // Only show products already marked as deleted (not pending deletes)
        const deletedProducts = await getDeletedProductsByUser(user.uid);
        
        // Filter out products with pending delete operations
        const stableDeletedProducts = deletedProducts.filter(
          (product: any) => !pendingDeleteIds.includes(product.id)
        );
        
        const items = stableDeletedProducts.map((product: any) => ({
          id: product.id,
          name: product.name || '',
          reference: product.reference || '',
          sku: product.sku || '',
          stock: product.stock || 0,
          purchasePrice: product.purchasePrice || 0,
          price: product.price || 0,
          image: product.image,
          deletedAt: product.deletedAt,
        }));
        
        setAllDeletedItems(items);
        setDisplayedItems(items.slice(0, 50));
        setDisplayLimit(50);
        console.log(`✅ Loaded ${stableDeletedProducts.length} deleted products from IndexedDB (${pendingDeleteIds.length} pending deletes excluded)`);
        
        // STEP 2: Sync with Firebase in background
        try {
          const productsRef = collection(firestore, 'products');
          const q = query(productsRef, where('userId', '==', user.uid), where('isDeleted', '==', true));
          const querySnapshot = await getDocs(q);
          
          const freshDeletedProducts: any[] = [];
          
          // Process deleted products from Firebase
          for (const doc of querySnapshot.docs) {
            const firebaseData = doc.data();
            freshDeletedProducts.push({
              id: doc.id,
              name: firebaseData.name || '',
              reference: firebaseData.reference || '',
              sku: firebaseData.sku || '',
              stock: firebaseData.stock || 0,
              purchasePrice: firebaseData.purchasePrice || 0,
              price: firebaseData.price || 0,
              image: firebaseData.image,
              deletedAt: firebaseData.deletedAt,
            });
          }
          
          // Update with Firebase data
          if (freshDeletedProducts.length > 0) {
            setAllDeletedItems(freshDeletedProducts);
            setDisplayedItems(freshDeletedProducts.slice(0, 50));
            setDisplayLimit(50);
          }
          console.log(`✅ Updated from Firebase with ${freshDeletedProducts.length} deleted products`);
        } catch (firebaseErr) {
          console.warn('Failed to fetch from Firebase (using cached data):', firebaseErr);
        }
      } catch (error) {
        console.error('Error fetching deleted items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeletedItems();
  }, [user?.uid, firestore]);

  const handleRestore = async (productId: string) => {
    if (!user) return;
    
    setIsActioning(true);
    setActionProgress(0);
    try {
      // Restore product using new hybrid system (local + queued for Firebase)
      const product = allDeletedItems.find(p => p.id === productId);
      if (product) {
        await hybridRestoreProduct(user, productId, product);
      }
      
      // Update UI immediately - remove from deleted items
      const updated = allDeletedItems.filter(item => item.id !== productId);
      setAllDeletedItems(updated);
      setDisplayedItems(updated.slice(0, displayLimit));
      
      // Show progress completion
      setActionProgress(100);
      
      toast({
        title: dictionary?.table?.success || 'Success',
        description: dictionary?.trash?.restoreSuccess || 'Product restored successfully',
      });
    } catch (error) {
      console.error('Error restoring product:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: error instanceof Error ? error.message : (dictionary?.trash?.restoreErrorGeneral || 'An error occurred while restoring the product'),
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
      setActionProgress(0);
    }
  };

  const handlePermanentDelete = async (productId: string) => {
    if (!user) return;
    
    if (!confirm(dictionary?.trash?.confirmDeleteMessage || 'Are you sure you want to permanently delete this product? This action cannot be undone.')) {
      return;
    }
    
    setIsActioning(true);
    setActionProgress(0);
    try {
      // Permanently delete using hybrid system (queue for Firebase, local update)
      await hybridPermanentlyDeleteProduct(user, productId);
      
      // Update UI immediately - remove from deleted items
      const updated = allDeletedItems.filter(item => item.id !== productId);
      setAllDeletedItems(updated);
      setDisplayedItems(updated.slice(0, displayLimit));
      
      // Show progress completion
      setActionProgress(100);
      
      toast({
        title: dictionary?.table?.success || 'Success',
        description: dictionary?.trash?.deleteSuccess || 'Product permanently deleted',
      });
    } catch (error) {
      console.error('Error permanently deleting product:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: error instanceof Error ? error.message : (dictionary?.trash?.deleteErrorGeneral || 'An error occurred while deleting the product'),
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
      setActionProgress(0);
    }
  };

  const handleToggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === displayedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(displayedItems.map(item => item.id)));
    }
  };

  const handleBatchRestore = async () => {
    if (selectedItems.size === 0) return;

    if (!user) return;

    setIsActioning(true);
    setActionProgress(0);
    try {
      const items = Array.from(selectedItems);
      const totalItems = items.length;
      let processedCount = 0;

      // Process each item and update progress
      for (const productId of items) {
        const product = allDeletedItems.find(p => p.id === productId);
        if (product) {
          await hybridRestoreProduct(user, productId, product);
        }
        processedCount++;
        setActionProgress(Math.round((processedCount / totalItems) * 100));
      }

      // Update UI immediately
      const updated = allDeletedItems.filter(item => !selectedItems.has(item.id));
      setAllDeletedItems(updated);
      setDisplayedItems(updated.slice(0, displayLimit));
      setSelectedItems(new Set());
      
      toast({
        title: dictionary?.table?.success || 'Success',
        description: dictionary?.trash?.batchRestoreSuccess?.replace('{count}', String(selectedItems.size)) || `${selectedItems.size} item(s) restored successfully`,
      });
    } catch (error) {
      console.error('Error batch restoring items:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: error instanceof Error ? error.message : (dictionary?.trash?.batchRestoreErrorGeneral || 'An error occurred while restoring items'),
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
      setActionProgress(0);
    }
  };

  const handleBatchPermanentDelete = async () => {
    if (selectedItems.size === 0) return;

    const confirmMessage = dictionary?.trash?.confirmBatchDelete?.replace('{count}', String(selectedItems.size)) || `Permanently delete ${selectedItems.size} item(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    if (!user) return;

    setIsActioning(true);
    setActionProgress(0);
    try {
      const items = Array.from(selectedItems);
      const totalItems = items.length;
      let processedCount = 0;

      // Process each item and update progress
      for (const productId of items) {
        await hybridPermanentlyDeleteProduct(user, productId);
        processedCount++;
        setActionProgress(Math.round((processedCount / totalItems) * 100));
      }

      // Update UI immediately
      const updated = allDeletedItems.filter(item => !selectedItems.has(item.id));
      setAllDeletedItems(updated);
      setDisplayedItems(updated.slice(0, displayLimit));
      setSelectedItems(new Set());
      
      toast({
        title: dictionary?.table?.success || 'Success',
        description: dictionary?.trash?.batchDeleteSuccess?.replace('{count}', String(selectedItems.size)) || `${selectedItems.size} item(s) permanently deleted`,
      });
    } catch (error) {
      console.error('Error batch deleting items:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: error instanceof Error ? error.message : (dictionary?.trash?.batchDeleteErrorGeneral || 'An error occurred while deleting items'),
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
      setActionProgress(0);
    }
  };

  if (!dictionary) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <ProgressModal
        isOpen={isActioning}
        progress={actionProgress}
        title="Processing"
        message="Processing your request..."
        isCancelable={false}
      />
      <div>
        <h1 className="text-3xl font-headline font-bold">
          {dictionary.dashboard.trash}
        </h1>
        <p className="text-muted-foreground">
          {dictionary.trash?.description || 'View and restore deleted items.'}
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{dictionary.trash?.title || 'Deleted Items'}</CardTitle>
            {selectedItems.size > 0 && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBatchRestore}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {dictionary?.trash?.restoreSelected || 'Restore Selected'} ({selectedItems.size})
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBatchPermanentDelete}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {dictionary?.trash?.deleteSelectedPermanently || 'Delete Permanently'} ({selectedItems.size})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox 
                    checked={selectedItems.size === displayedItems.length && displayedItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>{dictionary.table?.product || 'Product'}</TableHead>
                <TableHead className="hidden md:table-cell">{dictionary.table?.sku || 'SKU'}</TableHead>
                <TableHead className="text-right">{dictionary.stockPage?.actions || 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedItems.map((product) => (
                <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedItems.has(product.id)}
                        onCheckedChange={() => handleToggleSelect(product.id)}
                      />
                    </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.reference}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRestore(product.id)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {dictionary?.trash?.restore || 'Restore'}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handlePermanentDelete(product.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {dictionary?.trash?.deletePermanently || 'Delete Permanently'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
                {displayedItems.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            {dictionary.trash?.noData || 'No deleted items.'}
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
          {displayLimit < allDeletedItems.length && (
            <div className="flex justify-center mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setDisplayLimit(displayLimit + LOAD_MORE_INCREMENT)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
