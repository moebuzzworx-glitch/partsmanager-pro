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
import { restoreFromTrash, permanentlyDelete } from "@/lib/trash-utils";
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
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actionProgress, setActionProgress] = useState(0);
  const [isActioning, setIsActioning] = useState(false);


  // Load dictionary
  useEffect(() => {
    const loadDictionary = async () => {
      const dict = await getDictionary(locale);
      setDictionary(dict);
    };
    loadDictionary();
  }, [locale]);

  // Fetch deleted products from Firestore
  useEffect(() => {
    if (!firestore || !user?.uid) return;

    const fetchDeletedItems = async () => {
      try {
        setIsLoading(true);
        const productsRef = collection(firestore, 'products');
        const deletedSnap = await getDocs(
          query(productsRef, where('isDeleted', '==', true), where('userId', '==', user.uid))
        );

        const items = deletedSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          reference: doc.data().reference,
          sku: doc.data().sku,
          image: doc.data().image,
          deletedAt: doc.data().deletedAt,
        }));
        setDeletedItems(items);
      } catch (error) {
        console.error('Error fetching deleted items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeletedItems();
  }, [firestore, user?.uid]);

  const handleRestore = async (productId: string) => {
    if (!firestore) return;
    
    setIsActioning(true);
    setActionProgress(0);
    try {
      const success = await restoreFromTrash(firestore, productId, (progress) => {
        setActionProgress(progress);
      });
      if (success) {
        setDeletedItems(deletedItems.filter(item => item.id !== productId));
        toast({
          title: dictionary?.table?.success || 'Success',
          description: dictionary?.trash?.restoreSuccess || 'Product restored successfully',
        });
      } else {
        toast({
          title: dictionary?.table?.error || 'Error',
          description: dictionary?.trash?.restoreError || 'Failed to restore product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error restoring product:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: dictionary?.trash?.restoreErrorGeneral || 'An error occurred while restoring the product',
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
      setActionProgress(0);
    }
  };

  const handlePermanentDelete = async (productId: string) => {
    if (!firestore) return;
    
    if (!confirm(dictionary?.trash?.confirmDeleteMessage || 'Are you sure you want to permanently delete this product? This action cannot be undone.')) {
      return;
    }
    
    setIsActioning(true);
    setActionProgress(0);
    try {
      const success = await permanentlyDelete(firestore, productId, (progress) => {
        setActionProgress(progress);
      });
      if (success) {
        setDeletedItems(deletedItems.filter(item => item.id !== productId));
        toast({
          title: dictionary?.table?.success || 'Success',
          description: dictionary?.trash?.deleteSuccess || 'Product permanently deleted',
        });
      } else {
        toast({
          title: dictionary?.table?.error || 'Error',
          description: dictionary?.trash?.deleteError || 'Failed to permanently delete product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error permanently deleting product:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: dictionary?.trash?.deleteErrorGeneral || 'An error occurred while deleting the product',
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
    if (selectedItems.size === deletedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(deletedItems.map(item => item.id)));
    }
  };

  const handleBatchRestore = async () => {
    if (selectedItems.size === 0) return;

    if (!firestore) return;

    setIsActioning(true);
    setActionProgress(0);
    try {
      const success = await restoreFromTrash(firestore, Array.from(selectedItems), (progress) => {
        setActionProgress(progress);
      });
      if (success) {
        setDeletedItems(deletedItems.filter(item => !selectedItems.has(item.id)));
        setSelectedItems(new Set());
        toast({
          title: dictionary?.table?.success || 'Success',
          description: dictionary?.trash?.batchRestoreSuccess?.replace('{count}', String(selectedItems.size)) || `${selectedItems.size} item(s) restored successfully`,
        });
      } else {
        toast({
          title: dictionary?.table?.error || 'Error',
          description: dictionary?.trash?.batchRestoreError || 'Failed to restore items',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error batch restoring items:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: dictionary?.trash?.batchRestoreErrorGeneral || 'An error occurred while restoring items',
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

    if (!firestore) return;

    setIsActioning(true);
    setActionProgress(0);
    try {
      const success = await permanentlyDelete(firestore, Array.from(selectedItems), (progress) => {
        setActionProgress(progress);
      });
      if (success) {
        setDeletedItems(deletedItems.filter(item => !selectedItems.has(item.id)));
        setSelectedItems(new Set());
        toast({
          title: dictionary?.table?.success || 'Success',
          description: dictionary?.trash?.batchDeleteSuccess?.replace('{count}', String(selectedItems.size)) || `${selectedItems.size} item(s) permanently deleted`,
        });
      } else {
        toast({
          title: dictionary?.table?.error || 'Error',
          description: dictionary?.trash?.batchDeleteError || 'Failed to delete items',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error batch deleting items:', error);
      toast({
        title: dictionary?.table?.error || 'Error',
        description: dictionary?.trash?.batchDeleteErrorGeneral || 'An error occurred while deleting items',
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
                    checked={selectedItems.size === deletedItems.length && deletedItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>{dictionary.table?.product || 'Product'}</TableHead>
                <TableHead className="hidden md:table-cell">{dictionary.table?.sku || 'SKU'}</TableHead>
                <TableHead className="text-right">{dictionary.stockPage?.actions || 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedItems.map((product) => (
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
                {deletedItems.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            {dictionary.trash?.noData || 'No deleted items.'}
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
