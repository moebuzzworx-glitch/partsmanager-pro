'use client';

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, ShoppingCart, Package, Send, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    reference?: string;
}

export default function MobileProductPage({ params }: { params: { locale: string; id: string } }) {
    const { firestore, user } = useFirebase();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        async function fetchProduct() {
            if (!firestore || !params.id) return;
            try {
                const docRef = doc(firestore, 'products', params.id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setProduct({ id: snap.id, ...snap.data() } as Product);
                } else {
                    toast({ title: "Not Found", description: "Product not found", variant: "destructive" });
                }
            } catch (e) {
                console.error("Fetch error", e);
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
    }, [firestore, params.id, toast]);

    const handleStockUpdate = async (change: number) => {
        if (!product || !firestore) return;
        try {
            const docRef = doc(firestore, 'products', product.id);
            await updateDoc(docRef, {
                stock: increment(change)
            });
            setProduct(prev => prev ? { ...prev, stock: prev.stock + change } : null);
            toast({ title: "Updated", description: `Stock ${change > 0 ? 'added' : 'removed'}` });
        } catch (e) {
            toast({ title: "Error", description: "Failed to update stock", variant: "destructive" });
        }
    };

    const addToDesktop = async () => {
        // TODO: Implement Realtime Pairing to Desktop
        toast({ title: "Coming Soon", description: "Desktop sync in next step!" });
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!product) return (
        <div className="p-4 text-center">
            <h1 className="text-xl font-bold text-red-500">Product Not Found</h1>
            <Link href={`/${params.locale}/scan`} className="mt-4 block">
                <Button>Scan Again</Button>
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-secondary/30 p-4">
            {/* Header */}
            <div className="flex items-center mb-6">
                <Link href={`/${params.locale}/scan`}>
                    <Button variant="ghost" size="icon"><ArrowLeft /></Button>
                </Link>
                <span className="font-semibold ml-2">Product Result</span>
            </div>

            <Card className="max-w-md mx-auto overflow-hidden border-2 border-primary/20">
                <CardHeader className="bg-primary/5 text-center pb-2">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{product.reference}</p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-center">

                    <div>
                        <p className="text-sm text-muted-foreground uppercase tracking-wider">Price</p>
                        <p className="text-4xl font-black text-primary">
                            {product.price?.toLocaleString()} <span className="text-lg text-muted-foreground font-normal">DZD</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background p-3 rounded-lg border">
                            <p className="text-xs text-muted-foreground mb-1">Current Stock</p>
                            <div className="flex items-center justify-center gap-2">
                                <Package className="h-4 w-4 text-orange-500" />
                                <span className="font-bold text-xl">{product.stock}</span>
                            </div>
                        </div>
                        <div className="bg-background p-3 rounded-lg border">
                            <p className="text-xs text-muted-foreground mb-1">Status</p>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                            </span>
                        </div>
                    </div>

                    {/* Stock Adjustment Controls */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium mb-3 text-left w-full">Quick Adjust Stock</p>
                        <div className="flex items-center justify-between gap-2">
                            <Button size="icon" variant="outline" className="h-10 w-10 border-red-200 hover:bg-red-50" onClick={() => handleStockUpdate(-1)}>
                                <Minus className="h-4 w-4 text-red-600" />
                            </Button>
                            <span className="text-sm font-mono text-muted-foreground">± 1 Unit</span>
                            <Button size="icon" variant="outline" className="h-10 w-10 border-green-200 hover:bg-green-50" onClick={() => handleStockUpdate(1)}>
                                <Plus className="h-4 w-4 text-green-600" />
                            </Button>
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                    <Button className="w-full h-12 text-lg" onClick={addToDesktop}>
                        <Send className="mr-2 h-5 w-5" />
                        Add to Invoice
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Tap "Add" in desktop pairing mode to send instantly.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
