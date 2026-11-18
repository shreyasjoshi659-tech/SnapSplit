import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  QrCode,
} from 'lucide-react';
import type { Person, PersonBreakdown, ReceiptData, SplitSummary } from '../types';
import { formatMoney } from '../utils/splitMath';
import { PERSON_COLOR_STYLES } from '../utils/colors';

interface SummaryPanelProps {
  receipt: ReceiptData;
  people: Person[];
  summary: SplitSummary;
  onOpenUpiQr: (person: PersonBreakdown) => void;
  onSaveToLedger: () => void;
  justSavedToLedger: boolean;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  receipt,
  people,
  summary,
  onOpenUpiQr,
}) => {
  const [expandedPersonIds, setExpandedPersonIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const paidByPerson = people.find((p) => p.id === receipt.paidById);

  return (
    <section
      aria-label="Per-person breakdown and shareable summary"
      className="bg-[#0f0f0f] flex flex-col lg:h-full lg:overflow-hidden"
    >
      {/* Pane Header */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0 flex items-center justify-between gap-2">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5]">
          Calculation
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
          Proportional Split
        </span>
      </div>

      {/* Scrollable Pane Content */}
      <div className="p-6 space-y-6 lg:overflow-y-auto lg:flex-1">
        {/* Grand Total Header */}
        <div className="space-y-4 pb-5 border-b border-white/10">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
              Total Amount
            </span>
            <span
              data-testid="grand-total-amount"
              className="block font-mono text-3xl font-semibold tracking-[-0.05em] tabular-nums text-[#f5f5f5] mt-1.5"
            >
              {formatMoney(summary.grandTotal, receipt.currency)}
            </span>
          </div>

          {/* Receipt Tally Strip */}
          <dl className="grid grid-cols-4 gap-2 pt-3 border-t border-white/10 text-xs">
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#f5f5f5]/45">
                Subtotal
              </dt>
              <dd className="font-mono font-medium tabular-nums text-[#f5f5f5] mt-0.5">
                {formatMoney(summary.itemsTotal, receipt.currency)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#f5f5f5]/45">
                Tax
              </dt>
              <dd className="font-mono font-medium tabular-nums text-[#f5f5f5] mt-0.5">
                {formatMoney(summary.tax, receipt.currency)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#f5f5f5]/45">
                Tip/Svc
              </dt>
              <dd className="font-mono font-medium tabular-nums text-[#f5f5f5] mt-0.5">
                {formatMoney(summary.tip + summary.serviceCharge, receipt.currency)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#f5f5f5]/45">
                Disc
              </dt>
              <dd className="font-mono font-medium tabular-nums text-[#f5f5f5]/75 mt-0.5">
                -{formatMoney(summary.discount, receipt.currency)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Per-Person Shares List */}
        <ul className="divide-y divide-white/10" data-testid="person-breakdown-list">
          {summary.people.map((person) => {
            const isExpanded = expandedPersonIds.includes(person.personId);
            const isPayer = paidByPerson?.id === person.personId;
            const styles = PERSON_COLOR_STYLES[person.colorKey];

            return (
              <li key={person.personId} className="py-3.5 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`w-6 h-6 rounded-[2px] flex items-center justify-center font-mono text-[10px] font-semibold shrink-0 ${styles.avatar}`}
                    >
                      {person.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-[#f5f5f5] truncate">
                          {person.name}
                        </span>
                        {isPayer && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#f5f5f5]/60">
                            · Paid
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-[#f5f5f5]/50 tabular-nums leading-relaxed">
                        Items {formatMoney(person.itemsSubtotal, receipt.currency)}
                        {person.taxShare > 0
                          ? ` · Tax ${formatMoney(person.taxShare, receipt.currency)}`
                          : ''}
                        {person.tipShare + person.serviceChargeShare > 0
                          ? ` · Tip ${formatMoney(
                              person.tipShare + person.serviceChargeShare,
                              receipt.currency
                            )}`
                          : ''}
                        {person.discountShare > 0
                          ? ` · Disc -${formatMoney(
                              person.discountShare,
                              receipt.currency
                            )}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      data-testid={`person-total-${person.personId}`}
                      className="font-mono text-sm font-medium tabular-nums text-[#f5f5f5] mr-1"
                    >
                      {formatMoney(person.totalOwed, receipt.currency)}
                    </span>

                    {person.totalOwed > 0 && !isPayer && (
                      <button
                        type="button"
                        onClick={() => onOpenUpiQr(person)}
                        aria-label={`Open UPI QR payment for ${person.name}`}
                        title="Generate UPI Payment QR"
                        className="min-h-[30px] min-w-[30px] flex items-center justify-center text-[#f5f5f5]/65 hover:text-[#0a0a0a] hover:bg-[#f5f5f5] border border-white/15 rounded-[2px] transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {person.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(person.personId)}
                        aria-expanded={isExpanded}
                        aria-label={`Toggle item details for ${person.name}`}
                        className="min-h-[30px] min-w-[30px] flex items-center justify-center text-[#f5f5f5]/50 hover:text-[#f5f5f5] hover:bg-white/10 rounded-[2px] transition-colors cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && person.items.length > 0 && (
                  <ul className="mt-2.5 pl-8.5 space-y-1 text-xs text-[#f5f5f5]/60">
                    {person.items.map((item) => (
                      <li
                        key={`${person.personId}-${item.itemId}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {item.name}
                          {item.splitCount > 1 ? (
                            <span className="text-[#f5f5f5]/40">
                              {' '}
                              (1/{item.splitCount})
                            </span>
                          ) : null}
                        </span>
                        <span className="font-mono tabular-nums text-[#f5f5f5]/85 shrink-0">
                          {formatMoney(item.shareAmount, receipt.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
