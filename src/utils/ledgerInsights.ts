import type { CurrencyCode, ExpenseCategory, SavedExpense } from '../types';

export interface CategoryInsight {
  category: ExpenseCategory;
  amount: number;
  billCount: number;
  pct: number;
  avgPerBill: number;
}

export interface CategoryInsightsSummary {
  currency: CurrencyCode;
  isMultiCurrency: boolean;
  totalAmount: number;
  totalBills: number;
  categories: CategoryInsight[];
}

export const CATEGORY_HEX_COLORS: Record<ExpenseCategory, string> = {
  Dining: '#F5F5F5', // primary crisp white
  Groceries: '#A3A3A3', // neutral-400
  Drinks: '#737373', // neutral-500
  Travel: '#D4D4D4', // neutral-300
  Utilities: '#525252', // neutral-600
  Other: '#404040', // neutral-700
};

export function computeCategoryInsights(
  expenses: SavedExpense[]
): CategoryInsightsSummary {
  const currency: CurrencyCode = expenses[0]?.currency ?? 'USD';
  const distinctCurrencies = new Set(expenses.map((e) => e.currency));
  const isMultiCurrency = distinctCurrencies.size > 1;
  const scoped = expenses.filter((e) => e.currency === currency);

  const grouped = new Map<ExpenseCategory, { amount: number; count: number }>();
  let totalCents = 0;

  for (const exp of scoped) {
    const cents = Math.round(exp.grandTotal * 100);
    totalCents += cents;
    const prev = grouped.get(exp.category) ?? { amount: 0, count: 0 };
    grouped.set(exp.category, {
      amount: prev.amount + cents,
      count: prev.count + 1,
    });
  }

  const totalAmount = Math.round(totalCents) / 100;

  const categories: CategoryInsight[] = Array.from(grouped.entries())
    .map(([category, data]) => {
      const amount = Math.round(data.amount) / 100;
      const pct =
        totalCents > 0 ? Math.round((data.amount / totalCents) * 1000) / 10 : 0;
      const avgPerBill =
        data.count > 0 ? Math.round(data.amount / data.count) / 100 : 0;
      return {
        category,
        amount,
        billCount: data.count,
        pct,
        avgPerBill,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));

  return {
    currency,
    isMultiCurrency,
    totalAmount,
    totalBills: scoped.length,
    categories,
  };
}
