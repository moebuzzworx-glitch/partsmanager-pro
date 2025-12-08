
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { CreateSupplierDialog } from './create-supplier-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';

export function AddSupplierDialog() {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  const handleSupplierCreated = (newSupplier: Supplier) => {
    toast({
        title: 'Supplier Created!',
        description: `${newSupplier.name} has been added to your suppliers.`,
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Supplier
      </Button>
      <CreateSupplierDialog
        open={open}
        onOpenChange={setOpen}
        onSupplierCreated={handleSupplierCreated}
      />
    </>
  );
}
