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
import { Product } from '@/lib/types';

interface EditProductDialogProps {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductUpdated: () => void;
}

export function EditProductDialog({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        reference: '',
        brand: '',
        stock: '0',
        purchasePrice: '0',
        price: '0',
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                reference: product.reference || '',
                brand: product.brand || '',
                stock: (product.stock || 0).toString(),
                purchasePrice: (product.purchasePrice || 0).toString(),
                price: (product.price || 0).toString(),
            });
        }
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user) return;

        setIsLoading(true);
        try {
            const productRef = doc(firestore, 'products', product.id);

            await updateDoc(productRef, {
                name: formData.name,
                reference: formData.reference,
                brand: formData.brand,
                stock: parseInt(formData.stock) || 0,
                purchasePrice: parseFloat(formData.purchasePrice) || 0,
                price: parseFloat(formData.price) || 0,
                updatedAt: serverTimestamp(),
            });

            toast({
                title: 'Success',
                description: 'Product updated successfully.',
            });

            onProductUpdated();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error updating product:', error);
            toast({
                title: 'Error',
                description: 'Failed to update product.',
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
                    <DialogTitle>Edit Product</DialogTitle>
                    <DialogDescription>
                        Make changes to the product details here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reference" className="text-right">
                            Reference
                        </Label>
                        <Input
                            id="reference"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="brand" className="text-right">
                            Brand
                        </Label>
                        <Input
                            id="brand"
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stock" className="text-right">
                            Stock
                        </Label>
                        <Input
                            id="stock"
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            className="col-span-3"
                            min="0"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="purchasePrice" className="text-right">
                            Buy Price
                        </Label>
                        <Input
                            id="purchasePrice"
                            type="number"
                            value={formData.purchasePrice}
                            onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                            className="col-span-3"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">
                            Sell Price
                        </Label>
                        <Input
                            id="price"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="col-span-3"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
