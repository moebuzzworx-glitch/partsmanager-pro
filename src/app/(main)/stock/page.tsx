
'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AddProductDialog } from './add-product-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { EditProductDialog } from './edit-product-dialog';


export default function StockPage() {
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: products, isLoading } = useCollection<Product>(productsCollection);
  
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);


  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };
  
  const activeProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => !p.deletedAt);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!activeProducts) return [];
    if (!searchQuery) return activeProducts;
    const lowercasedQuery = searchQuery.toLowerCase();
    return activeProducts.filter(product =>
      (product.name && product.name.toLowerCase().includes(lowercasedQuery)) ||
      (typeof product.reference === 'string' && product.reference.toLowerCase().includes(lowercasedQuery)) ||
      (product.brand && product.brand.toLowerCase().includes(lowercasedQuery))
    );
  }, [activeProducts, searchQuery]);

  const handleSelectProduct = (productId: string, isSelected: boolean | 'indeterminate') => {
    if (isSelected) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
        setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
        setSelectedProducts([]);
    }
  };
  
  const isAllSelected = selectedProducts.length > 0 && selectedProducts.length === filteredProducts.length;

  const handleDelete = async (productIds: string[]) => {
    if (!firestore || productIds.length === 0) return;

    const batch = writeBatch(firestore);
    productIds.forEach(productId => {
        const productRef = doc(firestore, 'products', productId);
        batch.update(productRef, { deletedAt: serverTimestamp() });
    });

    try {
        await batch.commit();
        toast({
            title: `Product${productIds.length > 1 ? 's' : ''} Deleted`,
            description: `${productIds.length} product(s) have been moved to the trash.`,
        });
        setSelectedProducts([]);
    } catch (error) {
        console.error("Error deleting products: ", error);
        toast({
            title: "Error",
            description: "Could not delete products. Please try again.",
            variant: "destructive",
        });
    }
  };


  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Stock Management"
          description="View and manage your product inventory."
          actions={
            <AddProductDialog products={products || []} />
          }
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Card>
              <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search products..."
                            className="pl-8 sm:w-[300px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {selectedProducts.length > 0 && (
                        <Button variant="destructive" onClick={() => handleDelete(selectedProducts)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete ({selectedProducts.length})
                        </Button>
                    )}
                  </div>
              </CardHeader>
            <CardContent>
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
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Marque</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>PRIX ACHAT</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center">Loading inventory...</TableCell>
                    </TableRow>
                  )}
                  {!isLoading && filteredProducts.map((product) => (
                    <TableRow key={product.id} data-state={selectedProducts.includes(product.id) && "selected"}>
                      <TableCell>
                          <Checkbox
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked)}
                            checked={selectedProducts.includes(product.id)}
                            aria-label={`Select ${product.name}`}
                          />
                      </TableCell>
                      <TableCell>
                        {product.image && (
                           <Image
                            src={product.image}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded-md object-cover cursor-pointer transition-transform hover:scale-110"
                            onClick={() => setExpandedImage(product.image as string)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="font-mono text-xs">{product.reference}</TableCell>
                      <TableCell>{product.brand}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.stock > 20
                              ? 'default'
                              : product.stock > 5
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={cn(product.stock > 20 ? 'bg-emerald-500' : '')}
                        >
                          {product.stock} units
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(product.purchasePrice)}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setProductToEdit(product)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setExpandedImage(product.image || null)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete([product.id])}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
       <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer transition-opacity duration-300",
          expandedImage ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setExpandedImage(null)}
      >
        {expandedImage && (
            <div
            className={cn(
                "relative transition-all duration-300 ease-in-out",
                expandedImage ? "scale-100" : "scale-95"
            )}
            onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={expandedImage}
                    alt="Expanded product view"
                    width={600}
                    height={600}
                    className="rounded-lg object-contain max-w-[90vw] max-h-[90vh]"
                />
            </div>
        )}
      </div>

      <EditProductDialog 
        product={productToEdit}
        onOpenChange={(isOpen) => !isOpen && setProductToEdit(null)}
      />
    </>
  );
}
