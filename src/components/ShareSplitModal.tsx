import React, { useEffect, useMemo, useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  FileText,
  MessageSquareText,
  Share2,
  X,
} from 'lucide-react';
import type { Person, ReceiptData, SplitSummary } from '../types';
import { formatMoney, generateShareableSummary } from '../utils/splitMath';
import {
  buildPdfFilename,
  createSplitPdfFile,
  downloadSplitPdf,
} from '../utils/pdfExport';

export type ShareFormatMode = 'text' | 'pdf';

interface ShareSplitModalProps {
  isOpen: boolean;
  receipt: ReceiptData;
  people: Person[];
  summary: SplitSummary;
  onSaveToLedger: () => void;
  justSavedToLedger: boolean;
  onClose: () => void;
}

export const ShareSplitModal: React.FC<ShareSplitModalProps> = ({
  isOpen,
  receipt,
  people,
  summary,
  onSaveToLedger,
  justSavedToLedger,
  onClose,
}) => {
  const [formatMode, setFormatMode] = useState<ShareFormatMode>('text');
  const [includeUpiLinks, setIncludeUpiLinks] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [downloadedPdfName, setDownloadedPdfName] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const hasUpi = receipt.upiId.trim().length > 0;

  const shareText = useMemo(
    () =>
      generateShareableSummary(
        receipt,
        summary,
        people,
        hasUpi ? includeUpiLinks : false
      ),
    [receipt, summary, people, hasUpi, includeUpiLinks]
  );

  const pdfFilename = useMemo(
    () => buildPdfFilename(receipt.title, receipt.date),
    [receipt.title, receipt.date]
  );

  const activePeople = useMemo(
    () => summary.people.filter((p) => p.items.length > 0 || p.totalOwed > 0),
    [summary.people]
  );

  const paidBy = useMemo(
    () => people.find((p) => p.id === receipt.paidById),
    [people, receipt.paidById]
  );

  const canShareText =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const canSharePdfFile = useMemo(() => {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.share !== 'function' ||
      typeof navigator.canShare !== 'function'
    ) {
      return false;
    }
    try {
      const probe = new File(['%PDF'], 'probe.pdf', { type: 'application/pdf' });
      return navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setShareError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyTextWithFallback = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyText = async () => {
    setShareError(null);
    const ok = await copyTextWithFallback(shareText);
    if (ok) {
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 2500);
    } else {
      setShareError('Clipboard access was blocked. Select and copy the text above.');
    }
  };

  const handleNativeShareText = async () => {
    if (!canShareText) return;
    setShareError(null);
    try {
      await navigator.share({
        title: receipt.title || 'SnapSplit Bill Breakdown',
        text: shareText,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      await handleCopyText();
    }
  };

  const handleDownloadPdf = () => {
    setShareError(null);
    try {
      const savedName = downloadSplitPdf(
        receipt,
        summary,
        people,
        hasUpi ? includeUpiLinks : false
      );
      setDownloadedPdfName(savedName);
      window.setTimeout(() => setDownloadedPdfName(null), 3000);
    } catch {
      setShareError('Could not generate the PDF file. Please try again.');
    }
  };

  const handleNativeSharePdf = async () => {
    if (!canSharePdfFile) {
      handleDownloadPdf();
      return;
    }
    setShareError(null);
    try {
      const pdfFile = createSplitPdfFile(
        receipt,
        summary,
        people,
        hasUpi ? includeUpiLinks : false
      );
      await navigator.share({
        title: receipt.title || 'SnapSplit Bill Breakdown',
        files: [pdfFile],
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      handleDownloadPdf();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-split-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0f0f0f] border border-white/20 rounded-[2px] p-5 sm:p-6 space-y-4 shadow-2xl text-[#f5f5f5] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2
              id="share-split-modal-title"
              className="font-display text-sm font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5]"
            >
              Share Bill Split
            </h2>
            <p className="font-mono text-[11px] text-[#f5f5f5]/55 mt-0.5">
              {receipt.title || 'Group Bill'} ·{' '}
              {formatMoney(summary.grandTotal, receipt.currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1.5 text-[#f5f5f5]/55 hover:text-[#f5f5f5] rounded-[2px] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Chooser: Text vs PDF */}
        <div
          role="tablist"
          aria-label="Choose share format"
          className="grid grid-cols-2 gap-2 shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={formatMode === 'text'}
            onClick={() => setFormatMode('text')}
            className={`p-3 text-left border rounded-[2px] transition-colors cursor-pointer ${
              formatMode === 'text'
                ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]'
                : 'bg-[#0a0a0a] text-[#f5f5f5] border-white/15 hover:border-white/35'
            }`}
          >
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <MessageSquareText className="w-3.5 h-3.5 shrink-0" />
              <span>Group Chat Text</span>
            </div>
            <p
              className={`text-[11px] mt-1 ${
                formatMode === 'text' ? 'text-[#0a0a0a]/75' : 'text-[#f5f5f5]/50'
              }`}
            >
              Copy &amp; paste into WhatsApp, iMessage, or Discord
            </p>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={formatMode === 'pdf'}
            onClick={() => setFormatMode('pdf')}
            className={`p-3 text-left border rounded-[2px] transition-colors cursor-pointer ${
              formatMode === 'pdf'
                ? 'bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5]'
                : 'bg-[#0a0a0a] text-[#f5f5f5] border-white/15 hover:border-white/35'
            }`}
          >
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Shareable PDF</span>
            </div>
            <p
              className={`text-[11px] mt-1 ${
                formatMode === 'pdf' ? 'text-[#0a0a0a]/75' : 'text-[#f5f5f5]/50'
              }`}
            >
              Download clean formatted PDF breakdown to send
            </p>
          </button>
        </div>

        {/* Optional UPI Link Toggle */}
        {hasUpi && (
          <label className="flex items-center justify-between gap-3 px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-[2px] cursor-pointer shrink-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5]/75">
              Include UPI payment links ({receipt.upiId.trim()})
            </span>
            <input
              type="checkbox"
              checked={includeUpiLinks}
              onChange={(e) => setIncludeUpiLinks(e.target.checked)}
              className="w-4 h-4 accent-[#f5f5f5] cursor-pointer"
            />
          </label>
        )}

        {/* Format Body */}
        {formatMode === 'text' ? (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="flex-1 min-h-[180px] max-h-[280px] overflow-y-auto p-3.5 bg-[#0a0a0a] border border-white/10 rounded-[2px]">
              <pre className="font-mono text-[11px] leading-relaxed text-[#f5f5f5]/85 whitespace-pre-wrap break-words select-all">
                {shareText}
              </pre>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex-1 h-10 px-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text for Group Chat</span>
                  </>
                )}
              </button>

              {canShareText && (
                <button
                  type="button"
                  onClick={handleNativeShareText}
                  className="h-10 px-3.5 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5] bg-transparent border border-white/25 rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#f5f5f5] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="p-4 bg-[#0a0a0a] border border-white/10 rounded-[2px] space-y-3 overflow-y-auto max-h-[280px]">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#f5f5f5]/45">
                    PDF Document Preview
                  </div>
                  <div className="font-mono text-xs text-[#f5f5f5] truncate mt-0.5">
                    {pdfFilename}
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-[#f5f5f5] shrink-0">
                  {formatMoney(summary.grandTotal, receipt.currency)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#f5f5f5]/65">
                <div>Paid by: {paidBy?.name || 'Group'}</div>
                <div className="text-right">{receipt.items.length} line items</div>
              </div>

              <ul className="divide-y divide-white/10 border-t border-white/10 pt-1">
                {activePeople.map((person) => (
                  <li
                    key={person.personId}
                    className="py-1.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-[#f5f5f5]/85 truncate">
                      {person.name}
                      {paidBy?.id === person.personId ? (
                        <span className="font-mono text-[10px] text-[#f5f5f5]/45 ml-1.5">
                          (Paid)
                        </span>
                      ) : null}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#f5f5f5]">
                      {formatMoney(person.totalOwed, receipt.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex-1 h-10 px-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors cursor-pointer"
              >
                {downloadedPdfName ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>PDF Downloaded</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              {canSharePdfFile && (
                <button
                  type="button"
                  onClick={handleNativeSharePdf}
                  className="h-10 px-3.5 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5] bg-transparent border border-white/25 rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#f5f5f5] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share PDF</span>
                </button>
              )}
            </div>
          </div>
        )}

        {shareError && (
          <p className="text-[11px] font-mono text-rose-400 shrink-0">{shareError}</p>
        )}

        {/* Footer: Save to Ledger + Done */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onSaveToLedger}
            className="h-9 px-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5]/75 hover:text-[#f5f5f5] bg-transparent border border-white/15 hover:border-white/35 rounded-[2px] transition-colors cursor-pointer"
          >
            {justSavedToLedger ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved to Ledger</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save to Ledger</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#f5f5f5] bg-transparent border border-white/25 rounded-[2px] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] hover:border-[#f5f5f5] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
