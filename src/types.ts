export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

export type ExpenseCategory =
  | 'Dining'
  | 'Groceries'
  | 'Drinks'
  | 'Travel'
  | 'Utilities'
  | 'Other';

export interface Person {
  id: string;
  name: string;
  colorKey: 'teal' | 'indigo' | 'amber' | 'rose' | 'sky' | 'violet';
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  assignedTo: string[];
}

export interface ReceiptData {
  title: string;
  date: string;
  category: ExpenseCategory;
  currency: CurrencyCode;
  items: ReceiptItem[];
  tax: number;
  tip: number;
  serviceCharge: number;
  discount: number;
  paidById: string;
  upiId: string;
}

export interface PersonItemShare {
  itemId: string;
  name: string;
  quantity: number;
  itemTotal: number;
  shareAmount: number;
  splitCount: number;
}

export interface PersonBreakdown {
  personId: string;
  name: string;
  colorKey: Person['colorKey'];
  itemsSubtotal: number;
  taxShare: number;
  tipShare: number;
  serviceChargeShare: number;
  discountShare: number;
  totalOwed: number;
  items: PersonItemShare[];
}

export interface SplitSummary {
  itemsTotal: number;
  assignedSubtotal: number;
  unassignedSubtotal: number;
  unassignedCount: number;
  tax: number;
  tip: number;
  serviceCharge: number;
  discount: number;
  grandTotal: number;
  assignedGrandTotal: number;
  remainingToAssignTotal: number;
  people: PersonBreakdown[];
}

export interface SettlementEntry {
  personId: string;
  name: string;
  colorKey: Person['colorKey'];
  amount: number;
  settled: boolean;
}

export interface SavedExpense {
  id: string;
  title: string;
  date: string;
  createdAt: string;
  category: ExpenseCategory;
  currency: CurrencyCode;
  grandTotal: number;
  paidByName: string;
  upiId: string;
  settlements: SettlementEntry[];
  receiptSnapshot: ReceiptData;
  peopleSnapshot: Person[];
}
