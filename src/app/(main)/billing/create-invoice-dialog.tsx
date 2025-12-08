
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
import { CreateInvoiceForm } from './create-invoice-form';

export function CreateInvoiceDialog() {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Fill in the details below to generate a new client invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto pr-6 pl-1 -ml-4">
            <CreateInvoiceForm
                ref={formRef}
                onSuccess={() => setOpen(false)}
            />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => formRef.current?.requestSubmit()}>Generate & Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
