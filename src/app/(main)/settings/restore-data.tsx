
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, Timestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

export function RestoreData() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);


  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);

  const { data: allProducts, isLoading } = useCollection<Product>(productsQuery);

  const deletedProducts = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter(p => p.deletedAt);
  }, [allProducts]);

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedProducts(deletedProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleRestore = async (productId: string) => {
    if (!firestore) return;
    const productRef = doc(firestore, 'products', productId);
    try {
      await updateDoc(productRef, {
        deletedAt: null,
      });
      toast({
        title: 'Product Restored',
        description: 'The product has been successfully restored to your inventory.',
      });
    } catch (err) {
      console.error('Error restoring product:', err);
      toast({
        title: 'Error',
        description: 'Could not restore the product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDelete = async (productId: string) => {
    if (!firestore) return;
    const productRef = doc(firestore, 'products', productId);
    try {
      await deleteDoc(productRef);
      toast({
        title: 'Product Permanently Deleted',
        description: 'The product has been permanently removed.',
      });
    } catch (err) {
      console.error('Error permanently deleting product:', err);
      toast({
        title: 'Error',
        description: 'Could not permanently delete the product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDeleteSelected = async () => {
    if (!firestore || selectedProducts.length === 0) return;

    const batch = writeBatch(firestore);
    selectedProducts.forEach(productId => {
      const productRef = doc(firestore, 'products', productId);
      batch.delete(productRef);
    });

    try {
      await batch.commit();
      toast({
        title: 'Products Permanently Deleted',
        description: `${selectedProducts.length} product(s) have been permanently removed.`,
      });
      setSelectedProducts([]);
    } catch (error) {
      console.error("Error permanently deleting products: ", error);
      toast({
        title: "Error",
        description: "Could not permanently delete the selected products. Please try again.",
        variant: "destructive",
      });
    }
  };


  const formatDate = (timestamp: Timestamp | Date | null | undefined) => {
    if (!timestamp) return 'N/A';
    const date = (timestamp as Timestamp).toDate ? (timestamp as Timestamp).toDate() : new Date(timestamp as Date);
    return date.toLocaleDateString();
  };

  const isAllSelected = selectedProducts.length > 0 && selectedProducts.length === deletedProducts.length;
  const isIndeterminate = selectedProducts.length > 0 && !isAllSelected;

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Restore Deleted Data</CardTitle>
          <CardDescription>
            Here you can find products that have been deleted. You can restore them or delete them permanently.
          </CardDescription>
        </div>
        {selectedProducts.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedProducts.length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete {selectedProducts.length} product(s) from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePermanentDeleteSelected}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    onCheckedChange={handleSelectAll}
                    checked={isAllSelected}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date Deleted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading deleted products...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && deletedProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No deleted products found.
                  </TableCell>
                </TableRow>
              )}
              {deletedProducts?.map((product) => (
                <TableRow key={product.id} data-state={selectedProducts.includes(product.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                        onCheckedChange={() => handleSelectProduct(product.id)}
                        checked={selectedProducts.includes(product.id)}
                        aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.reference}</TableCell>
                  <TableCell>{formatDate(product.deletedAt)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleRestore(product.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restore
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product
                            <span className="font-semibold"> {product.name} </span>
                             and remove its data from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handlePermanentDelete(product.id)}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
