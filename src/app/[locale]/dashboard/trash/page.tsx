'use client';

import Image from "next/image";
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
import { RotateCcw, Trash, Loader2 } from "lucide-react";
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
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [dictionary, setDictionary] = useState<any>(null);
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!firestore) return;

    const fetchDeletedItems = async () => {
      try {
        setIsLoading(true);
        const productsRef = collection(firestore, 'products');
        const deletedSnap = await getDocs(
          query(productsRef, where('isDeleted', '==', true))
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
  }, [firestore]);

  const handleRestore = async (productId: string) => {
    if (!firestore) return;
    
    try {
      const success = await restoreFromTrash(firestore, productId);
      if (success) {
        setDeletedItems(deletedItems.filter(item => item.id !== productId));
        toast({
          title: 'Success',
          description: 'Product restored successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to restore product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error restoring product:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while restoring the product',
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDelete = async (productId: string) => {
    if (!firestore) return;
    
    if (!confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) {
      return;
    }
    
    try {
      const success = await permanentlyDelete(firestore, productId);
      if (success) {
        setDeletedItems(deletedItems.filter(item => item.id !== productId));
        toast({
          title: 'Success',
          description: 'Product permanently deleted',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to permanently delete product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error permanently deleting product:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the product',
        variant: 'destructive',
      });
    }
  };

  if (!dictionary) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">
          {dictionary.dashboard.trash}
        </h1>
        <p className="text-muted-foreground">
          View and restore deleted items.
        </p>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Deleted Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedItems.map((product) => (
                <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
                        <Image
                        alt={product.name}
                        className="aspect-square rounded-md object-cover"
                        height="40"
                        src={product.image || 'https://via.placeholder.com/40'}
                        width="40"
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
                      Restore
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handlePermanentDelete(product.id)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Permanently
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
                {deletedItems.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No deleted items.
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
