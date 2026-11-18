import React, { useRef, useState } from 'react';
import {
  ImagePlus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import type { Person, ReceiptData } from '../types';
import { CURRENCY_META } from '../utils/splitMath';
import type { SampleReceiptPreset } from '../utils/sampleReceipts';

const AVATAR_COLOR_MAP: Record<Person['colorKey'], string> = {
  teal: 'bg-teal-400 text-[#0a0a0a]',
  indigo: 'bg-indigo-400 text-[#0a0a0a]',
  amber: 'bg-amber-400 text-[#0a0a0a]',
  rose: 'bg-rose-400 text-[#0a0a0a]',
  sky: 'bg-sky-400 text-[#0a0a0a]',
  violet: 'bg-violet-400 text-[#0a0a0a]',
};

interface ReceiptInputPanelProps {
  rawText: string;
  onRawTextChange: (val: string) => void;
  imagePreviewUrl: string | null;
  onImageSelect: (dataUrl: string, mimeType: string, fileName: string) => void;
  onImageClear: () => void;
  onParseWithAi: () => void;
  onQuickTextParse: () => void;
  isParsing: boolean;
  parseError: string | null;
  parseNotice: string | null;
  onSelectSample: (preset: SampleReceiptPreset) => void;
  people: Person[];
  onAddPerson: (name: string) => void;
  onRemovePerson: (id: string) => void;
  receipt: ReceiptData;
  onUpdateReceiptMeta: (patch: Partial<ReceiptData>) => void;
  itemsSubtotal: number;
}

export const ReceiptInputPanel: React.FC<ReceiptInputPanelProps> = ({
  rawText,
  onRawTextChange,
  imagePreviewUrl,
  onImageSelect,
  onImageClear,
  people,
  onAddPerson,
  onRemovePerson,
  receipt,
  onUpdateReceiptMeta,
  itemsSubtotal,
}) => {
  const [newFriendName, setNewFriendName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImageSelect(reader.result, file.type || 'image/jpeg', file.name);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    onAddPerson(trimmed);
    setNewFriendName('');
  };

  const applyTipPercent = (pct: number) => {
    const calculated = Math.round(itemsSubtotal * (pct / 100) * 100) / 100;
    onUpdateReceiptMeta({ tip: calculated });
  };

  const currencySymbol = CURRENCY_META[receipt.currency]?.symbol ?? '$';

  return (
    <section
      aria-label="Receipt input and group settings"
      className="bg-[#0a0a0a] flex flex-col lg:h-full lg:overflow-hidden"
    >
      {/* Scrollable Pane Content */}
      <div className="p-6 space-y-6 lg:overflow-y-auto lg:flex-1">
        {/* Receipt Source & Parsing */}
        <div className="space-y-4">
          {/* Image Upload Dropzone / Preview */}
          <div>
            <label
              htmlFor="raw-receipt-input"
              className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50 mb-2"
            >
              Paste raw receipt text
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
              id="receipt-image-upload"
            />
            {imagePreviewUrl ? (
              <div className="relative flex items-center gap-3 p-2.5 bg-white/[0.02] border border-white/10 rounded-[2px]">
                <img
                  src={imagePreviewUrl}
                  alt="Uploaded receipt preview"
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 object-cover rounded-[2px] border border-white/15 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#f5f5f5] truncate">
                    Receipt photo attached
                  </p>
                  <p className="text-[11px] text-[#f5f5f5]/50">
                    Ready for AI extraction
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onImageClear}
                  aria-label="Remove uploaded receipt image"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#f5f5f5]/55 hover:text-[#f5f5f5] rounded-[2px] hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-9 px-3 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5]/70 bg-transparent border border-dashed border-white/15 rounded-[2px] hover:border-[#f5f5f5] hover:text-[#f5f5f5] transition-colors cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Upload Receipt Image</span>
              </button>
            )}
          </div>

          {/* Raw Receipt Textarea */}
          <div>
            <textarea
              id="raw-receipt-input"
              rows={5}
              value={rawText}
              onChange={(e) => onRawTextChange(e.target.value)}
              placeholder={`Paste receipt items here, e.g.\n2x Margherita Pizza $36.00\nBurrata Salad $18.50\nTax $4.40\nTip $9.00`}
              className="w-full px-3 py-2 text-xs font-mono text-[#f5f5f5] bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5] resize-y placeholder:text-[#f5f5f5]/30"
            />
          </div>
        </div>

        <hr className="border-white/10" />

        {/* 02. Group Members */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {people.map((person) => {
              const avatarClass =
                AVATAR_COLOR_MAP[person.colorKey] ?? 'bg-teal-400 text-[#0a0a0a]';
              return (
                <div
                  key={person.id}
                  className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 bg-white/[0.06] border border-white/20 rounded-full"
                >
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] font-semibold ${avatarClass}`}
                  >
                    {person.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-medium text-[#f5f5f5]">
                    {person.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemovePerson(person.id)}
                    disabled={people.length <= 2}
                    aria-label={`Remove ${person.name}`}
                    title={
                      people.length <= 2
                        ? 'Keep at least 2 people to split a bill'
                        : `Remove ${person.name}`
                    }
                    className="p-0.5 text-[#f5f5f5]/45 hover:text-[#f5f5f5] disabled:opacity-25 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddFriendSubmit} className="flex items-center gap-2">
            <label htmlFor="add-friend-input" className="sr-only">
              Add friend name
            </label>
            <input
              id="add-friend-input"
              type="text"
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              placeholder="Add friend (e.g. Elena)"
              maxLength={24}
              disabled={people.length >= 6}
              className="flex-1 min-w-0 h-9 px-3 text-xs text-[#f5f5f5] bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5] disabled:opacity-40 placeholder:text-[#f5f5f5]/35"
            />
            <button
              type="submit"
              disabled={!newFriendName.trim() || people.length >= 6}
              className="h-9 px-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f5f5f5] bg-transparent border border-[#f5f5f5] rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#f5f5f5] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {people.length >= 6 ? (
                <span>Max 6</span>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </form>
        </div>

        <hr className="border-white/10" />

        {/* 03. Adjustments */}
        <div className="space-y-3.5">
          {/* Tax, Tip, Service, Discount */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="charge-tax"
                className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50 mb-1"
              >
                Tax ({currencySymbol})
              </label>
              <input
                id="charge-tax"
                type="number"
                min="0"
                step="0.01"
                value={receipt.tax}
                onChange={(e) =>
                  onUpdateReceiptMeta({
                    tax: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-2.5 text-xs font-mono tabular-nums text-[#f5f5f5] bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5]"
              />
            </div>

            <div>
              <label
                htmlFor="charge-tip"
                className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50 mb-1"
              >
                Tip ({currencySymbol})
              </label>
              <input
                id="charge-tip"
                type="number"
                min="0"
                step="0.01"
                value={receipt.tip}
                onChange={(e) =>
                  onUpdateReceiptMeta({
                    tip: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-2.5 text-xs font-mono tabular-nums text-[#f5f5f5] bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5]"
              />
            </div>

            <div>
              <label
                htmlFor="charge-service"
                className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50 mb-1"
              >
                Service ({currencySymbol})
              </label>
              <input
                id="charge-service"
                type="number"
                min="0"
                step="0.01"
                value={receipt.serviceCharge}
                onChange={(e) =>
                  onUpdateReceiptMeta({
                    serviceCharge: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-2.5 text-xs font-mono tabular-nums text-[#f5f5f5] bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5]"
              />
            </div>

            <div>
              <label
                htmlFor="charge-discount"
                className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50 mb-1"
              >
                Discount ({currencySymbol})
              </label>
              <input
                id="charge-discount"
                type="number"
                min="0"
                step="0.01"
                value={receipt.discount}
                onChange={(e) =>
                  onUpdateReceiptMeta({
                    discount: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="w-full h-9 px-2.5 text-xs font-mono tabular-nums text-[#f5f5f5] bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5]"
              />
            </div>
          </div>

          {/* Quick Tip Presets */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50">
              Quick tip %
            </span>
            <div className="flex items-center gap-1">
              {[0, 15, 18, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTipPercent(pct)}
                  className="px-2 py-1 text-[11px] font-mono tabular-nums text-[#f5f5f5]/70 bg-transparent border border-white/15 rounded-[2px] hover:border-[#f5f5f5] hover:text-[#f5f5f5] transition-colors cursor-pointer"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Optional UPI ID */}
          <div>
            <label
              htmlFor="payee-upi-input"
              className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/50 mb-1"
            >
              Payee UPI ID (optional)
            </label>
            <input
              id="payee-upi-input"
              type="text"
              value={receipt.upiId}
              onChange={(e) => onUpdateReceiptMeta({ upiId: e.target.value })}
              placeholder="e.g. maya.k@okaxis"
              className="w-full h-9 px-3 text-xs font-mono text-[#f5f5f5] bg-transparent border border-white/10 rounded-[2px] focus:outline-none focus:border-[#f5f5f5] placeholder:text-[#f5f5f5]/30"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
