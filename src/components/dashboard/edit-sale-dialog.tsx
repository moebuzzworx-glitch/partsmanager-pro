'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase/provider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Sale {
    id: string;
    product: string;
    customer: string;
    date: string;
    quantity: number;
    amount: number;
}

interface EditSaleDialogProps {
    sale: Sale;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaleUpdated: () => void;
    dictionary?: any;
}

export function EditSaleDialog({ sale, open, onOpenChange, onSaleUpdated, dictionary }: EditSaleDialogProps) {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const d = dictionary?.editSaleDialog;

    const [formData, setFormData] = useState({
        customer: '',
        date: '',
        amount: '0',
    });

    useEffect(() => {
        if (sale) {
            setFormData({
                customer: sale.customer || '',
                date: sale.date ? new Date(sale.date).toISOString().split('T')[0] : '',
                amount: (sale.amount || 0).toString(),
            });
        }
    }, [sale]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user) return;

        setIsLoading(true);
        try {
            const saleRef = doc(firestore, 'sales', sale.id);

            await updateDoc(saleRef, {
                customer: formData.customer,
                date: new Date(formData.date).toISOString(),
                amount: parseFloat(formData.amount) || 0,
                updatedAt: serverTimestamp(),
            });

            toast({
                title: dictionary?.common?.success || 'Success',
                description: d?.updateSuccess || 'Sale updated successfully.',
            });

            onSaleUpdated();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error updating sale:', error);
            toast({
                title: dictionary?.common?.error || 'Error',
                description: d?.updateError || 'Failed to update sale.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{d?.title || 'Edit Sale'}</DialogTitle>
                    <DialogDescription>
                        {d?.description || 'Update sale details. Note: Changing amount does not automatically update unit price or stock.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="product" className="text-right">
                            {d?.product || 'Product'}
                        </Label>
                        <Input
                            id="product"
                            value={sale.product}
                            disabled
                            className="col-span-3 bg-muted"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="customer" className="text-right">
                            {d?.customer || 'Customer'}
                        </Label>
                        <Input
                            id="customer"
                            value={formData.customer}
                            onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            {d?.date || 'Date'}
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            {d?.amount || 'Amount'}
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="col-span-3"
                            step="0.01"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {d?.submit || 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
