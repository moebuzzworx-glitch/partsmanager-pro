'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, Package } from 'lucide-react';
import type { ProductAutoComplete } from '@/lib/invoice-autocomplete-utils';

interface SelectedProduct {
    product: ProductAutoComplete;
    quantity: number;
}

interface BatchAddProductsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    products: ProductAutoComplete[];
    documentType: string;
    dictionary: any;
    onAddProducts: (items: { reference: string; designation: string; quantity: number; unitPrice: number; unit: string }[]) => void;
}

export function BatchAddProductsDialog({
    open,
    onOpenChange,
    products,
    documentType,
    dictionary,
    onAddProducts,
}: BatchAddProductsDialogProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedProducts, setSelectedProducts] = React.useState<Map<string, SelectedProduct>>(new Map());

    const d = dictionary?.createInvoiceForm?.batchAddDialog || {};

    // Filter products based on search
    const filteredProducts = React.useMemo(() => {
        if (!searchQuery.trim()) return products;
        const query = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                (p.reference && p.reference.toLowerCase().includes(query))
        );
    }, [products, searchQuery]);

    // Toggle product selection
    const toggleProduct = (product: ProductAutoComplete) => {
        setSelectedProducts((prev) => {
            const newMap = new Map(prev);
            if (newMap.has(product.id)) {
                newMap.delete(product.id);
            } else {
                newMap.set(product.id, { product, quantity: 1 });
            }
            return newMap;
        });
    };

    // Update quantity for a selected product
    const updateQuantity = (productId: string, quantity: number) => {
        setSelectedProducts((prev) => {
            const newMap = new Map(prev);
            const item = newMap.get(productId);
            if (item) {
                newMap.set(productId, { ...item, quantity: Math.max(1, quantity) });
            }
            return newMap;
        });
    };

    // Select/Deselect all visible products
    const toggleSelectAll = () => {
        if (filteredProducts.every((p) => selectedProducts.has(p.id))) {
            // Deselect all visible
            setSelectedProducts((prev) => {
                const newMap = new Map(prev);
                filteredProducts.forEach((p) => newMap.delete(p.id));
                return newMap;
            });
        } else {
            // Select all visible
            setSelectedProducts((prev) => {
                const newMap = new Map(prev);
                filteredProducts.forEach((p) => {
                    if (!newMap.has(p.id)) {
                        newMap.set(p.id, { product: p, quantity: 1 });
                    }
                });
                return newMap;
            });
        }
    };

    // Handle adding selected products
    const handleAddSelected = () => {
        const items = Array.from(selectedProducts.values()).map(({ product, quantity }) => {
            const rawPrice = documentType === 'PURCHASE_ORDER'
                ? (product.purchasePrice || 0)
                : (product.price || 0);
            const priceToUse = Math.round(rawPrice * 100) / 100;

            return {
                reference: product.reference || '',
                designation: product.name,
                quantity,
                unitPrice: priceToUse,
                unit: 'pcs',
            };
        });

        onAddProducts(items);
        // Reset state and close
        setSelectedProducts(new Map());
        setSearchQuery('');
        onOpenChange(false);
    };

    // Reset when dialog closes
    React.useEffect(() => {
        if (!open) {
            setSearchQuery('');
            setSelectedProducts(new Map());
        }
    }, [open]);

    const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedProducts.has(p.id));
    const selectedCount = selectedProducts.size;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-2xl max-h-[85vh] flex flex-col"
                onInteractOutside={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {d.title || 'Add Products'}
                    </DialogTitle>
                    <DialogDescription>
                        {d.description || 'Select products to add to your invoice. Set quantities and click Add Selected.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Search and Select All */}
                <div className="flex items-center gap-4 py-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={d.searchPlaceholder || 'Search by name or reference...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ps-10"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                    >
                        {allVisibleSelected ? (d.deselectAll || 'Deselect All') : (d.selectAll || 'Select All')}
                    </Button>
                </div>

                {/* Product List */}
                <div className="flex-1 min-h-0 max-h-[400px] overflow-y-auto border rounded-md">
                    {filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            {d.noProductsFound || 'No products found.'}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredProducts.map((product) => {
                                const isSelected = selectedProducts.has(product.id);
                                const selectedItem = selectedProducts.get(product.id);
                                return (
                                    <div
                                        key={product.id}
                                        className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50 border-transparent'
                                            }`}
                                    >
                                        <Checkbox
                                            id={`product-${product.id}`}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleProduct(product)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <Label
                                                htmlFor={`product-${product.id}`}
                                                className="font-medium cursor-pointer block truncate"
                                            >
                                                {product.name}
                                            </Label>
                                            <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                                                {product.reference && <span>Ref: {product.reference}</span>}
                                                {product.stock !== undefined && <span>Stock: {product.stock}</span>}
                                                {(documentType === 'PURCHASE_ORDER' ? product.purchasePrice : product.price) && (
                                                    <span>
                                                        {documentType === 'PURCHASE_ORDER' ? product.purchasePrice : product.price}{' '}
                                                        {dictionary?.dashboard?.currency || 'DZD'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs text-muted-foreground">{d.quantity || 'Qty'}</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={selectedItem?.quantity || 1}
                                                    onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                                                    className="w-20 h-8"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center gap-4 pt-4">
                    <span className="text-sm text-muted-foreground">
                        {(d.selectedCount || '{count} product(s) selected').replace('{count}', String(selectedCount))}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {d.cancel || 'Cancel'}
                        </Button>
                        <Button onClick={handleAddSelected} disabled={selectedCount === 0}>
                            {d.addSelected || 'Add Selected'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
