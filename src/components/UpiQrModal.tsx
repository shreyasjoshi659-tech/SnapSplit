import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, X } from 'lucide-react';
import type { CurrencyCode, PersonBreakdown } from '../types';
import { buildUpiUri, formatMoney } from '../utils/splitMath';

interface UpiQrModalProps {
  person: PersonBreakdown | null;
  payeeName: string;
  upiId: string;
  billTitle: string;
  currency: CurrencyCode;
  onUpdateUpiId: (upiId: string) => void;
  onClose: () => void;
}

export const UpiQrModal: React.FC<UpiQrModalProps> = ({
  person,
  payeeName,
  upiId,
  billTitle,
  currency,
  onUpdateUpiId,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const effectiveUpiId = upiId.trim() || 'payee@upi';

  const upiUri = useMemo(() => {
    if (!person) return '';
    return buildUpiUri({
      upiId: effectiveUpiId,
      payeeName,
      amount: person.totalOwed,
      currency,
      note: `${billTitle} - ${person.name}`,
    });
  }, [person, effectiveUpiId, payeeName, currency, billTitle]);

  useEffect(() => {
    if (!person || !upiUri) {
      setQrDataUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [person, upiUri]);

  useEffect(() => {
    if (!person) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [person, onClose]);

  if (!person) return null;

  const handleCopyUri = async () => {
    try {
      await navigator.clipboard.writeText(upiUri);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upi-qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0f0f0f] border border-white/20 rounded-[2px] p-6 space-y-4 shadow-2xl text-[#f5f5f5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="upi-qr-modal-title"
              className="font-display text-sm font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5]"
            >
              Payment Request · {person.name}
            </h2>
            <p className="font-mono text-[11px] text-[#f5f5f5]/50 mt-0.5">
              Pay {payeeName} for {billTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment QR modal"
            className="p-1.5 text-[#f5f5f5]/55 hover:text-[#f5f5f5] rounded-[2px] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Display */}
        <div className="p-3.5 bg-[#0a0a0a] border border-white/10 rounded-[2px] flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/55">
            Amount Due
          </span>
          <span className="font-mono text-xl font-semibold tabular-nums text-[#f5f5f5]">
            {formatMoney(person.totalOwed, currency)}
          </span>
        </div>

        {/* UPI ID Editor */}
        <div>
          <label
            htmlFor="modal-upi-id"
            className="block font-mono text-[10px] uppercase tracking-[0.15em] text-[#f5f5f5]/55 mb-1.5"
          >
            Payee UPI ID
          </label>
          <input
            id="modal-upi-id"
            type="text"
            value={upiId}
            onChange={(e) => onUpdateUpiId(e.target.value)}
            placeholder="e.g. maya.k@okaxis"
            className="w-full h-9 px-3 text-xs font-mono text-[#f5f5f5] placeholder:text-[#f5f5f5]/35 bg-[#0a0a0a] border border-white/15 rounded-[2px] focus:outline-none focus:border-[#f5f5f5]"
          />
          {!upiId.trim() && (
            <p className="text-[11px] text-[#f5f5f5]/60 mt-1.5">
              Using placeholder <span className="font-mono text-[#f5f5f5]">payee@upi</span>{' '}
              until you enter a real UPI handle.
            </p>
          )}
        </div>

        {/* QR Code (white pad directly behind QR for reliable scanning) */}
        <div className="flex flex-col items-center justify-center p-4 bg-[#0a0a0a] border border-white/10 rounded-[2px]">
          {qrDataUrl ? (
            <div className="bg-white p-2.5 rounded-[2px]">
              <img
                src={qrDataUrl}
                alt={`UPI payment QR code for ${person.name}`}
                referrerPolicy="no-referrer"
                className="w-44 h-44 block"
              />
            </div>
          ) : (
            <div className="w-48 h-48 bg-white/5 rounded-[2px] flex items-center justify-center font-mono text-xs text-[#f5f5f5]/50">
              Generating QR...
            </div>
          )}
          <span className="mt-2.5 text-[11px] font-mono text-[#f5f5f5]/65 truncate max-w-full">
            {effectiveUpiId}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyUri}
            className="flex-1 h-10 px-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy UPI Link</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5] bg-transparent border border-white/25 rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#f5f5f5] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
