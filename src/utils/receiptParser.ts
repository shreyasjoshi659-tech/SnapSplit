import type { CurrencyCode, ExpenseCategory, ReceiptData, ReceiptItem } from '../types';

export interface ParsedReceiptPayload {
  title: string;
  date: string;
  category: ExpenseCategory;
  currency: CurrencyCode;
  items: Omit<ReceiptItem, 'assignedTo'>[];
  tax: number;
  tip: number;
  serviceCharge: number;
  discount: number;
}

const IGNORE_PATTERNS = [
  /^\s*subtotal\b/i,
  /^\s*sub-total\b/i,
  /^\s*grand\s*total\b/i,
  /^\s*total\b/i,
  /^\s*balance\s*due\b/i,
  /^\s*amount\s*due\b/i,
  /^\s*change\b/i,
  /^\s*cash\b/i,
  /^\s*visa\b/i,
  /^\s*mastercard\b/i,
  /^\s*thank\s*you\b/i,
  /^\s*receipt\s*#/i,
  /^\s*order\s*#/i,
  /^\s*table\s*#?/i,
  /^\s*server\b/i,
];

function detectCurrency(text: string): CurrencyCode {
  if (text.includes('₹') || /\bINR\b|\bRs\.?\b/i.test(text)) return 'INR';
  if (text.includes('€') || /\bEUR\b/i.test(text)) return 'EUR';
  if (text.includes('£') || /\bGBP\b/i.test(text)) return 'GBP';
  return 'USD';
}

function detectCategory(text: string): ExpenseCategory {
  const lower = text.toLowerCase();
  if (/grocery|market|produce|milk|bread|trader joe|whole foods|costco|mart/.test(lower)) {
    return 'Groceries';
  }
  if (/bar|pub|brewery|cocktail|wine|beer|taproom|lounge/.test(lower)) {
    return 'Drinks';
  }
  if (/uber|lyft|taxi|flight|airline|train|hotel|fuel|gas/.test(lower)) {
    return 'Travel';
  }
  if (/electric|water|internet|wifi|utility|bill/.test(lower)) {
    return 'Utilities';
  }
  return 'Dining';
}

/**
 * Deterministic fallback parser for structured or semi-structured raw receipt text.
 * Extracts item names, quantities, prices, tax, tip, service charges, and discounts.
 */
export function parseReceiptTextFallback(rawText: string): ParsedReceiptPayload {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const currency = detectCurrency(rawText);
  const category = detectCategory(rawText);
  const today = new Date().toISOString().slice(0, 10);

  let title = 'Parsed Receipt';
  let tax = 0;
  let tip = 0;
  let serviceCharge = 0;
  let discount = 0;
  const items: Omit<ReceiptItem, 'assignedTo'>[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Check first meaningful line without trailing price as merchant title
    if (i === 0 && !/[$₹€£]?\d+\.\d{2}\s*$/.test(line) && line.length <= 48) {
      title = line.replace(/^[-=*#\s]+|[-=*#\s]+$/g, '') || title;
      continue;
    }

    // Match trailing price like "$18.50", "18.50", "-$5.00", "₹450", "(5.00)"
    const priceMatch = line.match(
      /^(.*?)\s+(-?[$₹€£]?\s*\d+(?:,\d{3})*(?:\.\d{1,2})?|\([$₹€£]?\d+(?:\.\d{1,2})?\))\s*$/
    );

    if (!priceMatch) continue;

    let label = priceMatch[1].trim();
    const rawPriceStr = priceMatch[2].replace(/[$,₹€£\s]/g, '');
    const isParenNegative = rawPriceStr.startsWith('(') && rawPriceStr.endsWith(')');
    const numericPrice = parseFloat(rawPriceStr.replace(/[()]/g, ''));
    if (!Number.isFinite(numericPrice)) continue;

    const signedPrice = isParenNegative ? -Math.abs(numericPrice) : numericPrice;

    if (/\b(tax|gst|vat|cgst|sgst|sales tax)\b/i.test(label)) {
      tax += Math.abs(signedPrice);
      continue;
    }
    if (/\b(tip|gratuity)\b/i.test(label)) {
      tip += Math.abs(signedPrice);
      continue;
    }
    if (/\b(service\s*charge|service\s*fee|convenience\s*fee|delivery\s*fee)\b/i.test(label)) {
      serviceCharge += Math.abs(signedPrice);
      continue;
    }
    if (/\b(discount|promo|coupon|savings|off)\b/i.test(label) || signedPrice < 0) {
      discount += Math.abs(signedPrice);
      continue;
    }
    if (IGNORE_PATTERNS.some((pattern) => pattern.test(label))) {
      continue;
    }

    // Extract leading quantity like "2x Pasta" or "2 Pasta"
    let quantity = 1;
    const qtyPrefixMatch = label.match(/^(\d+)\s*[xX×]?\s+(.+)$/);
    if (qtyPrefixMatch) {
      const parsedQty = parseInt(qtyPrefixMatch[1], 10);
      if (parsedQty > 0 && parsedQty <= 50) {
        quantity = parsedQty;
        label = qtyPrefixMatch[2].trim();
      }
    }

    // Clean trailing @ unit price notes like "2x Taco @ 4.50"
    label = label.replace(/\s*@\s*[$₹€£]?\d+(?:\.\d{1,2})?\s*$/, '').trim();
    if (!label) continue;

    const totalPrice = Math.round(signedPrice * 100) / 100;
    const unitPrice = Math.round((totalPrice / quantity) * 100) / 100;

    items.push({
      id: `item-${items.length + 1}-${Date.now().toString(36)}`,
      name: label,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  return {
    title,
    date: today,
    category,
    currency,
    items,
    tax: Math.round(tax * 100) / 100,
    tip: Math.round(tip * 100) / 100,
    serviceCharge: Math.round(serviceCharge * 100) / 100,
    discount: Math.round(discount * 100) / 100,
  };
}

export function normalizeParsedPayloadToReceipt(
  payload: ParsedReceiptPayload,
  defaultPaidById: string,
  existingUpiId = ''
): ReceiptData {
  return {
    title: payload.title || 'Untitled Receipt',
    date: payload.date || new Date().toISOString().slice(0, 10),
    category: payload.category || 'Dining',
    currency: payload.currency || 'USD',
    items: payload.items.map((item, idx) => ({
      id: item.id || `item-${idx + 1}-${Math.random().toString(36).slice(2, 7)}`,
      name: item.name,
      quantity: item.quantity > 0 ? item.quantity : 1,
      unitPrice: Number.isFinite(item.unitPrice) ? item.unitPrice : item.totalPrice,
      totalPrice: Number.isFinite(item.totalPrice) ? item.totalPrice : 0,
      assignedTo: [],
    })),
    tax: Math.max(0, Number(payload.tax) || 0),
    tip: Math.max(0, Number(payload.tip) || 0),
    serviceCharge: Math.max(0, Number(payload.serviceCharge) || 0),
    discount: Math.max(0, Number(payload.discount) || 0),
    paidById: defaultPaidById,
    upiId: existingUpiId,
  };
}
