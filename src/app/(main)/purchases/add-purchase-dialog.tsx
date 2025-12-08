
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddPurchaseForm } from './add-purchase-form';
import type { Supplier } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Product } from '@/lib/types';


interface AddPurchaseDialogProps {
  suppliers: Supplier[];
}

export function AddPurchaseDialog({ suppliers }: AddPurchaseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'products');
  }, [firestore]);
  const { data: products } = useCollection<Product>(productsCollection);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Purchase</DialogTitle>
          <DialogDescription>
            Record a new stock acquisition from a supplier.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto pr-6 pl-1 -ml-4">
            <AddPurchaseForm
                ref={formRef}
                products={products || []}
                suppliers={suppliers}
                onSuccess={() => setOpen(false)}
            />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => formRef.current?.requestSubmit()}>Add Purchase</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
