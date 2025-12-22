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

import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/lib/config";
import { cn } from "@/lib/utils";
import { AddProductDialog } from "@/components/dashboard/add-product-dialog";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query, where } from "firebase/firestore";
import { moveToTrash, ensureAllProductsHaveDeletedField } from "@/lib/trash-utils";
import { useToast } from "@/hooks/use-toast";

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
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dictionary, setDictionary] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const fetchProducts = async () => {
    if (!firestore) return;
    try {
      setIsLoading(true);
      
      // Ensure all products have the isDeleted field (one-time migration)
      await ensureAllProductsHaveDeletedField(firestore);
      
      const productsRef = collection(firestore, 'products');
      const q = query(productsRef, where('isDeleted', '==', false));
      const querySnapshot = await getDocs(q);
      
      const fetchedProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProducts.push({
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

      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
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

  // Fetch products from Firestore
  useEffect(() => {
    if (!firestore) return;
    fetchProducts();
  }, [firestore]);

  const handleDeleteProduct = async (productId: string) => {
    if (!firestore) return;
    
    try {
      const success = await moveToTrash(firestore, productId);
      if (success) {
        setProducts(products.filter(p => p.id !== productId));
        toast({
          title: 'Success',
          description: 'Product moved to trash',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete product',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the product',
        variant: 'destructive',
      });
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
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) return;

    if (!confirm(`Delete ${selectedProducts.size} product(s)? They will be moved to trash.`)) {
      return;
    }

    if (!firestore) return;

    try {
      const success = await moveToTrash(firestore, Array.from(selectedProducts));
      if (success) {
        setProducts(products.filter(p => !selectedProducts.has(p.id)));
        setSelectedProducts(new Set());
        toast({
          title: 'Success',
          description: `${selectedProducts.size} product(s) moved to trash`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete products',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error batch deleting products:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting products',
        variant: 'destructive',
      });
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
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
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
                  Delete Selected ({selectedProducts.size})
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
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Image</span>
                  </TableHead>
                  <TableHead>
                    <Checkbox 
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{d.designation}</TableHead>
                  <TableHead>{d.reference}</TableHead>
                  <TableHead>{d.brand}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.stock}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.purchasePrice}</TableHead>
                  <TableHead className="hidden md:table-cell">{d.sellingPrice}</TableHead>
                  <TableHead>
                    <span className="sr-only">{d.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {products.length === 0 ? 'No products found. Add one to get started!' : 'No products match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
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
                        {product.purchasePrice?.toFixed(2)} DZD
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.price?.toFixed(2)} DZD
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
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
