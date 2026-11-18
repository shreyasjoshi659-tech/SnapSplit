import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUpiUri,
  calculateSplitSummary,
  distributeByWeights,
  formatMoney,
  generateShareableSummary,
  splitEvenlyCents,
} from './splitMath';
import { parseReceiptTextFallback } from './receiptParser';
import type { Person, ReceiptData } from '../types';

const people: Person[] = [
  { id: 'p1', name: 'Maya', colorKey: 'teal' },
  { id: 'p2', name: 'Liam', colorKey: 'indigo' },
  { id: 'p3', name: 'Priya', colorKey: 'amber' },
];

test('splitEvenlyCents preserves exact sum across uneven divisions', () => {
  const shares = splitEvenlyCents(1000, 3, 0);
  assert.deepEqual(shares, [334, 333, 333]);
  assert.equal(shares.reduce((a, b) => a + b, 0), 1000);

  const rotated = splitEvenlyCents(1000, 3, 1);
  assert.deepEqual(rotated, [333, 334, 333]);
});

test('distributeByWeights uses Hamilton largest remainder to match exact cents', () => {
  const distributed = distributeByWeights(1000, [100, 200, 300]);
  assert.equal(distributed.reduce((a, b) => a + b, 0), 1000);
  assert.deepEqual(distributed, [167, 333, 500]);
});

test('calculateSplitSummary computes proportional tax, tip, discount and exact grand total', () => {
  const receipt: ReceiptData = {
    title: 'Bistro Test',
    date: '2026-11-16',
    category: 'Dining',
    currency: 'USD',
    paidById: 'p1',
    upiId: '',
    tax: 9.0,
    tip: 18.0,
    serviceCharge: 0,
    discount: 9.0,
    items: [
      {
        id: 'i1',
        name: 'Shared Flatbread',
        quantity: 1,
        unitPrice: 18,
        totalPrice: 18,
        assignedTo: ['p1', 'p2', 'p3'],
      },
      {
        id: 'i2',
        name: 'Steak Frites',
        quantity: 1,
        unitPrice: 42,
        totalPrice: 42,
        assignedTo: ['p2'],
      },
      {
        id: 'i3',
        name: 'Wild Mushroom Pasta',
        quantity: 1,
        unitPrice: 30,
        totalPrice: 30,
        assignedTo: ['p3'],
      },
    ],
  };

  const summary = calculateSplitSummary(receipt, people);

  // Items total = 90, +9 tax +18 tip -9 discount = 108 grand total
  assert.equal(summary.itemsTotal, 90);
  assert.equal(summary.grandTotal, 108);
  assert.equal(summary.unassignedCount, 0);

  const sumPeopleTotals =
    Math.round(summary.people.reduce((acc, p) => acc + p.totalOwed, 0) * 100) / 100;
  assert.equal(sumPeopleTotals, 108);

  // Maya has $6/90 -> $0.60 tax, $1.20 tip, -$0.60 discount = $7.20
  assert.equal(summary.people[0].itemsSubtotal, 6);
  assert.equal(summary.people[0].taxShare, 0.6);
  assert.equal(summary.people[0].tipShare, 1.2);
  assert.equal(summary.people[0].discountShare, 0.6);
  assert.equal(summary.people[0].totalOwed, 7.2);

  // Liam has $6 + $42 = $48/90 -> $4.80 tax, $9.60 tip, -$4.80 discount = $57.60
  assert.equal(summary.people[1].itemsSubtotal, 48);
  assert.equal(summary.people[1].totalOwed, 57.6);
});

test('calculateSplitSummary tracks unassigned items separately without inflating assigned tax', () => {
  const receipt: ReceiptData = {
    title: 'Partial Split',
    date: '2026-11-16',
    category: 'Dining',
    currency: 'USD',
    paidById: 'p1',
    upiId: '',
    tax: 10,
    tip: 0,
    serviceCharge: 0,
    discount: 0,
    items: [
      {
        id: 'i1',
        name: 'Bowl',
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
        assignedTo: ['p1'],
      },
      {
        id: 'i2',
        name: 'Dessert',
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
        assignedTo: [],
      },
    ],
  };

  const summary = calculateSplitSummary(receipt, people);
  assert.equal(summary.unassignedCount, 1);
  assert.equal(summary.unassignedSubtotal, 50);
  assert.equal(summary.people[0].itemsSubtotal, 50);
  assert.equal(summary.people[0].taxShare, 5);
  assert.equal(summary.people[0].totalOwed, 55);
  assert.equal(summary.remainingToAssignTotal, 55);
});

test('parseReceiptTextFallback extracts quantities, items, tax, tip, service charge, and discount', () => {
  const raw = `TRATTORIA VERDE
2x Margherita Pizza $36.00
1x Burrata $18.50
Promo Discount -$5.00
Sales Tax $4.40
Service Charge $3.00
Tip $9.00
Subtotal $54.50
Total $65.90`;

  const parsed = parseReceiptTextFallback(raw);
  assert.equal(parsed.title, 'TRATTORIA VERDE');
  assert.equal(parsed.currency, 'USD');
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].name, 'Margherita Pizza');
  assert.equal(parsed.items[0].quantity, 2);
  assert.equal(parsed.items[0].totalPrice, 36);
  assert.equal(parsed.items[0].unitPrice, 18);
  assert.equal(parsed.discount, 5);
  assert.equal(parsed.tax, 4.4);
  assert.equal(parsed.serviceCharge, 3);
  assert.equal(parsed.tip, 9);
});

test('buildUpiUri and generateShareableSummary format currency and payment links cleanly', () => {
  const uri = buildUpiUri({
    upiId: 'maya@okaxis',
    payeeName: 'Maya',
    amount: 425.5,
    currency: 'INR',
    note: 'Dinner',
  });
  assert.ok(uri.startsWith('upi://pay?'));
  assert.ok(uri.includes('pa=maya%40okaxis'));
  assert.ok(uri.includes('am=425.50'));
  assert.ok(uri.includes('cu=INR'));

  assert.equal(formatMoney(-12.5, 'USD'), '-$12.50');
  assert.equal(formatMoney(1250, 'INR'), '₹1,250.00');

  const receipt: ReceiptData = {
    title: 'Bombay Lunch',
    date: '2026-11-16',
    category: 'Dining',
    currency: 'INR',
    paidById: 'p1',
    upiId: 'maya@okaxis',
    tax: 25,
    tip: 0,
    serviceCharge: 0,
    discount: 0,
    items: [
      {
        id: 'i1',
        name: 'Thali',
        quantity: 2,
        unitPrice: 250,
        totalPrice: 500,
        assignedTo: ['p1', 'p2'],
      },
    ],
  };

  const summary = calculateSplitSummary(receipt, people.slice(0, 2));
  const text = generateShareableSummary(receipt, summary, people.slice(0, 2), true);
  assert.ok(text.includes('Bombay Lunch (2026-11-16)'));
  assert.ok(text.includes('Maya (Paid): ₹262.50'));
  assert.ok(text.includes('Liam: ₹262.50'));
  assert.ok(text.includes('upi://pay?'));
});
