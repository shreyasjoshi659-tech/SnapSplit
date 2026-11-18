import { useEffect, useMemo, useState } from 'react';
import { Header, type AppView } from './components/Header';
import { ReceiptInputPanel } from './components/ReceiptInputPanel';
import { ItemAssignmentPanel } from './components/ItemAssignmentPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { ExpenseLedgerView } from './components/ExpenseLedgerView';
import { UpiQrModal } from './components/UpiQrModal';
import { ShareSplitModal } from './components/ShareSplitModal';
import type {
  Person,
  PersonBreakdown,
  ReceiptData,
  ReceiptItem,
  SavedExpense,
} from './types';
import { calculateSplitSummary } from './utils/splitMath';
import {
  normalizeParsedPayloadToReceipt,
  parseReceiptTextFallback,
  type ParsedReceiptPayload,
} from './utils/receiptParser';
import {
  DEFAULT_PEOPLE,
  SAMPLE_RECEIPTS,
  type SampleReceiptPreset,
} from './utils/sampleReceipts';
import { PERSON_COLOR_ORDER } from './utils/colors';
import { loadSavedExpenses, persistSavedExpenses } from './utils/storage';

const INITIAL_SAMPLE = SAMPLE_RECEIPTS[0];

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('splitter');
  const [rawText, setRawText] = useState<string>(INITIAL_SAMPLE.rawText);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');

  const [people, setPeople] = useState<Person[]>(INITIAL_SAMPLE.people);
  const [receipt, setReceipt] = useState<ReceiptData>(INITIAL_SAMPLE.receipt);

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  const [savedExpenses, setSavedExpenses] = useState<SavedExpense[]>(() =>
    loadSavedExpenses()
  );
  const [justSavedToLedger, setJustSavedToLedger] = useState(false);
  const [qrPerson, setQrPerson] = useState<PersonBreakdown | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    persistSavedExpenses(savedExpenses);
  }, [savedExpenses]);

  const summary = useMemo(
    () => calculateSplitSummary(receipt, people),
    [receipt, people]
  );

  const handleLoadSample = (preset: SampleReceiptPreset = SAMPLE_RECEIPTS[0]) => {
    setPeople(preset.people.map((p) => ({ ...p })));
    setReceipt({
      ...preset.receipt,
      items: preset.receipt.items.map((item) => ({
        ...item,
        assignedTo: [...item.assignedTo],
      })),
    });
    setRawText(preset.rawText);
    setImageBase64(null);
    setParseError(null);
    setParseNotice(`Loaded "${preset.label}".`);
  };

  const handleClearBill = () => {
    setRawText('');
    setImageBase64(null);
    setParseError(null);
    setParseNotice(null);
    setReceipt((prev) => ({
      title: 'New Group Bill',
      date: new Date().toISOString().slice(0, 10),
      category: 'Dining',
      currency: prev.currency,
      items: [],
      tax: 0,
      tip: 0,
      serviceCharge: 0,
      discount: 0,
      paidById: people[0]?.id ?? DEFAULT_PEOPLE[0].id,
      upiId: prev.upiId,
    }));
  };

  const applyParsedPayload = (
    payload: ParsedReceiptPayload,
    sourceLabel: string
  ) => {
    const nextReceipt = normalizeParsedPayloadToReceipt(
      payload,
      receipt.paidById || people[0]?.id || '',
      receipt.upiId
    );
    setReceipt(nextReceipt);
    setParseError(null);
    setParseNotice(
      `Extracted ${nextReceipt.items.length} line items via ${sourceLabel}. Tap names on each item to assign shares.`
    );
  };

  const handleParseWithAi = async () => {
    if (!rawText.trim() && !imageBase64) {
      setParseError('Paste receipt text or upload a receipt photo first.');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setParseNotice(null);

    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          imageBase64,
          mimeType: imageMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error || 'Receipt parsing failed. Please check your input.'
        );
      }
      if (!data?.parsed || !Array.isArray(data.parsed.items)) {
        throw new Error('Unexpected response format from receipt parser.');
      }
      applyParsedPayload(data.parsed, 'Gemini AI');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to parse receipt right now.';
      setParseError(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleQuickTextParse = () => {
    if (!rawText.trim()) {
      setParseError('Paste receipt text first to run quick text parse.');
      return;
    }
    const parsed = parseReceiptTextFallback(rawText);
    if (parsed.items.length === 0) {
      setParseError(
        'No line items with prices were recognized. Try adding prices at the end of each line (e.g. "Tacos $14.00") or use Parse with AI.'
      );
      return;
    }
    applyParsedPayload(parsed, 'Quick Text Parse');
  };

  const handleAddPerson = (name: string) => {
    if (people.length >= 6) return;
    const usedColors = new Set(people.map((p) => p.colorKey));
    const nextColor =
      PERSON_COLOR_ORDER.find((c) => !usedColors.has(c)) ??
      PERSON_COLOR_ORDER[people.length % PERSON_COLOR_ORDER.length];
    const newPerson: Person = {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      name,
      colorKey: nextColor,
    };
    setPeople((prev) => [...prev, newPerson]);
  };

  const handleRemovePerson = (personId: string) => {
    if (people.length <= 2) return;
    const remaining = people.filter((p) => p.id !== personId);
    setPeople(remaining);
    setReceipt((prev) => ({
      ...prev,
      paidById:
        prev.paidById === personId ? remaining[0]?.id ?? '' : prev.paidById,
      items: prev.items.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((id) => id !== personId),
      })),
    }));
  };

  const handleTogglePersonOnItem = (itemId: string, personId: string) => {
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.assignedTo.includes(personId);
        return {
          ...item,
          assignedTo: exists
            ? item.assignedTo.filter((id) => id !== personId)
            : [...item.assignedTo, personId],
        };
      }),
    }));
  };

  const handleAssignAllToItem = (itemId: string) => {
    const allIds = people.map((p) => p.id);
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const validAssigned = item.assignedTo.filter((id) => allIds.includes(id));
        const currentlyAll = validAssigned.length === allIds.length;
        return {
          ...item,
          assignedTo: currentlyAll ? [] : allIds,
        };
      }),
    }));
  };

  const handleSplitUnassignedEvenly = () => {
    const allIds = people.map((p) => p.id);
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        const validAssigned = item.assignedTo.filter((id) => allIds.includes(id));
        return validAssigned.length === 0
          ? { ...item, assignedTo: allIds }
          : item;
      }),
    }));
  };

  const handleAddItem = (name: string, quantity: number, totalPrice: number) => {
    const unitPrice = Math.round((totalPrice / quantity) * 100) / 100;
    const newItem: ReceiptItem = {
      id: `manual-${Date.now().toString(36)}`,
      name,
      quantity,
      unitPrice,
      totalPrice,
      assignedTo: [],
    };
    setReceipt((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleUpdateItem = (itemId: string, patch: Partial<ReceiptItem>) => {
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleDeleteItem = (itemId: string) => {
    setReceipt((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleSaveToLedger = () => {
    if (receipt.items.length === 0) return;
    const paidBy = people.find((p) => p.id === receipt.paidById);
    const settlements = summary.people
      .filter((p) => p.totalOwed > 0 || p.items.length > 0)
      .map((p) => ({
        personId: p.personId,
        name: p.name,
        colorKey: p.colorKey,
        amount: p.totalOwed,
        settled: p.personId === receipt.paidById,
      }));

    if (summary.unassignedCount > 0 && summary.remainingToAssignTotal > 0) {
      settlements.push({
        personId: 'unassigned',
        name: 'Unassigned',
        colorKey: 'amber',
        amount: Math.round(summary.remainingToAssignTotal * 100) / 100,
        settled: false,
      });
    }

    const newExpense: SavedExpense = {
      id: `exp-${Date.now().toString(36)}`,
      title: receipt.title.trim() || 'Untitled Group Bill',
      date: receipt.date,
      createdAt: new Date().toISOString(),
      category: receipt.category,
      currency: receipt.currency,
      grandTotal: summary.grandTotal,
      paidByName: paidBy?.name || people[0]?.name || 'Group',
      upiId: receipt.upiId,
      settlements,
      receiptSnapshot: {
        ...receipt,
        items: receipt.items.map((i) => ({
          ...i,
          assignedTo: [...i.assignedTo],
        })),
      },
      peopleSnapshot: people.map((p) => ({ ...p })),
    };

    setSavedExpenses((prev) => [newExpense, ...prev]);
    setJustSavedToLedger(true);
    window.setTimeout(() => setJustSavedToLedger(false), 2500);
  };

  const handleToggleSettlement = (expenseId: string, personId: string) => {
    setSavedExpenses((prev) =>
      prev.map((exp) => {
        if (exp.id !== expenseId) return exp;
        return {
          ...exp,
          settlements: exp.settlements.map((s) =>
            s.personId === personId ? { ...s, settled: !s.settled } : s
          ),
        };
      })
    );
  };

  const handleReopenExpense = (expense: SavedExpense) => {
    setPeople(expense.peopleSnapshot.map((p) => ({ ...p })));
    setReceipt({
      ...expense.receiptSnapshot,
      items: expense.receiptSnapshot.items.map((item) => ({
        ...item,
        assignedTo: [...item.assignedTo],
      })),
    });
    setParseError(null);
    setParseNotice(`Reopened "${expense.title}" from your Expense Ledger.`);
    setActiveView('splitter');
  };

  const handleDeleteExpense = (expenseId: string) => {
    setSavedExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
  };

  const paidByName =
    people.find((p) => p.id === receipt.paidById)?.name || people[0]?.name || 'Payee';

  return (
    <div
      id="top"
      className="min-h-screen lg:h-screen flex flex-col bg-[#0a0a0a] text-[#f5f5f5] lg:overflow-hidden"
    >
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        onLoadSample={() => handleLoadSample(SAMPLE_RECEIPTS[0])}
        onClearBill={handleClearBill}
        onPrimaryAction={() => setIsShareModalOpen(true)}
        ledgerCount={savedExpenses.length}
        canSaveToLedger={receipt.items.length > 0}
      />

      {activeView === 'splitter' ? (
        <main className="flex-1 flex flex-col lg:min-h-0 lg:overflow-hidden">
          {/* Edge-to-Edge 3-Pane Architectural Shell */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[350px_1fr_390px] divide-y lg:divide-y-0 lg:divide-x divide-white/10 lg:min-h-0 lg:overflow-hidden">
            <ReceiptInputPanel
              rawText={rawText}
              onRawTextChange={setRawText}
              imagePreviewUrl={imageBase64}
              onImageSelect={(dataUrl, mime) => {
                setImageBase64(dataUrl);
                setImageMimeType(mime);
                setParseError(null);
              }}
              onImageClear={() => setImageBase64(null)}
              onParseWithAi={handleParseWithAi}
              onQuickTextParse={handleQuickTextParse}
              isParsing={isParsing}
              parseError={parseError}
              parseNotice={parseNotice}
              onSelectSample={handleLoadSample}
              people={people}
              onAddPerson={handleAddPerson}
              onRemovePerson={handleRemovePerson}
              receipt={receipt}
              onUpdateReceiptMeta={(patch) =>
                setReceipt((prev) => ({ ...prev, ...patch }))
              }
              itemsSubtotal={summary.itemsTotal}
            />

            <ItemAssignmentPanel
              items={receipt.items}
              currency={receipt.currency}
              people={people}
              summary={summary}
              isParsing={isParsing}
              onTogglePersonOnItem={handleTogglePersonOnItem}
              onAssignAllToItem={handleAssignAllToItem}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onSplitUnassignedEvenly={handleSplitUnassignedEvenly}
              onLoadDefaultSample={() => handleLoadSample(SAMPLE_RECEIPTS[0])}
            />

            <SummaryPanel
              receipt={receipt}
              people={people}
              summary={summary}
              onOpenUpiQr={(person) => setQrPerson(person)}
              onSaveToLedger={handleSaveToLedger}
              justSavedToLedger={justSavedToLedger}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1380px] mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h1 className="font-display text-lg sm:text-xl font-semibold uppercase tracking-[-0.02em] text-[#f5f5f5] text-balance">
                Expense Ledger
              </h1>
              <p className="text-xs text-[#f5f5f5]/50 mt-1">
                Track group bills, category spending, and per-person settlement
                status across outings.
              </p>
            </div>

            <ExpenseLedgerView
              expenses={savedExpenses}
              onToggleSettlement={handleToggleSettlement}
              onReopenExpense={handleReopenExpense}
              onDeleteExpense={handleDeleteExpense}
              onStartNewSplit={() => setActiveView('splitter')}
            />
          </div>
        </main>
      )}

      <UpiQrModal
        person={qrPerson}
        payeeName={paidByName}
        upiId={receipt.upiId}
        billTitle={receipt.title}
        currency={receipt.currency}
        onUpdateUpiId={(val) => setReceipt((prev) => ({ ...prev, upiId: val }))}
        onClose={() => setQrPerson(null)}
      />

      <ShareSplitModal
        isOpen={isShareModalOpen}
        receipt={receipt}
        people={people}
        summary={summary}
        onSaveToLedger={handleSaveToLedger}
        justSavedToLedger={justSavedToLedger}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}
