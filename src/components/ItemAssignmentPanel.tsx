import React, { useState } from 'react';
import { AlertCircle, Check, Plus, Trash2, Users } from 'lucide-react';
import type { CurrencyCode, Person, ReceiptItem, SplitSummary } from '../types';
import { CURRENCY_META, formatMoney } from '../utils/splitMath';
import { PERSON_COLOR_STYLES } from '../utils/colors';

interface ItemAssignmentPanelProps {
  items: ReceiptItem[];
  currency: CurrencyCode;
  people: Person[];
  summary: SplitSummary;
  isParsing: boolean;
  onTogglePersonOnItem: (itemId: string, personId: string) => void;
  onAssignAllToItem: (itemId: string) => void;
  onAddItem: (name: string, quantity: number, totalPrice: number) => void;
  onUpdateItem: (itemId: string, patch: Partial<ReceiptItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onSplitUnassignedEvenly: () => void;
  onLoadDefaultSample: () => void;
}

export const ItemAssignmentPanel: React.FC<ItemAssignmentPanelProps> = ({
  items,
  currency,
  people,
  summary,
  isParsing,
  onTogglePersonOnItem,
  onAssignAllToItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSplitUnassignedEvenly,
  onLoadDefaultSample,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceText, setEditingPriceText] = useState<string>('');
  const currencySymbol = CURRENCY_META[currency]?.symbol ?? '$';

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newItemName.trim();
    const qty = Math.max(1, parseInt(newItemQty, 10) || 1);
    const price = parseFloat(newItemPrice);
    if (!cleanName || !Number.isFinite(price)) return;
    onAddItem(cleanName, qty, Math.round(price * 100) / 100);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setShowAddForm(false);
  };

  return (
    <section
      aria-label="Line items and person assignment"
      className="bg-[#0a0a0a] flex flex-col lg:h-full lg:overflow-hidden"
    >
      {/* Pane Header */}
      <div className="px-6 py-4 border-b border-white/10 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xs font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5]">
            Assign Items
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f5f5f5]/50 tabular-nums">
            {items.length} items · {formatMoney(summary.itemsTotal, currency)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="h-8 px-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f5f5f5] bg-transparent border border-[#f5f5f5] rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Add Manual Item Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="px-6 py-4 bg-[#0f0f0f] border-b border-white/10 space-y-2.5 shrink-0"
        >
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <label htmlFor="new-item-name" className="sr-only">
                Item name
              </label>
              <input
                id="new-item-name"
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name (e.g. Garlic Naan)"
                required
                className="w-full h-9 px-2.5 text-xs text-[#f5f5f5] bg-[#0a0a0a] border border-white/15 rounded-[2px] focus:outline-none focus:border-[#f5f5f5] placeholder:text-[#f5f5f5]/35"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="new-item-qty" className="sr-only">
                Quantity
              </label>
              <input
                id="new-item-qty"
                type="number"
                min="1"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                placeholder="Qty"
                className="w-full h-9 px-2 text-xs font-mono tabular-nums text-[#f5f5f5] bg-[#0a0a0a] border border-white/15 rounded-[2px] focus:outline-none focus:border-[#f5f5f5]"
              />
            </div>
            <div className="col-span-4">
              <label htmlFor="new-item-price" className="sr-only">
                Total price
              </label>
              <input
                id="new-item-price"
                type="number"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="Price (0.00)"
                required
                className="w-full h-9 px-2.5 text-xs font-mono tabular-nums text-[#f5f5f5] bg-[#0a0a0a] border border-white/15 rounded-[2px] focus:outline-none focus:border-[#f5f5f5] placeholder:text-[#f5f5f5]/35"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f5f5f5]/55 hover:text-[#f5f5f5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors cursor-pointer"
            >
              Save Item
            </button>
          </div>
        </form>
      )}

      {/* Unassigned Alert Banner */}
      {!isParsing && summary.unassignedCount > 0 && (
        <div
          role="status"
          className="px-6 py-2.5 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-2 text-xs text-[#f5f5f5]/85">
            <AlertCircle className="w-3.5 h-3.5 text-[#f5f5f5] shrink-0" />
            <span className="font-mono text-[11px] tabular-nums">
              <strong>{summary.unassignedCount}</strong> unassigned (
              {formatMoney(summary.unassignedSubtotal, currency)} pre-tax)
            </span>
          </div>
          <button
            type="button"
            onClick={onSplitUnassignedEvenly}
            className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f5f5f5] bg-transparent border border-white/30 rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#f5f5f5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Split Unassigned Evenly
          </button>
        </div>
      )}

      {/* Scrollable Pane Content */}
      <div className="lg:overflow-y-auto lg:flex-1">
        {/* Loading Skeleton */}
        {isParsing ? (
          <div className="divide-y divide-white/10" aria-busy="true">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="px-6 py-4 space-y-3 animate-pulse">
                <div className="flex items-center justify-between gap-4">
                  <div className="h-4 w-44 bg-white/10 rounded-[2px]" />
                  <div className="h-4 w-16 bg-white/10 rounded-[2px]" />
                </div>
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-white/5 rounded-full" />
                  <div className="h-7 w-16 bg-white/5 rounded-full" />
                  <div className="h-7 w-16 bg-white/5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="px-6 py-16 text-center space-y-3">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.06em] text-[#f5f5f5]">
              No receipt items loaded
            </p>
            <p className="text-xs text-[#f5f5f5]/50 max-w-xs mx-auto leading-relaxed">
              Paste raw receipt text, upload a photo on the left, or load a sample bill
              to start assigning items.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onLoadDefaultSample}
                className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors cursor-pointer"
              >
                Load Sample Bill
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f5f5f5] bg-transparent border border-white/25 rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#f5f5f5] transition-colors cursor-pointer"
              >
                Add Item Manually
              </button>
            </div>
          </div>
        ) : (
          /* Line Items List */
          <ul className="divide-y divide-white/10" data-testid="line-items-list">
            {items.map((item) => {
              const validAssignees = item.assignedTo.filter((id) =>
                people.some((p) => p.id === id)
              );
              const allAssigned =
                people.length > 0 && validAssignees.length === people.length;
              const splitShare =
                validAssignees.length > 0
                  ? item.totalPrice / validAssignees.length
                  : 0;
              const isUnassigned = validAssignees.length === 0;

              return (
                <li
                  key={item.id}
                  className={`px-6 py-4 transition-colors ${
                    isUnassigned
                      ? 'bg-white/[0.03]'
                      : 'hover:bg-white/[0.015]'
                  }`}
                >
                  {isUnassigned && (
                    <div className="mb-2">
                      <span className="inline-block px-1.5 py-0.5 bg-white/10 font-mono text-[9px] uppercase tracking-[0.08em] text-[#f5f5f5]/75 rounded-[2px]">
                        Unassigned
                      </span>
                    </div>
                  )}

                  {/* Row Top: Item Name & Price */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 flex items-baseline gap-2">
                      <span className="text-xs font-mono tabular-nums text-[#f5f5f5]/45 shrink-0">
                        {item.quantity}x
                      </span>
                      <input
                        type="text"
                        aria-label={`Item name for ${item.name}`}
                        value={item.name}
                        onChange={(e) =>
                          onUpdateItem(item.id, { name: e.target.value })
                        }
                        className="w-full min-w-0 text-sm font-bold text-[#f5f5f5] bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#f5f5f5] focus:outline-none truncate"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-mono text-[#f5f5f5]/45">
                        {currencySymbol}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Price for ${item.name}`}
                        value={
                          editingPriceId === item.id
                            ? editingPriceText
                            : item.totalPrice.toFixed(2)
                        }
                        onFocus={() => {
                          setEditingPriceId(item.id);
                          setEditingPriceText(item.totalPrice.toFixed(2));
                        }}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setEditingPriceText(raw);
                          const val = parseFloat(raw);
                          if (Number.isFinite(val)) {
                            onUpdateItem(item.id, {
                              totalPrice: Math.round(val * 100) / 100,
                            });
                          }
                        }}
                        onBlur={() => {
                          setEditingPriceId(null);
                        }}
                        className="w-24 h-[28px] text-right text-[20px] leading-none font-mono font-bold tabular-nums text-[#f5f5f5] bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#f5f5f5] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row Bottom: Tap-to-assign Friend Tags (Variation 7 .tag pill toggles) */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {people.map((person) => {
                      const isAssigned = validAssignees.includes(person.id);
                      const styles = PERSON_COLOR_STYLES[person.colorKey];
                      return (
                        <button
                          key={person.id}
                          type="button"
                          aria-pressed={isAssigned}
                          aria-label={`Assign ${item.name} to ${person.name}`}
                          onClick={() => onTogglePersonOnItem(item.id, person.id)}
                          className={`min-h-[30px] px-3 py-0.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] border rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                            isAssigned ? styles.activeBtn : styles.inactiveBtn
                          }`}
                        >
                          {isAssigned && <Check className="w-2.5 h-2.5 shrink-0" />}
                          <span>{person.name}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => onAssignAllToItem(item.id)}
                      aria-label={`Split ${item.name} among all`}
                      className={`min-h-[30px] px-3 py-0.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.06em] border rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                        allAssigned
                          ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]'
                          : 'bg-transparent text-[#f5f5f5]/50 border-white/12 hover:text-[#f5f5f5] hover:border-white/45'
                      }`}
                    >
                      <Users className="w-2.5 h-2.5" />
                      <span>All</span>
                    </button>
                  </div>

                  {/* Split Summary Line + Bottom-Right Delete Button */}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#f5f5f5]/45 tabular-nums">
                      {isUnassigned ? (
                        <span className="text-[#f5f5f5]/65">
                          Tap names above to assign
                        </span>
                      ) : validAssignees.length === 1 ? (
                        <span>
                          Solo item · {formatMoney(item.totalPrice, currency)}
                        </span>
                      ) : (
                        <span>
                          Split {validAssignees.length} ways ·{' '}
                          {formatMoney(splitShare, currency)} each
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      aria-label={`Delete ${item.name}`}
                      className="p-1.5 text-[#f5f5f5]/50 hover:text-[#f5f5f5] rounded-[2px] hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
