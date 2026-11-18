import React from 'react';

export type AppView = 'splitter' | 'ledger';

interface HeaderProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onLoadSample: () => void;
  onClearBill: () => void;
  onPrimaryAction: () => void;
  ledgerCount: number;
  canSaveToLedger: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onLoadSample,
  onClearBill,
  onPrimaryAction,
  ledgerCount,
  canSaveToLedger,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10 shrink-0">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Minimal Monochrome Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('splitter');
          }}
          className="font-display text-sm sm:text-base font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#f5f5f5] rounded-[2px]"
        >
          SNAPSPLIT
        </a>

        {/* Zone 2: Geist Mono Navigation */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-3 sm:gap-7"
        >
          <button
            type="button"
            onClick={() => onSelectView('splitter')}
            aria-current={activeView === 'splitter' ? 'page' : undefined}
            className={`py-1 font-mono text-[10px] uppercase tracking-[0.15em] whitespace-nowrap shrink-0 border-b transition-colors focus-visible:outline-2 focus-visible:outline-[#f5f5f5] cursor-pointer ${
              activeView === 'splitter'
                ? 'border-[#f5f5f5] text-[#f5f5f5]'
                : 'border-transparent text-[#f5f5f5]/50 hover:text-[#f5f5f5]'
            }`}
          >
            <span className="hidden sm:inline">Bill Splitter</span>
            <span className="sm:hidden">Splitter</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('ledger')}
            aria-current={activeView === 'ledger' ? 'page' : undefined}
            className={`py-1 font-mono text-[10px] uppercase tracking-[0.15em] whitespace-nowrap shrink-0 border-b transition-colors focus-visible:outline-2 focus-visible:outline-[#f5f5f5] cursor-pointer ${
              activeView === 'ledger'
                ? 'border-[#f5f5f5] text-[#f5f5f5]'
                : 'border-transparent text-[#f5f5f5]/50 hover:text-[#f5f5f5]'
            }`}
          >
            <span className="hidden sm:inline">Expense Ledger ({ledgerCount})</span>
            <span className="sm:hidden">Ledger ({ledgerCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectView('splitter');
              onLoadSample();
            }}
            className="hidden md:inline-block py-1 font-mono text-[10px] uppercase tracking-[0.15em] whitespace-nowrap shrink-0 border-b border-transparent text-[#f5f5f5]/50 hover:text-[#f5f5f5] transition-colors focus-visible:outline-2 focus-visible:outline-[#f5f5f5] cursor-pointer"
          >
            Sample Bill
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectView('splitter');
              onClearBill();
            }}
            className="hidden md:inline-block py-1 font-mono text-[10px] uppercase tracking-[0.15em] whitespace-nowrap shrink-0 border-b border-transparent text-[#f5f5f5]/50 hover:text-[#f5f5f5] transition-colors focus-visible:outline-2 focus-visible:outline-[#f5f5f5] cursor-pointer"
          >
            New Blank
          </button>
        </nav>

        {/* Zone 3: Single Primary Monochrome Action */}
        <div className="shrink-0">
          {activeView === 'splitter' ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={!canSaveToLedger}
              className="px-3 sm:px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] disabled:bg-white/10 disabled:border-white/10 disabled:text-[#f5f5f5]/35 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5f5f5] cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Share</span>
              <span className="sm:hidden">Share</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectView('splitter')}
              className="px-3 sm:px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] font-medium text-[#0a0a0a] bg-[#f5f5f5] border border-[#f5f5f5] rounded-[2px] hover:bg-transparent hover:text-[#f5f5f5] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5f5f5] cursor-pointer"
            >
              <span className="hidden sm:inline">Split New Bill</span>
              <span className="sm:hidden">New Split</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
