import { jsPDF } from 'jspdf';
import type {
  CurrencyCode,
  Person,
  ReceiptData,
  SplitSummary,
} from '../types';
import { buildUpiUri } from './splitMath';

export function formatMoneyForPdf(
  amount: number,
  currency: CurrencyCode = 'USD'
): string {
  const prefixMap: Record<CurrencyCode, string> = {
    USD: '$',
    INR: 'INR ',
    EUR: 'EUR ',
    GBP: 'GBP ',
  };
  const prefix = prefixMap[currency] ?? '$';
  const rounded = Math.round(amount * 100) / 100;
  const absFormatted = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return rounded < 0 ? `-${prefix}${absFormatted}` : `${prefix}${absFormatted}`;
}

export function buildPdfFilename(title: string, date: string): string {
  const safeTitle = (title || 'group-bill')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const safeDate = (date || new Date().toISOString().slice(0, 10)).replace(
    /[^0-9-]/g,
    ''
  );
  return `snapsplit-${safeTitle || 'bill'}-${safeDate || 'split'}.pdf`;
}

export function createSplitPdfDoc(
  receipt: ReceiptData,
  summary: SplitSummary,
  people: Person[],
  includeUpiLinks = true
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 52;
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = 48;
    }
  };

  const paidBy = people.find((p) => p.id === receipt.paidById);
  const currency = receipt.currency;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text('SNAPSPLIT  ·  GROUP BILL BREAKDOWN', marginX, y);
  doc.text(receipt.date || new Date().toISOString().slice(0, 10), pageWidth - marginX, y, {
    align: 'right',
  });
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 15, 15);
  const billTitle = (receipt.title || 'Group Bill Split').trim();
  const titleLines = doc.splitTextToSize(billTitle, contentWidth);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 22 + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const metaParts: string[] = [];
  if (paidBy) metaParts.push(`Paid by: ${paidBy.name}`);
  metaParts.push(`Currency: ${currency}`);
  if (includeUpiLinks && receipt.upiId.trim()) {
    metaParts.push(`UPI: ${receipt.upiId.trim()}`);
  }
  doc.text(metaParts.join('   |   '), marginX, y);
  y += 16;

  // Totals Box
  doc.setDrawColor(210, 210, 210);
  doc.setFillColor(246, 246, 246);
  doc.rect(marginX, y, contentWidth, 56, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('GRAND TOTAL', marginX + 14, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 15, 15);
  doc.text(
    formatMoneyForPdf(summary.grandTotal, currency),
    marginX + 14,
    y + 42
  );

  const chargeParts = [`Items ${formatMoneyForPdf(summary.itemsTotal, currency)}`];
  if (summary.tax > 0) chargeParts.push(`Tax ${formatMoneyForPdf(summary.tax, currency)}`);
  if (summary.tip > 0) chargeParts.push(`Tip ${formatMoneyForPdf(summary.tip, currency)}`);
  if (summary.serviceCharge > 0) {
    chargeParts.push(`Service ${formatMoneyForPdf(summary.serviceCharge, currency)}`);
  }
  if (summary.discount > 0) {
    chargeParts.push(`Discount -${formatMoneyForPdf(summary.discount, currency)}`);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 75, 75);
  const chargeText = doc.splitTextToSize(chargeParts.join('  ·  '), contentWidth - 170);
  doc.text(chargeText, pageWidth - marginX - 14, y + 28, { align: 'right' });

  y += 76;

  // Per-Person Breakdown Heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text('PER-PERSON SHARE', marginX, y);
  y += 8;
  doc.setDrawColor(225, 225, 225);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  const activePeople = summary.people.filter(
    (p) => p.items.length > 0 || p.totalOwed > 0
  );

  for (const person of activePeople) {
    const isPayer = paidBy?.id === person.personId;
    const extras: string[] = [];
    if (person.taxShare > 0) extras.push(`Tax ${formatMoneyForPdf(person.taxShare, currency)}`);
    if (person.tipShare > 0) extras.push(`Tip ${formatMoneyForPdf(person.tipShare, currency)}`);
    if (person.serviceChargeShare > 0) {
      extras.push(`Service ${formatMoneyForPdf(person.serviceChargeShare, currency)}`);
    }
    if (person.discountShare > 0) {
      extras.push(`Discount -${formatMoneyForPdf(person.discountShare, currency)}`);
    }

    const showUpiLine =
      includeUpiLinks && receipt.upiId.trim().length > 0 && !isPayer && person.totalOwed > 0;
    const estimatedHeight =
      32 + person.items.length * 15 + (extras.length > 0 ? 15 : 0) + (showUpiLine ? 16 : 0) + 14;
    ensureSpace(estimatedHeight);

    // Person header row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 15, 15);
    doc.text(
      `${person.name}${isPayer ? ' (Paid)' : ''}`,
      marginX,
      y
    );
    doc.text(
      formatMoneyForPdf(person.totalOwed, currency),
      pageWidth - marginX,
      y,
      { align: 'right' }
    );
    y += 16;

    // Items list
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(55, 55, 55);
    for (const item of person.items) {
      ensureSpace(16);
      const splitLabel = item.splitCount > 1 ? ` (1/${item.splitCount} split)` : '';
      const label = `- ${item.name}${splitLabel}`;
      const truncatedLabel =
        label.length > 68 ? `${label.slice(0, 65)}...` : label;
      doc.text(truncatedLabel, marginX + 10, y);
      doc.text(
        formatMoneyForPdf(item.shareAmount, currency),
        pageWidth - marginX,
        y,
        { align: 'right' }
      );
      y += 14;
    }

    // Extras line
    if (extras.length > 0) {
      ensureSpace(16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(105, 105, 105);
      doc.text(`Proportional: ${extras.join(', ')}`, marginX + 10, y);
      y += 14;
    }

    // UPI payment reference
    if (showUpiLine) {
      ensureSpace(16);
      const upiUri = buildUpiUri({
        upiId: receipt.upiId,
        payeeName: paidBy?.name || 'SnapSplit',
        amount: person.totalOwed,
        currency: receipt.currency,
        note: `${billTitle} - ${person.name}`,
      });
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(
        `Pay ${receipt.upiId.trim()} · ${upiUri.slice(0, 82)}`,
        marginX + 10,
        y
      );
      y += 14;
    }

    y += 6;
    doc.setDrawColor(235, 235, 235);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 14;
  }

  if (summary.unassignedCount > 0) {
    ensureSpace(32);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(140, 80, 20);
    doc.text(
      `Note: ${summary.unassignedCount} item(s) (${formatMoneyForPdf(
        summary.remainingToAssignTotal,
        currency
      )}) are still unassigned.`,
      marginX,
      y
    );
  }

  return doc;
}

export function downloadSplitPdf(
  receipt: ReceiptData,
  summary: SplitSummary,
  people: Person[],
  includeUpiLinks = true
): string {
  const filename = buildPdfFilename(receipt.title, receipt.date);
  const doc = createSplitPdfDoc(receipt, summary, people, includeUpiLinks);
  doc.save(filename);
  return filename;
}

export function createSplitPdfFile(
  receipt: ReceiptData,
  summary: SplitSummary,
  people: Person[],
  includeUpiLinks = true
): File {
  const filename = buildPdfFilename(receipt.title, receipt.date);
  const doc = createSplitPdfDoc(receipt, summary, people, includeUpiLinks);
  const blob = doc.output('blob');
  return new File([blob], filename, { type: 'application/pdf' });
}
