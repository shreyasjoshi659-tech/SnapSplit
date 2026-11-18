import type { SavedExpense } from '../types';
import { INITIAL_SAVED_EXPENSES } from './sampleReceipts';

const LEDGER_STORAGE_KEY = 'snapsplit_expense_ledger_v1';
const LEDGER_SEEDED_KEY = 'snapsplit_expense_ledger_seeded_v1';

export function loadSavedExpenses(): SavedExpense[] {
  try {
    const raw = window.localStorage.getItem(LEDGER_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    const alreadySeeded = window.localStorage.getItem(LEDGER_SEEDED_KEY);
    if (!alreadySeeded) {
      window.localStorage.setItem(
        LEDGER_STORAGE_KEY,
        JSON.stringify(INITIAL_SAVED_EXPENSES)
      );
      window.localStorage.setItem(LEDGER_SEEDED_KEY, '1');
      return INITIAL_SAVED_EXPENSES;
    }
    return [];
  } catch {
    return INITIAL_SAVED_EXPENSES;
  }
}

export function persistSavedExpenses(expenses: SavedExpense[]): void {
  try {
    window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(expenses));
    window.localStorage.setItem(LEDGER_SEEDED_KEY, '1');
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}
