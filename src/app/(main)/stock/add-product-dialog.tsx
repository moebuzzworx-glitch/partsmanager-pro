
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { PlusCircle, Info } from 'lucide-react';
import { AddProductForm } from './add-product-form';
import { BatchImportCard } from './batch-import-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Product } from '@/lib/types';

interface AddProductDialogProps {
    products: Product[];
}

export function AddProductDialog({ products }: AddProductDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a single product manually or import multiple products from a file.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manual" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="batch">Batch Import</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="flex-1 overflow-auto p-4">
                <AddProductForm 
                    products={products}
                    onSuccess={() => setOpen(false)} 
                />
            </TabsContent>
            <TabsContent value="batch" className="flex-1 overflow-auto p-4">
                <div className='space-y-6'>
                    <BatchImportCard 
                        existingProducts={products}
                        onProductsAdded={() => setOpen(false)} 
                    />
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>File Format Instructions</AlertTitle>
                        <AlertDescription>
                            <p>
                                Please ensure your file has the columns in the following order: <br />
                                <code className="font-mono text-sm bg-muted px-1 py-0.5 rounded">
                                    Designation, Reference, Qté Reservée, PRIX ACHAT, Marque
                                </code>
                            </p>
                        </AlertDescription>
                    </Alert>
                </div>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
