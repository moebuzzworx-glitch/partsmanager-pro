
'use client';

import { jsPDF } from 'jspdf';
// Import AutoTable as side effect - must come after jsPDF import
import AutoTable from 'jspdf-autotable';

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
  logoUrl?: string;
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

// A simple number to word converter for French
function numberToWordsFr(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '';
  if (n === 0) return 'zéro Dinar';

  const UNITS = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const TENS = ['', '', 'vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];

  function belowThousand(num: number): string {
    let words: string[] = [];
    const hundreds = Math.floor(num / 100);
    const rest = num % 100;
    if (hundreds) {
      if (hundreds > 1) words.push(UNITS[hundreds]);
      words.push(hundreds > 1 ? 'cents' : 'cent');
      if (rest === 0 && hundreds > 1) {
        // keep 'cents' plural only when exact hundreds >1
      }
    }

    if (rest) {
      if (rest < 20) {
        words.push(UNITS[rest]);
      } else {
        let tens = Math.floor(rest / 10);
        let unit = rest % 10;
        if (tens === 7 || tens === 9) {
          // 70..79 = soixante-dix+..., 90..99 = quatre-vingt-dix+...
          const base = TENS[tens];
          const sub = 10 + unit;
          if (unit === 1) words.push(base + ' et ' + UNITS[sub]);
          else words.push(base + '-' + UNITS[sub]);
        } else {
          const base = TENS[tens];
          if (unit === 1 && (tens === 1 || tens === 2 || tens === 3 || tens === 4 || tens === 5 || tens === 6)) {
            // e.g., vingt et un
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

  if (remaining) {
    parts.push(belowThousand(remaining));
  }

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


export async function generateInvoicePdf(data: InvoiceFormData, companyInfo?: CompanyInfo, defaultVat: number = 0, applyVat: boolean = false) {
  const doc = new jsPDF();
  const resolvedCompanyInfo = companyInfo ?? getCompanyInfo();

  const formatPrice = (price: number) => {
    if (typeof price !== 'number') return '0,00';
    const parts = price.toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${integerPart},${decimalPart}`;
  };

  const formatQuantity = (quantity: number) => {
    if (typeof quantity !== 'number') return '0';
    return Math.round(quantity).toString();
  };
  
  // Logo: if a logo URL is provided, attempt to load and draw it; otherwise draw placeholder initial.
  // Track logo's actual height for dynamic positioning of content below
  let logoHeight = 0;
  const logoX = 15;
  const logoY = 10;
  const logoWidth = 20;
  
  try {
    if (resolvedCompanyInfo.logoUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw image at left top area with dynamic sizing
          const imgHeight = (img.height / img.width) * logoWidth;
          logoHeight = imgHeight;
          try {
            doc.addImage(img, 'PNG', logoX, logoY, logoWidth, imgHeight);
          } catch (e) {
            // fallback to circle initial if addImage fails
            doc.setFillColor(237, 28, 36);
            doc.circle(logoX + logoWidth/2, logoY + logoWidth/2, logoWidth/2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255,255,255);
            const logoInitial = (resolvedCompanyInfo.companyName || 'C').charAt(0) || 'C';
            doc.text(logoInitial, logoX + logoWidth/2 - (doc.getTextWidth(logoInitial) / 2), logoY + logoWidth/2 + 1.5);
            logoHeight = logoWidth;
          }
          resolve();
        };
        img.onerror = () => {
          // draw placeholder
          doc.setFillColor(237, 28, 36);
          doc.circle(logoX + logoWidth/2, logoY + logoWidth/2, logoWidth/2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255,255,255);
          const logoInitial = (resolvedCompanyInfo.companyName || 'C').charAt(0) || 'C';
          doc.text(logoInitial, logoX + logoWidth/2 - (doc.getTextWidth(logoInitial) / 2), logoY + logoWidth/2 + 1.5);
          logoHeight = logoWidth;
          resolve();
        };
        img.src = resolvedCompanyInfo.logoUrl as string;
      });
    } else {
      doc.setFillColor(237, 28, 36);
      doc.circle(logoX + logoWidth/2, logoY + logoWidth/2, logoWidth/2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255,255,255);
      const logoInitial = (resolvedCompanyInfo.companyName || 'C').charAt(0) || 'C';
      doc.text(logoInitial, logoX + logoWidth/2 - (doc.getTextWidth(logoInitial) / 2), logoY + logoWidth/2 + 1.5);
      logoHeight = logoWidth;
    }
  } catch (e) {
    doc.setFillColor(237, 28, 36);
    doc.circle(logoX + logoWidth/2, logoY + logoWidth/2, logoWidth/2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255,255,255);
    const logoInitial = (resolvedCompanyInfo.companyName || 'C').charAt(0) || 'C';
    doc.text(logoInitial, logoX + logoWidth/2 - (doc.getTextWidth(logoInitial) / 2), logoY + logoWidth/2 + 1.5);
    logoHeight = logoWidth;
  }
  
  // Dynamically position company header based on logo height
  const headerStartY = logoY + logoHeight + 4; // 4pt spacing after logo

  // Company Header - Now that headerStartY is defined
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Adresse: ${resolvedCompanyInfo.address || ''}`, 14, headerStartY);
  doc.text('N° RC:', 14, headerStartY + 6);
  doc.text(resolvedCompanyInfo.rc || '', 30, headerStartY + 6);
  doc.text('N° NIF:', 14, headerStartY + 12);
  doc.text(resolvedCompanyInfo.nif || '', 30, headerStartY + 12);
  doc.text('N° Tél:', 14, headerStartY + 18);
  doc.text(resolvedCompanyInfo.phone || '', 30, headerStartY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(resolvedCompanyInfo.companyName || '', 105, headerStartY - 8, { align: 'center'});
  doc.setLineWidth(0.5);
  doc.line(85, headerStartY - 6, 125, headerStartY - 6); 

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('N° NIS:', 145, headerStartY);
  doc.text(resolvedCompanyInfo.nis || '', 185, headerStartY);
  doc.text('N° ART:', 145, headerStartY + 6);
  doc.text(resolvedCompanyInfo.art || '', 185, headerStartY + 6);
  doc.text('N° RIB:', 145, headerStartY + 12);
  doc.text(resolvedCompanyInfo.rib || '', 185, headerStartY + 12);

  // Calculate invoice box Y position dynamically based on company header height
  const headerEndY = headerStartY + 18; // 4 lines of text (address, RC, NIF, Tel) at 6pt spacing
  const invoiceBoxSpacingY = headerEndY + 4; // 4pt spacing after header

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
  const boxY = invoiceBoxSpacingY;
  const boxHeight = 10;
  
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3);
  doc.text(fullTitleText, boxX + 5, boxY + 6.5);
  
  // Client Info - Dynamic positioning based on content
  const clientInfoSpacingY = boxY + boxHeight + 4; // 4pt spacing after invoice box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text('Renseignements Client', 14, clientInfoSpacingY);
  
  // Track Y position for dynamic layout
  let clientBoxY = clientInfoSpacingY + 3; // 3pt below the label
  const clientBoxX = 12;
  const clientBoxWidth = 186;
  const clientTextLeftX = 16;
  const clientTextRightX = 105;
  const lineSpacing = 5.5;
  const clientPadding = 6; // Increased padding for better text spacing inside box
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Measure and draw client info - use multiple lines if needed
  let currentClientY = clientBoxY + clientPadding + 2; // Add extra 2pt for top breathing room
  const availableWidth = 80; // Width available per column
  
  // Left column
  const clientNameLines = doc.splitTextToSize(`Client : ${data.clientName}`, availableWidth);
  doc.text(clientNameLines, clientTextLeftX, currentClientY);
  currentClientY += clientNameLines.length * lineSpacing;
  
  const addressLines = doc.splitTextToSize(`Adresse : ${data.clientAddress || ''}`, availableWidth);
  doc.text(addressLines, clientTextLeftX, currentClientY);
  currentClientY += addressLines.length * lineSpacing;
  
  const nisLines = doc.splitTextToSize(`NIS : ${data.clientNis || ''}`, availableWidth);
  doc.text(nisLines, clientTextLeftX, currentClientY);
  currentClientY += nisLines.length * lineSpacing;
  
  const ribLines = doc.splitTextToSize(`RIB : ${data.clientRib || ''}`, availableWidth);
  doc.text(ribLines, clientTextLeftX, currentClientY);
  const leftColumnHeight = currentClientY - (clientBoxY + clientPadding) + lineSpacing;
  
  // Right column (parallel, starting from same Y as left)
  let currentRightY = clientBoxY + clientPadding;
  
  const rcLines = doc.splitTextToSize(`R.C : ${data.clientRc || ''}`, availableWidth);
  doc.text(rcLines, 130, currentRightY);
  currentRightY += rcLines.length * lineSpacing;
  
  const nifLines = doc.splitTextToSize(`NIF : ${data.clientNif || ''}`, availableWidth);
  doc.text(nifLines, 130, currentRightY);
  const rightColumnHeight = currentRightY - (clientBoxY + clientPadding) + lineSpacing;
  
  // Calculate total client box height based on taller column
  const clientBoxHeight = Math.max(leftColumnHeight, rightColumnHeight) + clientPadding;
  
  // Draw the box around the content (draw before text, so it appears behind)
  doc.setLineWidth(0.2);
  doc.roundedRect(clientBoxX, clientBoxY, clientBoxWidth, clientBoxHeight, 2, 2);
  
  // Calculate where table should start (after client box with some spacing)
  const tableStartY = clientBoxY + clientBoxHeight + 4;

  // Table
  const tableData = data.lineItems.map((item: any, index) => {
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
      formatPrice(total),
    ];
  });

  const totalHT = data.lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
  const totalTVA = applyVat ? data.lineItems.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.unitPrice * (defaultVat / 100));
  }, 0) : 0;
  const timbre = 0; // As per image
  const totalTTC = totalHT + totalTVA;
  const netAPayer = totalTTC + timbre;

  (AutoTable as any)(doc, {
    startY: tableStartY,
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

  // Dynamic summary box sizing to avoid clipping long numbers
  const labels = ['Montant HT :', 'Montant TVA :', 'Montant TTC :', 'Timbre :', 'Montant Net à payer'];
  const values = [formatPrice(totalHT), formatPrice(totalTVA), formatPrice(totalTTC), formatPrice(timbre), formatPrice(netAPayer)];

  doc.setFont('helvetica', 'normal');
  const labelWidths = labels.map(l => doc.getTextWidth(l));
  const valueWidths = values.map(v => doc.getTextWidth(v));
  const maxLabelWidth = Math.max(...labelWidths);
  const maxValueWidth = Math.max(...valueWidths);

  const padding = 6;
  const gap = 8; // space between label and value
  const rowHeight = 7;
  const rows = labels.length;

  let summaryBoxWidth = maxLabelWidth + gap + maxValueWidth + padding * 2;
  const pageWidth = (doc.internal.pageSize as any).width;
  const rightMargin = 14;
  if (summaryBoxWidth > pageWidth - 2 * rightMargin) {
    summaryBoxWidth = pageWidth - 2 * rightMargin;
  }

  const summaryBoxHeight = rows * rowHeight + padding * 2;
  let summaryX = pageWidth - summaryBoxWidth - rightMargin;
  let summaryY = startY;

  // If the box would overflow the page vertically, start a new page
  if (summaryY + summaryBoxHeight > (doc.internal.pageSize as any).height - 20) {
    doc.addPage();
    summaryY = 20 + padding;
  }

  doc.roundedRect(summaryX, summaryY - padding, summaryBoxWidth, summaryBoxHeight, 2, 2);

  // Draw rows
  for (let i = 0; i < rows; i++) {
    let y = summaryY + i * rowHeight;
    // Bold the last label/value
    if (i === rows - 1) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');

    // Ensure label fits within left portion
    const labelX = summaryX + padding;
    // push the last (net) row slightly down so it sits below the separator
    if (i === rows - 1) y += 4;
    doc.text(labels[i], labelX, y);

    // Value aligned to the right inside the box
    const valueX = summaryX + summaryBoxWidth - padding;
    doc.text(values[i], valueX, y, { align: 'right' });
  }

  // Draw a separator above the net to pay (before last row). Place it
  // slightly above the pushed-down net row.
  const sepBase = summaryY + (rows - 1) * rowHeight;
  const sepY = sepBase - 4; // move separator slightly higher above the net row
  doc.setLineWidth(0.2);
  doc.line(summaryX + padding, sepY, summaryX + summaryBoxWidth - padding, sepY);

  doc.setFont('helvetica', 'normal');

  // Dynamically position the "amount in text" block so it never overlaps the summary box.
  const leftMargin = 14;
  const pageHeight = (doc.internal.pageSize as any).height;
  const summaryBottom = summaryY - padding + summaryBoxHeight;

  // Start at least 40pt below startY or just below the summary box
  let textY = Math.max(startY + 40, summaryBottom + 6);

  // Try to place amount-in-text to the left of the summary box first.
  const leftAvailable = Math.max(40, summaryX - leftMargin - 8);
  const fullAvailable = (doc.internal.pageSize as any).width - leftMargin * 2;
  const words = numberToWordsFr(netAPayer);
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  const approxLineHeight = 6;

  const splitLeft = doc.splitTextToSize(capitalized, leftAvailable);
  const heightLeft = splitLeft.length * approxLineHeight;

  const splitFull = doc.splitTextToSize(capitalized, fullAvailable);
  const heightFull = splitFull.length * approxLineHeight;

  // Prefer left placement if it fits vertically; otherwise try full-width
  if (summaryBottom + 6 + heightLeft <= pageHeight - 20) {
    // left column OK
    doc.text('Arrêter la présente facture à la somme de :', leftMargin, textY);
    textY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(splitLeft, leftMargin, textY);
  } else if (summaryBottom + 6 + heightFull <= pageHeight - 20) {
    // full width below summary fits
    doc.text('Arrêter la présente facture à la somme de :', leftMargin, textY);
    textY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(splitFull, leftMargin, textY);
  } else {
    // no room below summary -> new page
    doc.addPage();
    textY = 20 + padding;
    doc.text('Arrêter la présente facture à la somme de :', leftMargin, textY);
    textY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(splitFull, leftMargin, textY);
  }

  
  // Page numbers - using a custom function to handle jsPDF's context
  const addNumbers = addPageNumbers.bind(doc);
  addNumbers();

  const fileName = data.isProforma ? `Facture-Proforma-${data.invoiceNumber}.pdf` : `Facture-${data.invoiceNumber}.pdf`;
  doc.save(fileName);
}
