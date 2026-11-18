import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Circle, Search, Trash2 } from 'lucide-react';
import type { ExpenseCategory, SavedExpense } from '../types';
import { formatMoney } from '../utils/splitMath';
import { CategoryInsightsSection } from './CategoryInsightsSection';

interface ExpenseLedgerViewProps {
  expenses: SavedExpense[];
  onToggleSettlement: (expenseId: string, personId: string) => void;
  onReopenExpense: (expense: SavedExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onStartNewSplit: () => void;
}

const FILTER_CATEGORIES: Array<'All' | ExpenseCategory> = [
  'All',
  'Dining',
  'Groceries',
  'Drinks',
  'Travel',
  'Utilities',
  'Other',
];

export const ExpenseLedgerView: React.FC<ExpenseLedgerViewProps> = ({
  expenses,
  onToggleSettlement,
  onReopenExpense,
  onDeleteExpense,
  onStartNewSplit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | ExpenseCategory>(
    'All'
  );

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expenses.filter((exp) => {
      if (activeCategory !== 'All' && exp.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const matchTitle = exp.title.toLowerCase().includes(q);
      const matchPayer = exp.paidByName.toLowerCase().includes(q);
      const matchMember = exp.settlements.some((s) =>
        s.name.toLowerCase().includes(q)
      );
      return matchTitle || matchPayer || matchMember;
    });
  }, [expenses, searchQuery, activeCategory]);

  // Aggregate stats across primary currency or grouped cleanly
  const stats = useMemo(() => {
    const primaryCurrency = expenses[0]?.currency ?? 'USD';
    const currencies = new Set(expenses.map((e) => e.currency));
    const isMultiCurrency = currencies.size > 1;
    const scopedExpenses = expenses.filter((e) => e.currency === primaryCurrency);

    let totalTracked = 0;
    let settledAmount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;

    const categoryTotals = new Map<ExpenseCategory, number>();

    for (const exp of scopedExpenses) {
      totalTracked += exp.grandTotal;
      categoryTotals.set(
        exp.category,
        (categoryTotals.get(exp.category) ?? 0) + exp.grandTotal
      );
      for (const s of exp.settlements) {
        if (s.settled) {
          settledAmount += s.amount;
        } else {
          pendingAmount += s.amount;
          pendingCount += 1;
        }
      }
    }

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        pct: totalTracked > 0 ? Math.round((amount / totalTracked) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      primaryCurrency,
      isMultiCurrency,
      totalTracked,
      settledAmount,
      pendingAmount,
      pendingCount,
      categoryBreakdown,
    };
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Hairline KPI Strip */}
      <section
        aria-label="Expense ledger summary metrics"
        className="grid grid-cols-2 lg:grid-cols-4 bg-[#0a0a0a] border border-white/10 rounded-[2px] divide-y lg:divide-y-0 lg:divide-x divide-white/10"
      >
        <div className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
            Total Tracked {stats.isMultiCurrency ? `(${stats.primaryCurrency})` : ''}
          </p>
          <p
            data-testid="ledger-total-tracked"
            className="font-mono text-2xl font-semibold tracking-[-0.03em] tabular-nums text-[#f5f5f5] mt-1.5"
          >
            {formatMoney(stats.totalTracked, stats.primaryCurrency)}
          </p>
        </div>

        <div className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
            Bills Logged
          </p>
          <p
            data-testid="ledger-bills-count"
            className="font-mono text-2xl font-semibold tracking-[-0.03em] tabular-nums text-[#f5f5f5] mt-1.5"
          >
            {expenses.length}
          </p>
        </div>

        <div className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
            Settled Shares
          </p>
          <p
            data-testid="ledger-settled-amount"
            className="font-mono text-2xl font-semibold tracking-[-0.03em] tabular-nums text-[#f5f5f5] mt-1.5"
          >
            {formatMoney(stats.settledAmount, stats.primaryCurrency)}
          </p>
        </div>

        <div className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
            Pending Collection ({stats.pendingCount})
          </p>
          <p
            data-testid="ledger-pending-amount"
            className="font-mono text-2xl font-semibold tracking-[-0.03em] tabular-nums text-[#f5f5f5]/75 mt-1.5"
          >
            {formatMoney(stats.pendingAmount, stats.primaryCurrency)}
          </p>
        </div>
      </section>

      {/* D3 Category Spending Insights */}
      <CategoryInsightsSection
        expenses={expenses}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
      />

      {/* Search, Filter & Ledger Table */}
      <section
        aria-label="Saved group expenses"
        className="bg-[#0a0a0a] border border-white/10 rounded-[2px]"
      >
        <div className="p-4 sm:px-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Category Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#0f0f0f] border border-white/10 rounded-[2px] overflow-x-auto">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] rounded-[2px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[#f5f5f5] text-[#0a0a0a] font-medium'
                    : 'text-[#f5f5f5]/55 hover:text-[#f5f5f5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-[#f5f5f5]/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="ledger-search" className="sr-only">
              Search saved expenses
            </label>
            <input
              id="ledger-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant or friend..."
              className="w-full h-9 pl-8 pr-3 text-xs text-[#f5f5f5] placeholder:text-[#f5f5f5]/35 bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5]"
            />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.06em] text-[#f5f5f5]">
              {expenses.length === 0
                ? 'No saved bills in your expense ledger yet'
                : 'No matching bills found'}
            </p>
            <p className="text-xs text-[#f5f5f5]/50 max-w-sm mx-auto">
              {expenses.length === 0
                ? 'Split a receipt in the Bill Splitter and click Save to Ledger to track settlements over time.'
                : 'Try clearing your search query or selecting All categories.'}
            </p>
            <div className="pt-2">
              {expenses.length === 0 ? (
                <button
                  type="button"
                  onClick={onStartNewSplit}
                  className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors cursor-pointer"
                >
                  Split a Bill
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('All');
                  }}
                  className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5] bg-transparent border border-[#f5f5f5] rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10" data-testid="ledger-expense-list">
            {filteredExpenses.map((exp) => {
              const allSettled = exp.settlements.every((s) => s.settled);
              return (
                <div
                  key={exp.id}
                  className="p-5 sm:px-6 hover:bg-white/[0.02] transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5] truncate">
                          {exp.title}
                        </h3>
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                            allSettled ? 'text-[#f5f5f5]' : 'text-[#f5f5f5]/55'
                          }`}
                        >
                          · {allSettled ? 'Settled' : 'Pending'}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-[#f5f5f5]/50 mt-0.5">
                        {exp.date} · {exp.category} · Paid by {exp.paidByName}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-base font-semibold tabular-nums text-[#f5f5f5]">
                        {formatMoney(exp.grandTotal, exp.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onReopenExpense(exp)}
                        className="h-8 px-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f5f5f5] bg-transparent border border-white/25 rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#f5f5f5] transition-colors cursor-pointer"
                      >
                        <span>Reopen</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteExpense(exp.id)}
                        aria-label={`Delete ${exp.title} from ledger`}
                        className="p-1.5 text-[#f5f5f5]/45 hover:text-[#f5f5f5] rounded-[2px] hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Settlement Toggles */}
                  <div className="flex flex-wrap items-center gap-2">
                    {exp.settlements.map((entry) => (
                      <button
                        key={`${exp.id}-${entry.personId}`}
                        type="button"
                        aria-pressed={entry.settled}
                        onClick={() => onToggleSettlement(exp.id, entry.personId)}
                        className={`min-h-[34px] px-3 py-1 inline-flex items-center gap-2 text-xs font-medium border rounded-[2px] transition-colors cursor-pointer ${
                          entry.settled
                            ? 'bg-white/12 text-[#f5f5f5] border-[#f5f5f5] hover:bg-white/20'
                            : 'bg-transparent text-[#f5f5f5]/60 border-white/15 hover:border-[#f5f5f5] hover:text-[#f5f5f5]'
                        }`}
                      >
                        {entry.settled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#f5f5f5] shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-[#f5f5f5]/45 shrink-0" />
                        )}
                        <span>{entry.name}</span>
                        <span className="font-mono tabular-nums">
                          {formatMoney(entry.amount, exp.currency)}
                        </span>
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.08em] ${
                            entry.settled ? 'text-[#f5f5f5]' : 'text-[#f5f5f5]/45'
                          }`}
                        >
                          {entry.settled ? 'Paid' : 'Mark paid'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
