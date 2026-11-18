import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { ExpenseCategory, SavedExpense } from '../types';
import {
  CATEGORY_HEX_COLORS,
  computeCategoryInsights,
  type CategoryInsight,
} from '../utils/ledgerInsights';
import { formatMoney } from '../utils/splitMath';

interface CategoryInsightsSectionProps {
  expenses: SavedExpense[];
  activeCategory: 'All' | ExpenseCategory;
  onSelectCategory: (cat: 'All' | ExpenseCategory) => void;
}

export const CategoryInsightsSection: React.FC<CategoryInsightsSectionProps> = ({
  expenses,
  activeCategory,
  onSelectCategory,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<ExpenseCategory | null>(
    null
  );

  const insights = useMemo(() => computeCategoryInsights(expenses), [expenses]);

  const donutGeometry = useMemo(() => {
    const pieGenerator = d3
      .pie<CategoryInsight>()
      .value((d) => d.amount)
      .sort(null)
      .padAngle(insights.categories.length > 1 ? 0.025 : 0);

    const arcGenerator = d3
      .arc<d3.PieArcDatum<CategoryInsight>>()
      .innerRadius(62)
      .outerRadius(96)
      .cornerRadius(3);

    const hoverArcGenerator = d3
      .arc<d3.PieArcDatum<CategoryInsight>>()
      .innerRadius(60)
      .outerRadius(101)
      .cornerRadius(3);

    const arcs = pieGenerator(insights.categories);
    return arcs.map((arcDatum) => ({
      data: arcDatum.data,
      path: arcGenerator(arcDatum) ?? '',
      hoverPath: hoverArcGenerator(arcDatum) ?? '',
      centroid: arcGenerator.centroid(arcDatum),
    }));
  }, [insights.categories]);

  const barScale = useMemo(() => {
    const maxVal = d3.max(insights.categories, (d) => d.amount) ?? 1;
    return d3.scaleLinear().domain([0, maxVal]).range([0, 100]);
  }, [insights.categories]);

  const focusedInsight = useMemo(() => {
    const targetCat =
      hoveredCategory ?? (activeCategory !== 'All' ? activeCategory : null);
    if (!targetCat) return null;
    return insights.categories.find((c) => c.category === targetCat) ?? null;
  }, [hoveredCategory, activeCategory, insights.categories]);

  const handleSliceClick = (cat: ExpenseCategory) => {
    onSelectCategory(activeCategory === cat ? 'All' : cat);
  };

  return (
    <section
      aria-label="Insights"
      data-testid="ledger-insights-section"
      className="bg-[#0f0f0f] border border-white/10 rounded-[2px] p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5]">
            Insights
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5]/50 mt-1">
            Spending distribution by category across saved expenses
            {insights.isMultiCurrency ? ` (${insights.currency} bills)` : ''}
          </p>
        </div>

        {activeCategory !== 'All' && (
          <button
            type="button"
            onClick={() => onSelectCategory('All')}
            className="self-start sm:self-auto px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors cursor-pointer"
          >
            Filtered: {activeCategory} · Clear
          </button>
        )}
      </div>

      {insights.categories.length === 0 ? (
        <div className="py-10 text-center font-mono text-xs text-[#f5f5f5]/50">
          Save one or more bills to view category spending charts here.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: D3 Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-[220px] h-[220px] flex items-center justify-center">
              <svg
                width={220}
                height={220}
                viewBox="-110 -110 220 220"
                role="img"
                aria-label="D3 category spending donut chart"
                data-testid="insights-d3-chart"
                className="overflow-visible pointer-events-none"
              >
                {donutGeometry.map((slice) => {
                  const isActive =
                    hoveredCategory === slice.data.category ||
                    activeCategory === slice.data.category;
                  const isDimmed =
                    (hoveredCategory !== null &&
                      hoveredCategory !== slice.data.category) ||
                    (hoveredCategory === null &&
                      activeCategory !== 'All' &&
                      activeCategory !== slice.data.category);

                  return (
                    <path
                      key={slice.data.category}
                      d={isActive ? slice.hoverPath : slice.path}
                      fill={CATEGORY_HEX_COLORS[slice.data.category]}
                      opacity={isDimmed ? 0.25 : 1}
                      pointerEvents="auto"
                      onMouseEnter={() => setHoveredCategory(slice.data.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => handleSliceClick(slice.data.category)}
                      className="cursor-pointer transition-opacity duration-150"
                    />
                  );
                })}
              </svg>

              {/* Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
                  {focusedInsight ? focusedInsight.category : 'Total Spend'}
                </span>
                <span className="font-mono text-lg font-semibold tabular-nums text-[#f5f5f5] mt-0.5">
                  {formatMoney(
                    focusedInsight ? focusedInsight.amount : insights.totalAmount,
                    insights.currency
                  )}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#f5f5f5]/50">
                  {focusedInsight
                    ? `${focusedInsight.pct}% · ${focusedInsight.billCount} ${
                        focusedInsight.billCount === 1 ? 'bill' : 'bills'
                      }`
                    : `${insights.totalBills} ${
                        insights.totalBills === 1 ? 'bill' : 'bills'
                      }`}
                </span>
              </div>
            </div>
          </div>

          {/* Right: D3 Scaled Horizontal Category Bars */}
          <div className="lg:col-span-7 space-y-2.5">
            {insights.categories.map((cat) => {
              const barPct = barScale(cat.amount);
              const isSelected = activeCategory === cat.category;
              const isHovered = hoveredCategory === cat.category;

              return (
                <button
                  key={cat.category}
                  type="button"
                  onMouseEnter={() => setHoveredCategory(cat.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => handleSliceClick(cat.category)}
                  aria-pressed={isSelected}
                  className={`w-full text-left p-2.5 rounded-[2px] border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 border-[#f5f5f5]'
                      : isHovered
                      ? 'bg-white/[0.04] border-white/15'
                      : 'border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                        style={{ backgroundColor: CATEGORY_HEX_COLORS[cat.category] }}
                      />
                      <span className="font-medium text-[#f5f5f5]">
                        {cat.category}
                      </span>
                      <span aria-hidden="true" className="text-[#f5f5f5]/30">
                        ·
                      </span>
                      <span className="font-mono text-[11px] text-[#f5f5f5]/50 tabular-nums truncate">
                        {cat.billCount} {cat.billCount === 1 ? 'bill' : 'bills'} · Avg{' '}
                        {formatMoney(cat.avgPerBill, insights.currency)}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums">
                      <span className="font-medium text-[#f5f5f5]">
                        {formatMoney(cat.amount, insights.currency)}
                      </span>
                      <span className="text-[#f5f5f5]/55 w-12 text-right">
                        {cat.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* D3 Scale Bar Track */}
                  <div className="mt-2 h-1.5 w-full bg-white/10 rounded-[2px] overflow-hidden">
                    <div
                      className="h-full rounded-[2px] transition-opacity duration-150"
                      style={{
                        width: `${Math.max(barPct, 3)}%`,
                        backgroundColor: CATEGORY_HEX_COLORS[cat.category],
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
