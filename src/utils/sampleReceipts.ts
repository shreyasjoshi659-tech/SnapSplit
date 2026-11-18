import type { Person, ReceiptData, SavedExpense } from '../types';

export interface SampleReceiptPreset {
  id: string;
  label: string;
  rawText: string;
  people: Person[];
  receipt: ReceiptData;
}

export const DEFAULT_PEOPLE: Person[] = [
  { id: 'p-maya', name: 'Maya', colorKey: 'teal' },
  { id: 'p-liam', name: 'Liam', colorKey: 'indigo' },
  { id: 'p-priya', name: 'Priya', colorKey: 'amber' },
  { id: 'p-sam', name: 'Sam', colorKey: 'rose' },
];

export const SAMPLE_RECEIPTS: SampleReceiptPreset[] = [
  {
    id: 'trattoria-dinner',
    label: 'Trattoria Verde Dinner (Shared + Discount)',
    rawText: `TRATTORIA VERDE
142 Mercer St · Table 12
2x Wood-Fired Margherita $36.00
1x Burrata & Heirloom Tomato $18.50
1x Truffle Fries (Table) $14.00
1x Cacio e Pepe $24.00
1x Grilled Branzino $34.00
2x Negroni Sbagliato $32.00
1x Sparkling Yuzu Tonic $8.50
Promo Loyalty Discount -$15.00
Sales Tax (8.875%) $13.49
Suggested Gratuity (18%) $27.36
Total $192.85`,
    people: DEFAULT_PEOPLE,
    receipt: {
      title: 'Trattoria Verde',
      date: '2026-11-16',
      category: 'Dining',
      currency: 'USD',
      paidById: 'p-maya',
      upiId: '',
      tax: 13.49,
      tip: 27.36,
      serviceCharge: 0,
      discount: 15.0,
      items: [
        {
          id: 'tv-1',
          name: 'Wood-Fired Margherita',
          quantity: 2,
          unitPrice: 18.0,
          totalPrice: 36.0,
          assignedTo: ['p-maya', 'p-liam', 'p-priya', 'p-sam'],
        },
        {
          id: 'tv-2',
          name: 'Burrata & Heirloom Tomato',
          quantity: 1,
          unitPrice: 18.5,
          totalPrice: 18.5,
          assignedTo: ['p-maya', 'p-priya'],
        },
        {
          id: 'tv-3',
          name: 'Truffle Fries (Table)',
          quantity: 1,
          unitPrice: 14.0,
          totalPrice: 14.0,
          assignedTo: ['p-maya', 'p-liam', 'p-priya', 'p-sam'],
        },
        {
          id: 'tv-4',
          name: 'Cacio e Pepe',
          quantity: 1,
          unitPrice: 24.0,
          totalPrice: 24.0,
          assignedTo: ['p-liam'],
        },
        {
          id: 'tv-5',
          name: 'Grilled Branzino',
          quantity: 1,
          unitPrice: 34.0,
          totalPrice: 34.0,
          assignedTo: ['p-sam'],
        },
        {
          id: 'tv-6',
          name: 'Negroni Sbagliato',
          quantity: 2,
          unitPrice: 16.0,
          totalPrice: 32.0,
          assignedTo: ['p-maya', 'p-liam'],
        },
        {
          id: 'tv-7',
          name: 'Sparkling Yuzu Tonic',
          quantity: 1,
          unitPrice: 8.5,
          totalPrice: 8.5,
          assignedTo: [],
        },
      ],
    },
  },
  {
    id: 'bombay-brunch',
    label: 'Bombay Canteen Brunch (INR + UPI)',
    rawText: `THE BOMBAY CANTEEN
Kamala Mills · Mumbai
1x Kejriwal Toast (Shared) ₹525.00
2x Mutton Seekh Paratha ₹1150.00
1x Avocado Bhel ₹475.00
3x Filter Kaapi Martini ₹2100.00
1x Masala Chai Panna Cotta ₹425.00
Member Discount -₹300.00
CGST + SGST (5%) ₹218.75
Service Charge (10%) ₹437.50
Total ₹5031.25`,
    people: DEFAULT_PEOPLE,
    receipt: {
      title: 'The Bombay Canteen',
      date: '2026-11-15',
      category: 'Dining',
      currency: 'INR',
      paidById: 'p-priya',
      upiId: 'priya.sharma@okicici',
      tax: 218.75,
      tip: 0,
      serviceCharge: 437.5,
      discount: 300.0,
      items: [
        {
          id: 'bc-1',
          name: 'Kejriwal Toast (Shared)',
          quantity: 1,
          unitPrice: 525,
          totalPrice: 525,
          assignedTo: ['p-maya', 'p-liam', 'p-priya', 'p-sam'],
        },
        {
          id: 'bc-2',
          name: 'Mutton Seekh Paratha',
          quantity: 2,
          unitPrice: 575,
          totalPrice: 1150,
          assignedTo: ['p-liam', 'p-sam'],
        },
        {
          id: 'bc-3',
          name: 'Avocado Bhel',
          quantity: 1,
          unitPrice: 475,
          totalPrice: 475,
          assignedTo: ['p-maya', 'p-priya'],
        },
        {
          id: 'bc-4',
          name: 'Filter Kaapi Martini',
          quantity: 3,
          unitPrice: 700,
          totalPrice: 2100,
          assignedTo: ['p-maya', 'p-liam', 'p-priya'],
        },
        {
          id: 'bc-5',
          name: 'Masala Chai Panna Cotta',
          quantity: 1,
          unitPrice: 425,
          totalPrice: 425,
          assignedTo: ['p-sam'],
        },
      ],
    },
  },
  {
    id: 'grocery-run',
    label: 'Weekend House Grocery Run',
    rawText: `TRADER JOE'S MARKET #108
2x Organic Oat Milk $7.98
1x Sourdough Boule $4.99
1x Honeycrisp Apples (Bag) $6.49
1x Cold Brew Concentrate $8.99
2x Olive Oil Chips $5.98
1x Sparkling Water 12pk $5.49
1x Aged Gouda Wedge $7.25
Coupon Savings -$5.00
Sales Tax $1.42
Total $43.59`,
    people: DEFAULT_PEOPLE.slice(0, 3),
    receipt: {
      title: "Trader Joe's Market",
      date: '2026-11-14',
      category: 'Groceries',
      currency: 'USD',
      paidById: 'p-liam',
      upiId: '',
      tax: 1.42,
      tip: 0,
      serviceCharge: 0,
      discount: 5.0,
      items: [
        {
          id: 'tj-1',
          name: 'Organic Oat Milk',
          quantity: 2,
          unitPrice: 3.99,
          totalPrice: 7.98,
          assignedTo: ['p-maya', 'p-liam', 'p-priya'],
        },
        {
          id: 'tj-2',
          name: 'Sourdough Boule',
          quantity: 1,
          unitPrice: 4.99,
          totalPrice: 4.99,
          assignedTo: ['p-maya', 'p-liam', 'p-priya'],
        },
        {
          id: 'tj-3',
          name: 'Honeycrisp Apples (Bag)',
          quantity: 1,
          unitPrice: 6.49,
          totalPrice: 6.49,
          assignedTo: ['p-maya', 'p-priya'],
        },
        {
          id: 'tj-4',
          name: 'Cold Brew Concentrate',
          quantity: 1,
          unitPrice: 8.99,
          totalPrice: 8.99,
          assignedTo: ['p-liam'],
        },
        {
          id: 'tj-5',
          name: 'Olive Oil Chips',
          quantity: 2,
          unitPrice: 2.99,
          totalPrice: 5.98,
          assignedTo: ['p-maya', 'p-liam', 'p-priya'],
        },
        {
          id: 'tj-6',
          name: 'Sparkling Water 12pk',
          quantity: 1,
          unitPrice: 5.49,
          totalPrice: 5.49,
          assignedTo: ['p-maya', 'p-liam', 'p-priya'],
        },
        {
          id: 'tj-7',
          name: 'Aged Gouda Wedge',
          quantity: 1,
          unitPrice: 7.25,
          totalPrice: 7.25,
          assignedTo: ['p-priya'],
        },
      ],
    },
  },
];

export const INITIAL_SAVED_EXPENSES: SavedExpense[] = [
  {
    id: 'exp-seed-1',
    title: 'Kissa Izakaya Late Night',
    date: '2026-11-12',
    createdAt: '2026-11-12T22:15:00Z',
    category: 'Dining',
    currency: 'USD',
    grandTotal: 146.4,
    paidByName: 'Maya',
    upiId: '',
    settlements: [
      { personId: 'p-maya', name: 'Maya', colorKey: 'teal', amount: 38.2, settled: true },
      { personId: 'p-liam', name: 'Liam', colorKey: 'indigo', amount: 42.15, settled: true },
      { personId: 'p-priya', name: 'Priya', colorKey: 'amber', amount: 34.05, settled: false },
      { personId: 'p-sam', name: 'Sam', colorKey: 'rose', amount: 32.0, settled: false },
    ],
    peopleSnapshot: DEFAULT_PEOPLE,
    receiptSnapshot: {
      title: 'Kissa Izakaya Late Night',
      date: '2026-11-12',
      category: 'Dining',
      currency: 'USD',
      paidById: 'p-maya',
      upiId: '',
      tax: 10.4,
      tip: 20.0,
      serviceCharge: 0,
      discount: 0,
      items: [
        {
          id: 'iz-1',
          name: 'Karaage Chicken Plate',
          quantity: 2,
          unitPrice: 14,
          totalPrice: 28,
          assignedTo: ['p-maya', 'p-liam', 'p-priya', 'p-sam'],
        },
        {
          id: 'iz-2',
          name: 'Spicy Miso Ramen',
          quantity: 2,
          unitPrice: 19,
          totalPrice: 38,
          assignedTo: ['p-maya', 'p-priya'],
        },
        {
          id: 'iz-3',
          name: 'Wagyu Donburi',
          quantity: 1,
          unitPrice: 28,
          totalPrice: 28,
          assignedTo: ['p-liam'],
        },
        {
          id: 'iz-4',
          name: 'Yuzu Highball Pitchers',
          quantity: 1,
          unitPrice: 22,
          totalPrice: 22,
          assignedTo: ['p-liam', 'p-sam'],
        },
      ],
    },
  },
  {
    id: 'exp-seed-2',
    title: 'Whole Foods Pantry Stockup',
    date: '2026-11-09',
    createdAt: '2026-11-09T17:40:00Z',
    category: 'Groceries',
    currency: 'USD',
    grandTotal: 84.5,
    paidByName: 'Liam',
    upiId: '',
    settlements: [
      { personId: 'p-maya', name: 'Maya', colorKey: 'teal', amount: 28.17, settled: true },
      { personId: 'p-liam', name: 'Liam', colorKey: 'indigo', amount: 28.17, settled: true },
      { personId: 'p-priya', name: 'Priya', colorKey: 'amber', amount: 28.16, settled: true },
    ],
    peopleSnapshot: DEFAULT_PEOPLE.slice(0, 3),
    receiptSnapshot: {
      title: 'Whole Foods Pantry Stockup',
      date: '2026-11-09',
      category: 'Groceries',
      currency: 'USD',
      paidById: 'p-liam',
      upiId: '',
      tax: 3.5,
      tip: 0,
      serviceCharge: 0,
      discount: 0,
      items: [
        {
          id: 'wf-1',
          name: 'Shared Pantry Staples',
          quantity: 1,
          unitPrice: 81.0,
          totalPrice: 81.0,
          assignedTo: ['p-maya', 'p-liam', 'p-priya'],
        },
      ],
    },
  },
];
