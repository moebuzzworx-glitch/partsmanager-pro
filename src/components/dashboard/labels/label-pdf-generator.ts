import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface Product {
    id: string;
    name: string;
    price: number;
    reference?: string;
}

interface LabelSettings {
    showPrice: boolean;
    showName: boolean;
    showSku: boolean;
    printerType: 'a4' | 'thermal';
    width?: number; // mm
    height?: number; // mm
}

export const generateLabelPdf = async (
    products: Product[],
    settings: LabelSettings,
    baseUrl: string
) => {
    // --- THERMAL LAYOUT ---
    if (settings.printerType === 'thermal') {
        const w = settings.width || 50;
        const h = settings.height || 30;

        // Initialize PDF with custom size
        const doc = new jsPDF({
            orientation: w > h ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [w, h]
        });

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            if (i > 0) doc.addPage([w, h], w > h ? 'landscape' : 'portrait');

            const cx = w / 2;

            // Dynamic Layout Calculation
            // We need to fit Name, QR, Price within 'h'
            // Name: ~4mm height (top)
            // Price: ~5mm height (bottom)
            // Margins: ~2mm top/bottom
            // Available for QR: h - 4 - 5 - 4 = h - 13.
            // If h=30, Avail=17mm.
            // If h=40, Avail=27mm.
            // Cap QR size at 20mm (max).

            const nameH = settings.showName ? 4 : 0;
            const priceH = settings.showPrice ? 5 : 0;
            const margin = 2;

            const availableForQr = h - nameH - priceH - (margin * 2) - 2; // -2 for gap
            const qrSize = Math.min(20, Math.max(10, availableForQr)); // Min 10mm, Max 20mm

            // Positions
            const nameY = margin + 3; // Baseline roughly
            const qrY = settings.showName ? (margin + nameH + 1) : margin;
            const priceY = h - margin - 1; // Baseline from bottom

            // 1. Name
            if (settings.showName) {
                doc.setFontSize(8); // Smaller for thermal
                doc.setFont("helvetica", "bold");
                const splitName = doc.splitTextToSize(product.name, w - 2);
                const nameLines = splitName.length > 1 ? splitName.slice(0, 1) : splitName; // 1 line only
                doc.text(nameLines, cx, nameY, { align: 'center' });
            }

            // 2. QR
            const qrValue = baseUrl ? `${baseUrl}/scan/${product.id}` : product.id;
            try {
                const qrDataUrl = await QRCode.toDataURL(qrValue, { errorCorrectionLevel: 'M', margin: 0, width: 100 });
                // Centered Vertically in remaining space?
                // Actually let's just place it after Name
                doc.addImage(qrDataUrl, 'PNG', cx - (qrSize / 2), qrY, qrSize, qrSize);
            } catch (err) { console.error(err); }

            // 3. Price
            if (settings.showPrice) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(`${product.price?.toLocaleString()} DZD`, cx, priceY, { align: 'center' });
            }

            // 4. SKU (Tiny, overlap bottom if needed or skip if no space)
            if (settings.showSku && product.reference && h > 35) {
                doc.setFontSize(6);
                doc.setFont("helvetica", "normal");
                doc.text(product.reference, cx, h - 1, { align: 'center' });
            }

            // Border (Optional for cutting? Thermal usually doesn't need it but User asked for "same changes")
            // Dashed line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.setLineDashPattern([1, 1], 0);
            doc.rect(0.5, 0.5, w - 1, h - 1); // 0.5mm inset
            doc.setLineDashPattern([], 0);
        }

        doc.save('labels-roll.pdf');
        return;
    }

    // --- A4 LAYOUT (Existing) ---
    // A4 Dimensions: 210mm x 297mm
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const cols = 3;
    const rows = 7;
    const labelWidth = 70; // 210 / 3
    const labelHeight = 42.3; // 297 / 7 approx.

    const labelsPerPage = cols * rows;

    // Iterate products
    for (let i = 0; i < products.length; i++) {
        const product = products[i];

        // Add page if needed
        if (i > 0 && i % labelsPerPage === 0) {
            doc.addPage();
        }

        // Calculate position
        const indexOnPage = i % labelsPerPage;
        const col = indexOnPage % cols;
        const row = Math.floor(indexOnPage / cols);

        const x = col * labelWidth;
        const y = row * labelHeight;

        // --- Content Generation ---
        const cx = x + (labelWidth / 2); // Center X of cell

        // 1. Product Name (Top)
        if (settings.showName) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            const splitName = doc.splitTextToSize(product.name, labelWidth - 4);
            // Limit to 2 lines
            const nameLines = splitName.length > 2 ? splitName.slice(0, 2) : splitName;
            doc.text(nameLines, cx, y + 5, { align: 'center', baseline: 'top' });
        }

        // 2. QR Code (Center) - Adjusted to match Preview (Smaller & Higher)
        // Generate QR Data URL
        const qrValue = baseUrl ? `${baseUrl}/scan/${product.id}` : product.id;
        try {
            const qrDataUrl = await QRCode.toDataURL(qrValue, {
                errorCorrectionLevel: 'M',
                margin: 0,
                width: 100 // px size for generation
            });

            // Draw Image
            // PREVIEW MATCHING SIZE: 20mm (Small and clean)
            const qrSize = 20;
            // Position: Top at 9mm (leaving space for name)
            // Bottom at 29mm.
            doc.addImage(qrDataUrl, 'PNG', cx - (qrSize / 2), y + 9, qrSize, qrSize);

        } catch (err) {
            console.error('QR Generation Failed', err);
        }

        // 3. Price (Bottom) - Moved DOWN to avoid overlap
        if (settings.showPrice) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            const priceText = `${product.price?.toLocaleString()} DZD`;
            // Position at 37mm (Gap of 8mm from QR bottom)
            doc.text(priceText, cx, y + 37, { align: 'center' });
        }

        // 4. SKU (Bottom Small) - Very Bottom
        if (settings.showSku && product.reference) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(product.reference, cx, y + 41, { align: 'center' });
            doc.setTextColor(0);
        }

        // 5. Border (Cut Lines) - Light Grey Dashed matching preview
        doc.setDrawColor(200, 200, 200); // Light Grey
        doc.setLineWidth(0.1);
        doc.setLineDashPattern([1, 1], 0); // Dashed pattern
        doc.rect(x, y, labelWidth, labelHeight);
        doc.setLineDashPattern([], 0); // Reset dash
    }

    // Open PDF
    doc.save('labels.pdf');
};
