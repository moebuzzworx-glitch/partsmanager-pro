'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useParams } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { generateLabelPdf } from '@/components/dashboard/labels/label-pdf-generator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer, Search } from 'lucide-react';
import { LabelTemplate } from '@/components/dashboard/labels/label-template';

interface Product {
    id: string;
    name: string;
    price?: number;
    reference?: string;
    stock?: number;
}

export default function LabelMakerPage() {
    const params = useParams();
    const locale = params?.locale as string || 'en';
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

    // Dictionary State
    const [dictionary, setDictionary] = useState<any>(null);

    // Fetch dictionary for translations
    useEffect(() => {
        const loadDictionary = async () => {
            try {
                const dict = await import(`@/dictionaries/${locale}.json`);
                setDictionary(dict.default);
            } catch (e) {
                console.error("Failed to load dictionary:", e);
            }
        };
        loadDictionary();
    }, [locale]);

    const t = dictionary?.labels || {};

    // Data State
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Settings State
    const [printerType, setPrinterType] = useState<'a4' | 'thermal'>('thermal');
    const [showPrice, setShowPrice] = useState(true);
    const [showName, setShowName] = useState(true);
    const [showSku, setShowSku] = useState(true);

    // Thermal Dimensions (mm)
    const [labelWidth, setLabelWidth] = useState(50);
    const [labelHeight, setLabelHeight] = useState(30);
    const [baseUrl, setBaseUrl] = useState('');

    // Set Base URL on client
    useEffect(() => {
        setBaseUrl(window.location.origin);
    }, []);

    // Fetch Products
    useEffect(() => {
        async function fetchProducts() {
            if (!firestore || !user) return;
            try {
                setLoading(true);
                const q = query(
                    collection(firestore, 'products'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc'), // Show newest first usually helpful for labeling new stock
                    limit(100) // Limit for performance, maybe add load more later
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
                setProducts(data);
            } catch (e) {
                console.error("Error fetching products", e);
                toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [firestore, user, toast]);

    // Filtering
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Selection Logic
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const handlePrint = async () => {
        // Always use PDF Generation for consistent quality and control
        await generateLabelPdf(selectedProductsData, {
            showPrice,
            showName,
            showSku,
            printerType,
            width: labelWidth,
            height: labelHeight
        }, baseUrl);
    };

    // Selected Products Data
    const selectedProductsData = products.filter(p => selectedIds.has(p.id));

    return (
        <div className="space-y-6">
            {/* Header and Controls - Hidden on Print */}
            <div className="flex justify-between items-center print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t.title || 'Label Maker'}</h1>
                    <p className="text-muted-foreground">{t.description || 'Generate and print QR codes for your stock.'}</p>
                </div>
                <Button onClick={handlePrint} disabled={selectedIds.size === 0}>
                    <Printer className="mr-2 h-4 w-4" />
                    {dictionary?.reusable?.downloadPdf || 'Download PDF'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">

                {/* Left: Settings & Preview */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t.printSettings || 'Print Settings'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t.printerType || 'Printer Type'}</Label>
                                <Select
                                    value={printerType}
                                    onValueChange={(v: any) => setPrinterType(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="thermal">{t.thermal || 'Thermal (Roll)'}</SelectItem>
                                        <SelectItem value="a4">{t.a4 || 'A4 (Grid)'}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {printerType === 'thermal' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t.widthMm || 'Width (mm)'}</Label>
                                        <Input
                                            type="number"
                                            value={labelWidth}
                                            onChange={e => setLabelWidth(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t.heightMm || 'Height (mm)'}</Label>
                                        <Input
                                            type="number"
                                            value={labelHeight}
                                            onChange={e => setLabelHeight(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <Label>{t.showPrice || 'Show Price'}</Label>
                                    <Switch checked={showPrice} onCheckedChange={setShowPrice} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>{t.showName || 'Show Name'}</Label>
                                    <Switch checked={showName} onCheckedChange={setShowName} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>{t.showSku || 'Show SKU/Ref'}</Label>
                                    <Switch checked={showSku} onCheckedChange={setShowSku} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="text-sm">{t.previewSingle || 'Preview (Single)'}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center p-6">
                            {/* Live Preview of dummy or first selected */}
                            <div className="border shadow-sm bg-white">
                                <LabelTemplate
                                    product={selectedProductsData[0] || { id: 'demo', name: 'Product Name', price: 1500, reference: 'REF-001' }}
                                    baseUrl={baseUrl}
                                    settings={{
                                        printerType,
                                        width: labelWidth,
                                        height: labelHeight,
                                        showPrice,
                                        showName,
                                        showSku
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Product List */}
                <Card className="lg:col-span-2 flex flex-col h-[700px]">
                    <CardHeader className="pb-3">
                        <CardTitle>{t.selectProducts || 'Select Products'}</CardTitle>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t.searchProducts || "Search products..."}
                                className="pl-8"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        {loading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                    <tr className="text-left border-b">
                                        <th className="p-3 w-[50px]">
                                            <Checkbox
                                                checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                                                onCheckedChange={toggleAll}
                                            />
                                        </th>
                                        <th className="p-3 font-medium">{t.product || 'Product'}</th>
                                        <th className="p-3 font-medium">{t.ref || 'Ref'}</th>
                                        <th className="p-3 font-medium text-right">{t.stock || 'Stock'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors">
                                            <td className="p-3">
                                                <Checkbox
                                                    checked={selectedIds.has(p.id)}
                                                    onCheckedChange={() => toggleSelect(p.id)}
                                                />
                                            </td>
                                            <td className="p-3 font-medium">{p.name}</td>
                                            <td className="p-3 text-muted-foreground">{p.reference || '-'}</td>
                                            <td className="p-3 text-right">{p.stock || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* PRINT ONLY AREA */}
            <div className="hidden print:block w-full">
                <style jsx global>{`
                @media print {
                    @page {
                    margin: 0;
                size: ${printerType === 'thermal' ? `${labelWidth}mm ${labelHeight}mm` : 'A4'};
                    }
                body {
                    background: white;
                    }
                    /* We rely on print:hidden classes on UI elements */
                /* Show the print area which is a direct child of the page component's root div */
                /* But since we can't easily target the specific root div's other children without specific classes, 
                   we rely on 'print:hidden' classes on the UI elements and 'print:block' on the print area. */
                    
                /* However, if we used display:none on body > *, we hide the root div too. */
                   We just need to ensure the print area flows correctly. */

                .print-area {
                    width: 100%;
                height: 100%;
                    }
                }
            `}</style>

                <div className="print-area">
                    {printerType === 'thermal' ? (
                        // Thermal Loop (One per "page")
                        selectedProductsData.map(product => (
                            <LabelTemplate
                                key={product.id}
                                product={product}
                                baseUrl={baseUrl}
                                settings={{
                                    printerType,
                                    width: labelWidth,
                                    height: labelHeight,
                                    showPrice,
                                    showName,
                                    showSku
                                }}
                            />
                        ))
                    ) : (
                        // A4 Grid Layout - Pagination via Chunking (3x7 = 21 per page)
                        Array.from({ length: Math.ceil(selectedProductsData.length / 21) }).map((_, pageIndex) => (
                            <div
                                key={pageIndex}
                                className="grid grid-cols-3 content-start gap-y-1 gap-x-0"
                                style={{
                                    width: '210mm',
                                    // Height constraint to force break if needed, but separate divs with break-after is better
                                    // 3x7 * 38.1mm = ~266mm. 
                                    height: '297mm', // Force full page height to ensure break works cleanly?
                                    // Or just let content flow.
                                    margin: '-15mm 0 0 -10mm',
                                    padding: '0mm',
                                    boxSizing: 'border-box',
                                    pageBreakAfter: pageIndex < Math.ceil(selectedProductsData.length / 21) - 1 ? 'always' : 'auto',
                                    breakAfter: pageIndex < Math.ceil(selectedProductsData.length / 21) - 1 ? 'page' : 'auto'
                                }}
                            >
                                {selectedProductsData.slice(pageIndex * 21, (pageIndex + 1) * 21).map(product => (
                                    <div key={product.id} className="break-inside-avoid flex justify-center items-center p-1">
                                        <LabelTemplate
                                            product={product}
                                            baseUrl={baseUrl}
                                            settings={{
                                                printerType,
                                                showPrice,
                                                showName,
                                                showSku
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div >
    );
}
