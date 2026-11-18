import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCategoryInsights } from './ledgerInsights';
import { INITIAL_SAVED_EXPENSES } from './sampleReceipts';
import type { SavedExpense } from '../types';

test('computeCategoryInsights aggregates category totals, percentages, and averages accurately', () => {
  const result = computeCategoryInsights(INITIAL_SAVED_EXPENSES);

  assert.equal(result.currency, 'USD');
  assert.equal(result.isMultiCurrency, false);
  assert.equal(result.totalBills, 2);
  assert.equal(result.totalAmount, 230.9);
  assert.equal(result.categories.length, 2);

  assert.equal(result.categories[0].category, 'Dining');
  assert.equal(result.categories[0].amount, 146.4);
  assert.equal(result.categories[0].billCount, 1);
  assert.equal(result.categories[0].pct, 63.4);

  assert.equal(result.categories[1].category, 'Groceries');
  assert.equal(result.categories[1].amount, 84.5);
  assert.equal(result.categories[1].billCount, 1);
  assert.equal(result.categories[1].pct, 36.6);
});

test('computeCategoryInsights handles empty list and multi-currency scoping safely', () => {
  const empty = computeCategoryInsights([]);
  assert.equal(empty.totalAmount, 0);
  assert.equal(empty.categories.length, 0);

  const mixed: SavedExpense[] = [
    ...INITIAL_SAVED_EXPENSES,
    {
      ...INITIAL_SAVED_EXPENSES[0],
      id: 'exp-inr',
      currency: 'INR',
      grandTotal: 5000,
    },
  ];
  const scoped = computeCategoryInsights(mixed);
  assert.equal(scoped.currency, 'USD');
  assert.equal(scoped.isMultiCurrency, true);
  assert.equal(scoped.totalBills, 2);
  assert.equal(scoped.totalAmount, 230.9);
});
