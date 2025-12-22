
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';

import type { InvoiceFormData } from './create-invoice-form';
import { User as AppUser } from '@/lib/types';
import { canExport } from '@/lib/trial-utils';

export interface CompanyInfo {
  companyName: string;
  address: string;
  phone: string;
  rc?: string;
  nif?: string;
  art?: string;
  nis?: string;
  rib?: string;
}

/**
 * Checks if a user can generate invoice PDFs
 * Trial users cannot export
 */
export function userCanExportInvoice(user: AppUser): boolean {
  return canExport(user);
}

/**
 * Gets export restriction message for trial users
 */
export function getExportRestrictionMessage(user: AppUser): string | null {
  if (!canExport(user)) {
    if (user.subscription === 'trial') {
      return 'Trial users cannot export invoices. Please upgrade to premium to enable exports.';
    }
    return 'You do not have permission to export invoices.';
  }
  return null;
}

// This function needs to be written in a way that jsPDF's weird 'this' context works.
function addPageNumbers(this: jsPDF) {
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

// A simple number to word converter for French
function numberToWordsFr(n: number): string {
    if (n === 0) return "zéro";

    const a = [
        "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
        "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"
    ];
    const b = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
    
    const format = (num: number) => {
        let str = '';
        if (num >= 1000000000) {
            str += format(Math.floor(num / 1000000000)) + " milliard ";
            num %= 1000000000;
        }
        if (num >= 1000000) {
            str += format(Math.floor(num / 1000000)) + " million ";
            num %= 1000000;
        }
        if (num >= 1000) {
            const thousands = Math.floor(num / 1000);
            str += (thousands > 1 ? format(thousands) : (thousands === 1 ? 'mille' : '')) + " ";
            num %= 1000;
        }
        if (num >= 100) {
            const hundreds = Math.floor(num / 100);
            str += (hundreds > 1 ? a[hundreds] + ' ' : '') + "cent ";
            num %= 100;
        }

        if (num > 0) {
            if (num < 20) {
                str += a[num];
            } else {
                const tens = Math.floor(num / 10);
                const unit = num % 10;
                if (tens === 7 || tens === 9) {
                     str += b[tens-1] + (unit === 1 ? ' et ' : '-') + a[10 + unit];
                } else {
                    str += b[tens] + (unit === 1 ? ' et ' : '') + (unit > 0 ? '-' + a[unit] : '');
                }
            }
        }
        return str.trim();
    };
    const integerPart = Math.floor(n);
    const decimalPart = Math.round((n - integerPart) * 100);

    let words = format(integerPart);
    if(integerPart > 1) words += " Dinars"; else words += " Dinar";

    if (decimalPart > 0) {
        words += " et " + format(decimalPart) + " centimes";
    }

    return words.replace(/\s+/g, ' ').trim();
}

function getCompanyInfo(): CompanyInfo {
    try {
        const storedInfo = localStorage.getItem('companyInfo');
        if (storedInfo) {
            return JSON.parse(storedInfo);
        }
    } catch (error) {
        console.error("Could not retrieve company info from local storage", error);
    }
    // Return default/empty info if nothing is stored
    return {
        companyName: 'Your Company Name',
        address: 'Your Address',
        rc: 'Your R.C',
        nif: 'Your NIF',
        art: '',
        nis: '',
        rib: '',
        phone: 'Your Phone'
    };
}


export function generateInvoicePdf(data: InvoiceFormData) {
  const doc = new jsPDF();
  const companyInfo = getCompanyInfo();

  const formatPrice = (price: number) => {
    if (typeof price !== 'number') return '0,00';
    const parts = price.toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${decimalPart}`;
  };
  
  // Company Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Adresse: ${companyInfo.address || ''}`, 14, 28);
  doc.text('N° RC:', 14, 34);
  doc.text(companyInfo.rc || '', 30, 34);
  doc.text('N° NIF:', 14, 40);
  doc.text(companyInfo.nif || '', 30, 40);
  doc.text('N° Tél:', 14, 46);
  doc.text(companyInfo.phone || '', 30, 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(companyInfo.companyName || '', 105, 18, { align: 'center'});
  doc.setLineWidth(0.5);
  doc.line(85, 20, 125, 20); 


  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('N° NIS:', 150, 28);
  doc.text(companyInfo.nis || '', 165, 28);
  doc.text('N° ART:', 150, 34);
  doc.text(companyInfo.art || '', 165, 34);
  doc.text('N° RIB:', 150, 40);
  doc.text(companyInfo.rib || '', 165, 40);

  // Logo Placeholder
  doc.setFillColor(237, 28, 36);
  doc.circle(25, 18, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255,255,255);
  const logoInitial = companyInfo.companyName.charAt(0) || 'C';
  doc.text(logoInitial, 25 - (doc.getTextWidth(logoInitial) / 2), 19.5);


  // Invoice Number Box
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  
  const invoiceTitle = data.isProforma ? 'Facture Proforma N°' : 'Facture N°';
  const invoiceDate = `Le : ${new Date(data.invoiceDate).toLocaleDateString('fr-FR')}`;
  const fullTitleText = `${invoiceTitle} : ${data.invoiceNumber}     ${invoiceDate}`;
  
  const textWidth = doc.getTextWidth(fullTitleText);
  const boxWidth = textWidth + 10; // Add some padding
  const boxX = (doc.internal.pageSize.width - boxWidth) / 2;
  const boxY = 52;
  const boxHeight = 10;
  
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3);
  doc.text(fullTitleText, boxX + 5, boxY + 6.5);
  
  // Client Info
  doc.setFont('helvetica', 'bold');
  doc.text('Renseignements Client', 14, 70);
  doc.setLineWidth(0.2);
  doc.roundedRect(12, 73, 186, 25, 2, 2);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Client : ${data.clientName}`, 16, 79);
  doc.text(`Adresse : ${data.clientAddress || ''}`, 16, 89);
  doc.text(`NIS : ${data.clientNis || ''}`, 16, 84);

  doc.text(`R.C : ${data.clientRc || ''}`, 105, 79, { align: 'left' });
  doc.text(`NIF : ${data.clientNif || ''}`, 105, 84, { align: 'left' });


  // Table
  const tableData = data.lineItems.map((item, index) => {
    const total = item.quantity * item.unitPrice;
    return [
      index + 1,
      item.reference || '',
      item.designation,
      item.unit || '',
      formatPrice(item.quantity),
      formatPrice(item.unitPrice),
      formatPrice(item.vat),
      formatPrice(total),
    ];
  });
  
  const totalHT = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalTVA = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.vat / 100)), 0);
  const timbre = 0; // As per image
  const totalTTC = totalHT + totalTVA;
  const netAPayer = totalTTC + timbre;

  (doc as any).autoTable({
    startY: 102,
    head: [['N°', 'Référence', 'Désignation', 'U', 'Qté', 'PUV', 'TVA(%)', 'Montant HT']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
        lineWidth: 0.1,
        lineColor: [150, 150, 150],
        fontSize: 9
    },
    columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 20 },
        2: { halign: 'left', cellWidth: 60 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'right', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 15 },
        7: { halign: 'right', cellWidth: 25 },
    },
    didDrawPage: (hookData: any) => {
        // We don't draw the footer here anymore to avoid complexity.
        // It will be drawn once after the table is finished.
    }
  });

  // --- FOOTER SECTION ---
  // This section is now drawn *after* the autoTable has finished rendering all pages.
  let finalY = (doc as any).lastAutoTable.finalY;
  
  if (typeof finalY !== 'number') {
    finalY = 120; // A sensible fallback
  }

  let startY = finalY + 10;
  if (startY > 230) { // Check if we need a new page for the footer
      doc.addPage();
      startY = 20;
  }

  const paymentMethodText = `Mode paiement: ${data.paymentMethod || 'Espèce'}`;
  doc.setFont('helvetica', 'normal');
  doc.text(paymentMethodText, 14, startY);

  const summaryX = 130;
  let summaryY = startY;
  doc.roundedRect(summaryX - 5, summaryY - 5, 70, 32, 2, 2);
  doc.text(`Montant HT :`, summaryX, summaryY);
  doc.text(`${formatPrice(totalHT)}`, summaryX + 63, summaryY, { align: 'right'});
  summaryY += 6;
  doc.text(`Montant TVA :`, summaryX, summaryY);
  doc.text(`${formatPrice(totalTVA)}`, summaryX + 63, summaryY, { align: 'right'});
  summaryY += 6;
  doc.text(`Montant TTC :`, summaryX, summaryY);
  doc.text(`${formatPrice(totalTTC)}`, summaryX + 63, summaryY, { align: 'right'});
  summaryY += 6;
  doc.text(`Timbre :`, summaryX, summaryY);
  doc.text(`${formatPrice(timbre)}`, summaryX + 63, summaryY, { align: 'right'});
  
  doc.setLineWidth(0.2);
  doc.line(summaryX, summaryY + 2, summaryX + 60, summaryY + 2);
  summaryY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text(`Montant Net à payer`, summaryX, summaryY);
  doc.text(`${formatPrice(netAPayer)}`, summaryX + 63, summaryY, { align: 'right'});

  doc.setFont('helvetica', 'normal');
  let textY = startY + 40; // Position below payment method
   if (textY < summaryY + 10) { // check if there is enough space, if not push it down
     textY = summaryY + 10;
   }
   if (textY > 260) {
    doc.addPage();
    textY = 20;
   }
  doc.text('Arrêter la présente facture à la somme de :', 14, textY);
  textY += 6;
  doc.setFont('helvetica', 'bold');
  const words = numberToWordsFr(netAPayer);
  // Split into lines if too long
  const splitWords = doc.splitTextToSize(words.charAt(0).toUpperCase() + words.slice(1), 180);
  doc.text(splitWords, 14, textY);

  
  // Page numbers - using a custom function to handle jsPDF's context
  const addNumbers = addPageNumbers.bind(doc);
  addNumbers();

  const fileName = data.isProforma ? `Facture-Proforma-${data.invoiceNumber}.pdf` : `Facture-${data.invoiceNumber}.pdf`;
  doc.save(fileName);
}
