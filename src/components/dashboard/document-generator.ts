
'use client';

import { jsPDF } from 'jspdf';
import AutoTable from 'jspdf-autotable';
import type { InvoiceFormData } from './create-invoice-form';
import { User as AppUser } from '@/lib/types';
import { canExport } from '@/lib/trial-utils';

// Define supported document types
export type DocumentType = 'INVOICE' | 'DELIVERY_NOTE' | 'PURCHASE_ORDER' | 'SALES_RECEIPT';

export interface CompanyInfo {
    companyName: string;
    address: string;
    phone: string;
    rc?: string;
    nif?: string;
    art?: string;
    nis?: string;
    rib?: string;
    logoUrl?: string;
}

// Helper: Convert DocumentType to display title
function getDocumentTitle(type: DocumentType, isProforma: boolean): string {
    if (isProforma && type === 'INVOICE') return 'Facture Proforma';
    switch (type) {
        case 'INVOICE': return 'Facture';
        case 'DELIVERY_NOTE': return 'Bon de Livraison';
        case 'PURCHASE_ORDER': return 'Bon de Commande';
        case 'SALES_RECEIPT': return 'Bon de Vente';
        default: return 'Document';
    }
}

// Helper: Get label for "Client" box (Client vs Supplier)
function getPartyLabel(type: DocumentType): string {
    switch (type) {
        case 'PURCHASE_ORDER': return 'Renseignements Fournisseur';
        default: return 'Renseignements Client';
    }
}

// Helper: Get party prefix (Client : vs Fournisseur :)
function getPartyPrefix(type: DocumentType): string {
    switch (type) {
        case 'PURCHASE_ORDER': return 'Fournisseur :';
        default: return 'Client :';
    }
}

// Page Number helper
function addPageNumbers(this: any) {
    const pageCount = (this as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        this.setPage(i);
        this.setFontSize(8);
        this.text(
            `Page ${i} of ${pageCount}`,
            (this as any).internal.pageSize.width / 2,
            this.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }
}

// Number to Words Converter (French)
function numberToWordsFr(n: number): string {
    if (typeof n !== 'number' || isNaN(n)) return '';
    if (n === 0) return 'zéro Dinar';

    const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

    function belowThousand(num: number): string {
        let words: string[] = [];
        const hundreds = Math.floor(num / 100);
        const rest = num % 100;
        if (hundreds) {
            if (hundreds > 1) words.push(UNITS[hundreds]);
            words.push(hundreds > 1 ? 'cents' : 'cent');
        }

        if (rest) {
            if (rest < 20) {
                words.push(UNITS[rest]);
            } else {
                let tens = Math.floor(rest / 10);
                let unit = rest % 10;
                if (tens === 7 || tens === 9) {
                    const base = TENS[tens];
                    const sub = 10 + unit;
                    if (unit === 1) words.push(base + ' et ' + UNITS[sub]);
                    else words.push(base + '-' + UNITS[sub]);
                } else {
                    const base = TENS[tens];
                    if (unit === 1 && (tens >= 1 && tens <= 6)) {
                        words.push(base + ' et ' + UNITS[unit]);
                    } else {
                        words.push(base + (unit ? '-' + UNITS[unit] : ''));
                    }
                }
            }
        }
        return words.join(' ').replace(/\s+/g, ' ').trim();
    }

    const integerPart = Math.floor(n);
    const decimalPart = Math.round((n - integerPart) * 100);

    const groups = [
        { value: 1_000_000_000, name: 'milliard' },
        { value: 1_000_000, name: 'million' },
        { value: 1000, name: 'mille' }
    ];

    let remaining = integerPart;
    let parts: string[] = [];

    for (const g of groups) {
        const count = Math.floor(remaining / g.value);
        if (count) {
            if (g.name === 'mille' && count === 1) {
                parts.push('mille');
            } else {
                parts.push(belowThousand(count) + ' ' + g.name + (count > 1 && g.name !== 'mille' ? 's' : ''));
            }
            remaining = remaining % g.value;
        }
    }

    if (remaining) parts.push(belowThousand(remaining));

    let words = parts.join(' ').replace(/\s+/g, ' ').trim();
    words += integerPart > 1 ? ' Dinars' : ' Dinar';

    if (decimalPart > 0) {
        words += ' et ' + belowThousand(decimalPart) + ' centimes';
    }

    return words;
}

function getCompanyInfo(): CompanyInfo {
    try {
        const storedInfo = localStorage.getItem('companyInfo');
        if (storedInfo) return JSON.parse(storedInfo);
    } catch (e) {
        console.error("Could not retrieve company info", e);
    }
    return {
        companyName: 'Your Company Name',
        address: 'Your Address',
        rc: '', nif: '', art: '', nis: '', rib: '', phone: 'Your Phone'
    };
}

export async function generateDocumentPdf(
    data: InvoiceFormData,
    type: DocumentType,
    companyInfo?: CompanyInfo,
    defaultVat: number = 0,
    applyVat: boolean = false
) {
    const doc = new jsPDF();
    const resolvedCompanyInfo = companyInfo ?? getCompanyInfo();

    // Formatters
    const formatPrice = (price: number) => {
        if (typeof price !== 'number') return '0,00';
        return price.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };
    const formatQuantity = (q: number) => typeof q === 'number' ? Math.round(q).toString() : '0';

    // --- LOGO ---
    let logoHeight = 0;
    const logoX = 15, logoY = 10, logoWidth = 20;

    try {
        if (resolvedCompanyInfo.logoUrl) {
            await new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const imgHeight = (img.height / img.width) * logoWidth;
                    logoHeight = imgHeight;
                    try {
                        doc.addImage(img, 'PNG', logoX, logoY, logoWidth, imgHeight);
                    } catch (e) { drawLogoPlaceholder(); }
                    resolve();
                };
                img.onerror = () => { drawLogoPlaceholder(); resolve(); };
                img.src = resolvedCompanyInfo.logoUrl as string;
            });
        } else {
            drawLogoPlaceholder();
        }
    } catch (e) { drawLogoPlaceholder(); }

    function drawLogoPlaceholder() {
        doc.setFillColor(237, 28, 36);
        doc.circle(logoX + logoWidth / 2, logoY + logoWidth / 2, logoWidth / 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        const initial = (resolvedCompanyInfo.companyName || 'C').charAt(0) || 'C';
        doc.text(initial, logoX + logoWidth / 2 - (doc.getTextWidth(initial) / 2), logoY + logoWidth / 2 + 1.5);
        logoHeight = logoWidth;
    }

    const headerStartY = logoY + logoHeight + 4;

    // --- COMPANY INFO ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Adresse: ${resolvedCompanyInfo.address || ''}`, 14, headerStartY);
    doc.text('N° RC:', 14, headerStartY + 6); doc.text(resolvedCompanyInfo.rc || '', 30, headerStartY + 6);
    doc.text('N° NIF:', 14, headerStartY + 12); doc.text(resolvedCompanyInfo.nif || '', 30, headerStartY + 12);
    doc.text('N° Tél:', 14, headerStartY + 18); doc.text(resolvedCompanyInfo.phone || '', 30, headerStartY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(resolvedCompanyInfo.companyName || '', 105, headerStartY - 8, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(85, headerStartY - 6, 125, headerStartY - 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('N° NIS:', 145, headerStartY); doc.text(resolvedCompanyInfo.nis || '', 160, headerStartY);
    doc.text('N° ART:', 145, headerStartY + 6); doc.text(resolvedCompanyInfo.art || '', 160, headerStartY + 6);
    doc.text('N° RIB:', 145, headerStartY + 12); doc.text(resolvedCompanyInfo.rib || '', 160, headerStartY + 12);

    // --- TITLE BOX ---
    const headerEndY = headerStartY + 18;
    const boxSpacingY = headerEndY + 4;

    const titleStr = getDocumentTitle(type, data.isProforma);
    const dateStr = `Le : ${new Date(data.invoiceDate).toLocaleDateString('fr-FR')}`;
    // Use "N°" only if formatted number exists
    const fullTitle = `${titleStr} N° : ${data.invoiceNumber}     ${dateStr}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const titleWidth = doc.getTextWidth(fullTitle);
    const boxWidth = titleWidth + 12;
    const boxX = (doc.internal.pageSize.width - boxWidth) / 2;
    const boxY = boxSpacingY;

    doc.roundedRect(boxX, boxY, boxWidth, 10, 3, 3);
    doc.text(fullTitle, boxX + 6, boxY + 6.5);

    // --- CLIENT/SUPPLIER INFO ---
    const clientInfoY = boxY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(getPartyLabel(type), 14, clientInfoY);

    const clientBoxY = clientInfoY + 3;
    const clientBoxX = 12;
    const clientBoxWidth = 186;
    const clientTextLeftX = 16;
    const clientTextRightX = 145;
    const lineSpacing = 5.5;

    let currentY = clientBoxY + 8;
    const partyPrefix = getPartyPrefix(type);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Left Column
    const nameLines = doc.splitTextToSize(`${partyPrefix} ${data.clientName}`, 80);
    doc.text(nameLines, clientTextLeftX, currentY);
    currentY += nameLines.length * lineSpacing;

    const addrLines = doc.splitTextToSize(`Adresse : ${data.clientAddress || ''}`, 80);
    doc.text(addrLines, clientTextLeftX, currentY);
    currentY += addrLines.length * lineSpacing;

    const nisLines = doc.splitTextToSize(`NIS : ${data.clientNis || ''}`, 80);
    doc.text(nisLines, clientTextLeftX, currentY);
    currentY += nisLines.length * lineSpacing;

    const ribLines = doc.splitTextToSize(`RIB : ${data.clientRib || ''}`, 80);
    doc.text(ribLines, clientTextLeftX, currentY);
    const leftHeight = currentY - clientBoxY;

    // Right Column
    currentY = clientBoxY + 8;
    const rcLines = doc.splitTextToSize(`R.C : ${data.clientRc || ''}`, 80);
    doc.text(rcLines, clientTextRightX, currentY);
    currentY += rcLines.length * lineSpacing;

    const nifLines = doc.splitTextToSize(`NIF : ${data.clientNif || ''}`, 80);
    doc.text(nifLines, clientTextRightX, currentY);
    const rightHeight = currentY - clientBoxY;

    const boxHeight = Math.max(leftHeight, rightHeight) + 4;
    doc.setLineWidth(0.2);
    doc.roundedRect(clientBoxX, clientBoxY, clientBoxWidth, boxHeight, 2, 2);

    // --- TABLE ---
    const tableStartY = clientBoxY + boxHeight + 6;

    // Define columns based on type
    // Delivery Note hides prices
    const isDelivery = type === 'DELIVERY_NOTE';

    const headers = isDelivery
        ? [['N°', 'Référence', 'Désignation', 'U', 'Qté']]
        : [['N°', 'Référence', 'Désignation', 'U', 'Qté', 'PUV', 'TVA(%)', 'Montant HT']];

    // Map Data
    const tableData = data.lineItems.map((item, index) => {
        if (isDelivery) {
            return [
                index + 1,
                item.reference || '',
                item.designation,
                item.unit || '',
                formatQuantity(item.quantity)
            ];
        } else {
            const total = item.quantity * item.unitPrice;
            const vatPercent = applyVat ? defaultVat : 0;
            return [
                index + 1,
                item.reference || '',
                item.designation,
                item.unit || '',
                formatQuantity(item.quantity),
                formatPrice(item.unitPrice),
                vatPercent > 0 ? `${vatPercent}` : '',
                formatPrice(total)
            ];
        }
    });

    // Calculate Column Styles to maximize Designation space
    const colStyles = isDelivery
        ? {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 35 },
            2: { halign: 'left', cellWidth: 'auto' }, // Designation takes remaining
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'right', cellWidth: 20 },
        }
        : {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'left', cellWidth: 22 },
            2: { halign: 'left', cellWidth: 'auto' }, // Designation takes remaining
            3: { halign: 'center', cellWidth: 12 },
            4: { halign: 'right', cellWidth: 12 },
            5: { halign: 'right', cellWidth: 22 },
            6: { halign: 'right', cellWidth: 15 },
            7: { halign: 'right', cellWidth: 25 },
        };

    (AutoTable as any)(doc, {
        startY: tableStartY,
        head: headers,
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: { lineWidth: 0.1, lineColor: [150, 150, 150], fontSize: 9 },
        columnStyles: colStyles as any
    });

    // --- FOOTER / SUMMARY ---
    let finalY = (doc as any).lastAutoTable.finalY || 120;
    let startY = finalY + 10;
    if (startY > 230) { doc.addPage(); startY = 20; }

    const payText = `Mode paiement: ${data.paymentMethod || 'Espèce'}`;
    doc.setFont('helvetica', 'normal');
    doc.text(payText, 14, startY);

    // DELIVERY NOTES don't show financial summary usually.
    // But maybe show Total Quantity?
    // User asked for "same style".

    if (!isDelivery) {
        const totalHT = data.lineItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
        const totalTVA = applyVat ? totalHT * (defaultVat / 100) : 0;
        const timbre = 0; // Simple for now
        const totalTTC = totalHT + totalTVA;
        const netPay = totalTTC + timbre;

        const labels = ['Montant HT :', 'Montant TVA :', 'Montant TTC :', 'Timbre :', 'Montant Net à payer'];
        const values = [formatPrice(totalHT), formatPrice(totalTVA), formatPrice(totalTTC), formatPrice(timbre), formatPrice(netPay)];

        const summaryW = 85; // Approximate width
        const summaryX = (doc.internal.pageSize.width - summaryW - 14);
        const summaryH = labels.length * 7 + 10;

        // Check footer page break
        if (startY + summaryH > 270) { doc.addPage(); startY = 20; }

        doc.roundedRect(summaryX, startY - 5, summaryW, summaryH, 2, 2);

        labels.forEach((l, i) => {
            const y = startY + (i * 7);
            doc.setFont('helvetica', i === labels.length - 1 ? 'bold' : 'normal');
            doc.text(l, summaryX + 4, y);
            doc.text(values[i], summaryX + summaryW - 4, y, { align: 'right' });
        });

        // Separator line
        const sepY = startY + ((labels.length - 1) * 7) - 4;
        doc.line(summaryX + 4, sepY, summaryX + summaryW - 4, sepY);

        // Number to words
        const words = numberToWordsFr(netPay);
        const capWords = words.charAt(0).toUpperCase() + words.slice(1);

        const textY = Math.max(startY + 40, startY + summaryH + 10);
        doc.setFont('helvetica', 'normal');
        doc.text('Arrêter la présente facture à la somme de :', 14, textY);
        doc.setFont('helvetica', 'bold');
        doc.text(capWords, 14, textY + 6);
    }

    // Add Page Numbers
    const addNums = addPageNumbers.bind(doc);
    addNums();

    // Save
    const safeTitle = getDocumentTitle(type, data.isProforma).replace(/\s+/g, '-');
    const fileName = `${safeTitle}-${data.invoiceNumber || 'doc'}.pdf`;
    doc.save(fileName);
}
