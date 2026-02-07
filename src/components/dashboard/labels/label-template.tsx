import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils'; // Assuming you have a utils file for classNames, otherwise remove

interface LabelTemplateProps {
    product: {
        id: string;
        name: string;
        price: number;
        reference?: string;
    };
    settings: {
        printerType: 'a4' | 'thermal';
        width?: number; // mm
        height?: number; // mm
        showPrice: boolean;
        showName: boolean;
        showSku: boolean;
    };
    baseUrl?: string;
}

export function LabelTemplate({ product, settings, baseUrl }: LabelTemplateProps) {
    // Base styles
    const containerStyle = settings.printerType === 'thermal'
        ? {
            width: `${settings.width}mm`,
            height: `${settings.height}mm`,
            // Force break for thermal
            pageBreakAfter: 'always',
            border: '1px solid #ddd', // Light border for preview, removal in print CSS might be needed
            padding: '2px', // Minimal padding
        }
        : {
            width: '63.5mm', // Standard Address Label size approx
            height: '38.1mm',
            border: '1px dashed #ccc',
        };

    // QR Value: Safe for SSR
    const qrValue = baseUrl ? `${baseUrl}/scan/${product.id}` : product.id;

    return (
        <div
            className="flex flex-col items-center justify-center bg-white text-center overflow-hidden box-border relative"
            style={containerStyle}
        >
            {/* Product Name - Ultra Compact */}
            {settings.showName && (
                <div className={cn(
                    "font-bold leading-none w-full line-clamp-2 text-black px-0.5",
                    settings.printerType === 'thermal' ? "text-[9px] mb-0.5" : "text-xs mb-1"
                )}>
                    {product.name}
                </div>
            )}

            {/* QR Code */}
            <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden py-0.5">
                <QRCodeSVG
                    value={qrValue}
                    // Dynamic size: (Total Height - Text Space approx 12mm) converted to px
                    // If height is 30mm, available is ~18mm => ~68px.
                    size={settings.printerType === 'thermal'
                        ? (settings.height ? (settings.height - 12) * 3.7 : 55)
                        : 80}
                    level="M"
                    fgColor="#000000"
                />
            </div>

            {/* Price & SKU */}
            <div className="w-full mt-0.5">
                {settings.showPrice && (
                    <div className={cn(
                        "font-black leading-none text-black",
                        settings.printerType === 'thermal' ? "text-xs" : "text-base"
                    )}>
                        {product.price?.toLocaleString()} DZD
                    </div>
                )}
                {settings.showSku && product.reference && (
                    <div className="text-[8px] text-gray-600 font-mono leading-none truncate px-1">
                        {product.reference}
                    </div>
                )}
            </div>
        </div>
    );
}
