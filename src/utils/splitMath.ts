import type {
  CurrencyCode,
  Person,
  PersonBreakdown,
  PersonItemShare,
  ReceiptData,
  SplitSummary,
} from '../types';

export const CURRENCY_META: Record<
  CurrencyCode,
  { symbol: string; code: CurrencyCode; label: string }
> = {
  USD: { symbol: '$', code: 'USD', label: 'USD ($)' },
  INR: { symbol: '₹', code: 'INR', label: 'INR (₹)' },
  EUR: { symbol: '€', code: 'EUR', label: 'EUR (€)' },
  GBP: { symbol: '£', code: 'GBP', label: 'GBP (£)' },
};

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatMoney(amount: number, currency: CurrencyCode = 'USD'): string {
  const { symbol } = CURRENCY_META[currency] ?? CURRENCY_META.USD;
  const rounded = Math.round(amount * 100) / 100;
  const absFormatted = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return rounded < 0 ? `-${symbol}${absFormatted}` : `${symbol}${absFormatted}`;
}

/**
 * Distributes `totalCents` across `weights` using Hamilton's Largest Remainder Method.
 * Guarantees that the returned integer array sums exactly to `totalCents`.
 */
export function distributeByWeights(
  totalCents: number,
  weights: number[],
  totalWeightOverride?: number
): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (totalCents === 0) return new Array(n).fill(0);

  const sanitizedWeights = weights.map((w) => Math.max(0, w));
  const sumWeights =
    totalWeightOverride !== undefined
      ? Math.max(0, totalWeightOverride)
      : sanitizedWeights.reduce((acc, w) => acc + w, 0);

  if (sumWeights <= 0) {
    return new Array(n).fill(0);
  }

  const sign = totalCents < 0 ? -1 : 1;
  const absTotal = Math.abs(totalCents);

  const exactShares = sanitizedWeights.map((w) => (absTotal * w) / sumWeights);
  const floors = exactShares.map((val) => Math.floor(val));
  const assignedSum = floors.reduce((acc, v) => acc + v, 0);

  // If totalWeightOverride > sum(sanitizedWeights), only distribute the proportional portion.
  const targetDistributed =
    totalWeightOverride !== undefined && totalWeightOverride > 0
      ? Math.round(
          (absTotal * sanitizedWeights.reduce((acc, w) => acc + w, 0)) /
            totalWeightOverride
        )
      : absTotal;

  let remainder = Math.max(0, targetDistributed - assignedSum);

  const remainders = exactShares
    .map((val, idx) => ({ idx, frac: val - floors[idx], weight: sanitizedWeights[idx] }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.frac - a.frac || a.idx - b.idx);

  let cursor = 0;
  while (remainder > 0 && remainders.length > 0) {
    const target = remainders[cursor % remainders.length];
    floors[target.idx] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return floors.map((v) => v * sign);
}

/**
 * Splits an integer cent value evenly across `count` participants,
 * rotating the extra remainder pennies by `rotationOffset` for fairness.
 */
export function splitEvenlyCents(
  amountCents: number,
  count: number,
  rotationOffset = 0
): number[] {
  if (count <= 0) return [];
  const sign = amountCents < 0 ? -1 : 1;
  const abs = Math.abs(amountCents);
  const base = Math.floor(abs / count);
  const rem = abs % count;
  const result = new Array<number>(count).fill(base);
  for (let i = 0; i < rem; i += 1) {
    const idx = (rotationOffset + i) % count;
    result[idx] += 1;
  }
  return result.map((v) => v * sign);
}

export function calculateSplitSummary(
  receipt: ReceiptData,
  people: Person[]
): SplitSummary {
  const validPeopleIds = new Set(people.map((p) => p.id));

  const itemsTotalCents = receipt.items.reduce(
    (sum, item) => sum + toCents(item.totalPrice),
    0
  );
  const taxCents = Math.max(0, toCents(receipt.tax));
  const tipCents = Math.max(0, toCents(receipt.tip));
  const serviceChargeCents = Math.max(0, toCents(receipt.serviceCharge));
  const discountCents = Math.max(0, toCents(receipt.discount));

  const perPersonItemsMap = new Map<string, PersonItemShare[]>();
  const perPersonSubtotalCents = new Map<string, number>();

  for (const person of people) {
    perPersonItemsMap.set(person.id, []);
    perPersonSubtotalCents.set(person.id, 0);
  }

  let assignedSubtotalCents = 0;
  let unassignedSubtotalCents = 0;
  let unassignedCount = 0;

  receipt.items.forEach((item, itemIdx) => {
    const itemCents = toCents(item.totalPrice);
    const assignees = item.assignedTo.filter((id) => validPeopleIds.has(id));

    if (assignees.length === 0) {
      unassignedSubtotalCents += itemCents;
      unassignedCount += 1;
      return;
    }

    assignedSubtotalCents += itemCents;
    const shares = splitEvenlyCents(itemCents, assignees.length, itemIdx);

    assignees.forEach((personId, idx) => {
      const shareCents = shares[idx];
      perPersonSubtotalCents.set(
        personId,
        (perPersonSubtotalCents.get(personId) ?? 0) + shareCents
      );
      perPersonItemsMap.get(personId)?.push({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        itemTotal: fromCents(itemCents),
        shareAmount: fromCents(shareCents),
        splitCount: assignees.length,
      });
    });
  });

  const weights = people.map((p) => Math.max(0, perPersonSubtotalCents.get(p.id) ?? 0));
  const sumPositiveWeights = weights.reduce((a, b) => a + b, 0);

  // When all items are assigned, distribute 100% of tax/tip/service/discount across people.
  // When some items remain unassigned, distribute proportionally against total items so shares stay stable.
  const totalPositiveItemsCents = receipt.items.reduce(
    (sum, item) => sum + Math.max(0, toCents(item.totalPrice)),
    0
  );
  const weightDenominator =
    unassignedCount === 0
      ? sumPositiveWeights
      : Math.max(sumPositiveWeights, totalPositiveItemsCents);

  const taxShares = distributeByWeights(taxCents, weights, weightDenominator);
  const tipShares = distributeByWeights(tipCents, weights, weightDenominator);
  const serviceShares = distributeByWeights(
    serviceChargeCents,
    weights,
    weightDenominator
  );
  const discountShares = distributeByWeights(
    discountCents,
    weights,
    weightDenominator
  );

  let assignedGrandTotalCents = 0;

  const peopleBreakdown: PersonBreakdown[] = people.map((person, idx) => {
    const itemsSubtotalCents = perPersonSubtotalCents.get(person.id) ?? 0;
    const taxShareCents = taxShares[idx] ?? 0;
    const tipShareCents = tipShares[idx] ?? 0;
    const serviceShareCents = serviceShares[idx] ?? 0;
    const discountShareCents = discountShares[idx] ?? 0;

    const personTotalCents =
      itemsSubtotalCents +
      taxShareCents +
      tipShareCents +
      serviceShareCents -
      discountShareCents;

    assignedGrandTotalCents += personTotalCents;

    return {
      personId: person.id,
      name: person.name,
      colorKey: person.colorKey,
      itemsSubtotal: fromCents(itemsSubtotalCents),
      taxShare: fromCents(taxShareCents),
      tipShare: fromCents(tipShareCents),
      serviceChargeShare: fromCents(serviceShareCents),
      discountShare: fromCents(discountShareCents),
      totalOwed: fromCents(personTotalCents),
      items: perPersonItemsMap.get(person.id) ?? [],
    };
  });

  const grandTotalCents =
    itemsTotalCents + taxCents + tipCents + serviceChargeCents - discountCents;
  const remainingToAssignTotalCents = grandTotalCents - assignedGrandTotalCents;

  return {
    itemsTotal: fromCents(itemsTotalCents),
    assignedSubtotal: fromCents(assignedSubtotalCents),
    unassignedSubtotal: fromCents(unassignedSubtotalCents),
    unassignedCount,
    tax: fromCents(taxCents),
    tip: fromCents(tipCents),
    serviceCharge: fromCents(serviceChargeCents),
    discount: fromCents(discountCents),
    grandTotal: fromCents(grandTotalCents),
    assignedGrandTotal: fromCents(assignedGrandTotalCents),
    remainingToAssignTotal: fromCents(remainingToAssignTotalCents),
    people: peopleBreakdown,
  };
}

export function buildUpiUri(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  currency?: CurrencyCode;
  note?: string;
}): string {
  const cleanId = params.upiId.trim();
  if (!cleanId) return '';
  const query = new URLSearchParams({
    pa: cleanId,
    pn: params.payeeName.trim() || 'SnapSplit Payee',
    am: Math.max(0, params.amount).toFixed(2),
    cu: params.currency === 'INR' || !params.currency ? 'INR' : params.currency,
    tn: (params.note || 'SnapSplit Bill Share').slice(0, 50),
  });
  return `upi://pay?${query.toString()}`;
}

export function generateShareableSummary(
  receipt: ReceiptData,
  summary: SplitSummary,
  people: Person[],
  includeUpiLinks = true
): string {
  const paidBy = people.find((p) => p.id === receipt.paidById);
  const currency = receipt.currency;

  const lines: string[] = [];
  lines.push(`${receipt.title || 'Group Bill'} (${receipt.date})`);
  lines.push(
    `Total: ${formatMoney(summary.grandTotal, currency)} (Subtotal ${formatMoney(
      summary.itemsTotal,
      currency
    )} + Tax ${formatMoney(summary.tax, currency)}${
      summary.tip > 0 ? ` + Tip ${formatMoney(summary.tip, currency)}` : ''
    }${
      summary.serviceCharge > 0
        ? ` + Service ${formatMoney(summary.serviceCharge, currency)}`
        : ''
    }${
      summary.discount > 0
        ? ` - Discount ${formatMoney(summary.discount, currency)}`
        : ''
    })`
  );

  if (paidBy) {
    lines.push(`Paid by: ${paidBy.name}`);
  }
  lines.push('');

  for (const person of summary.people) {
    if (person.items.length === 0 && person.totalOwed === 0) continue;

    const isPayer = paidBy?.id === person.personId;
    const roleSuffix = isPayer ? ' (Paid)' : '';
    lines.push(
      `${person.name}${roleSuffix}: ${formatMoney(person.totalOwed, currency)}`
    );

    for (const item of person.items) {
      const splitLabel = item.splitCount > 1 ? ` (1/${item.splitCount} split)` : '';
      lines.push(
        `  - ${item.name}${splitLabel}: ${formatMoney(item.shareAmount, currency)}`
      );
    }

    const extras: string[] = [];
    if (person.taxShare > 0) extras.push(`Tax ${formatMoney(person.taxShare, currency)}`);
    if (person.tipShare > 0) extras.push(`Tip ${formatMoney(person.tipShare, currency)}`);
    if (person.serviceChargeShare > 0)
      extras.push(`Service ${formatMoney(person.serviceChargeShare, currency)}`);
    if (person.discountShare > 0)
      extras.push(`Discount -${formatMoney(person.discountShare, currency)}`);
    if (extras.length > 0) {
      lines.push(`  - Proportional: ${extras.join(', ')}`);
    }

    if (includeUpiLinks && receipt.upiId.trim() && !isPayer && person.totalOwed > 0) {
      const upiUri = buildUpiUri({
        upiId: receipt.upiId,
        payeeName: paidBy?.name || 'SnapSplit',
        amount: person.totalOwed,
        currency: receipt.currency,
        note: `${receipt.title} - ${person.name}`,
      });
      lines.push(`  Pay link: ${upiUri}`);
    }
    lines.push('');
  }

  if (summary.unassignedCount > 0) {
    lines.push(
      `Note: ${summary.unassignedCount} item(s) (${formatMoney(
        summary.remainingToAssignTotal,
        currency
      )}) are still unassigned.`
    );
  }

  return lines.join('\n').trim();
}
