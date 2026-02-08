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
}

export const generateLabelPdf = async (
    products: Product[],
    settings: LabelSettings,
    baseUrl: string
) => {
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
    }

    // Open PDF
    doc.save('labels.pdf');
};
