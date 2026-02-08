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
    const labelHeight = 42.3; // 297 / 7 approx. Or stick to standard 38.1mm (Avery defines it).
    // User wanted "3x7" which implies filling the page?
    // If I use 42.3mm height, it fills the page perfectly.
    // If I use 38.1mm, I have margins.
    // User complained about positioning. 
    // Filling the page (42.3mm) is safer for "nearly 0 margin".

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
        const cy = y + (labelHeight / 2); // Center Y of cell

        // 1. Product Name (Top)
        if (settings.showName) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            const splitName = doc.splitTextToSize(product.name, labelWidth - 4);
            // Limit to 2 lines
            const nameLines = splitName.length > 2 ? splitName.slice(0, 2) : splitName;
            doc.text(nameLines, cx, y + 5, { align: 'center', baseline: 'top' });
        }

        // 2. QR Code (Center)
        // Generate QR Data URL
        const qrValue = baseUrl ? `${baseUrl}/scan/${product.id}` : product.id;
        try {
            const qrDataUrl = await QRCode.toDataURL(qrValue, {
                errorCorrectionLevel: 'M',
                margin: 0,
                width: 100 // px size for generation
            });

            // Draw Image
            // Size: 25mm x 25mm?
            const qrSize = 25;
            // Position: Center
            doc.addImage(qrDataUrl, 'PNG', cx - (qrSize / 2), cy - (qrSize / 2) + 2, qrSize, qrSize);

        } catch (err) {
            console.error('QR Generation Failed', err);
        }

        // 3. Price (Bottom)
        if (settings.showPrice) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            const priceText = `${product.price?.toLocaleString()} DZD`;
            doc.text(priceText, cx, y + labelHeight - 8, { align: 'center' });
        }

        // 4. SKU (Bottom Small)
        if (settings.showSku && product.reference) {
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(product.reference, cx, y + labelHeight - 4, { align: 'center' });
            doc.setTextColor(0);
        }

        // Optional: Draw Debug Border (remove for production, or keep as user requested 0 margin / full bleed)
        // doc.rect(x, y, labelWidth, labelHeight); 
    }

    // Open PDF
    doc.save('labels.pdf');
};
