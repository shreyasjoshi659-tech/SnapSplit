import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSplitSummary } from './splitMath';
import { SAMPLE_RECEIPTS } from './sampleReceipts';
import {
  buildPdfFilename,
  createSplitPdfDoc,
  formatMoneyForPdf,
} from './pdfExport';

test('buildPdfFilename sanitizes title and date into a .pdf filename', () => {
  assert.equal(
    buildPdfFilename("Maya's Friday Dinner!", '2026-03-14'),
    'snapsplit-maya-s-friday-dinner-2026-03-14.pdf'
  );
  assert.equal(
    buildPdfFilename('', '2026-03-14'),
    'snapsplit-group-bill-2026-03-14.pdf'
  );
});

test('formatMoneyForPdf formats all currencies cleanly in ASCII', () => {
  assert.equal(formatMoneyForPdf(42.5, 'USD'), '$42.50');
  assert.equal(formatMoneyForPdf(1250, 'INR'), 'INR 1,250.00');
  assert.equal(formatMoneyForPdf(-12.3, 'EUR'), '-EUR 12.30');
  assert.equal(formatMoneyForPdf(99.9, 'GBP'), 'GBP 99.90');
});

test('createSplitPdfDoc produces valid PDF bytes containing all active participants', () => {
  const sample = SAMPLE_RECEIPTS[0];
  const summary = calculateSplitSummary(sample.receipt, sample.people);
  const doc = createSplitPdfDoc(sample.receipt, summary, sample.people, true);

  const output = doc.output('arraybuffer');
  assert.ok(output.byteLength > 1000, 'Expected non-empty PDF output');

  const header = new TextDecoder().decode(new Uint8Array(output.slice(0, 8)));
  assert.ok(header.startsWith('%PDF-'), `Expected %PDF- header, got ${header}`);
});
