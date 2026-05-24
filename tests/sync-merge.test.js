/**
 * Unit tests for mergeSyncData, _mergeReadLog, _mergeProgress in app-sync.js
 * Run with: node tests/sync-merge.test.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Minimal stubs so app-sync.js loads without throwing ──────────────────────
globalThis.window = { addEventListener: () => {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.App = {};

const code = readFileSync(join(__dirname, '../src/app/app-sync.js'), 'utf8');
new Function(code)();

const { mergeSyncData, _mergeReadLog, _mergeProgress } = globalThis.window._AppSyncMerge;

// ── Minimal test runner ───────────────────────────────────────────────────────
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function assert(cond, msg)  { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function assertDeepEqual(a, b, msg) {
  const as = JSON.stringify(a), bs = JSON.stringify(b);
  if (as !== bs) throw new Error(msg || `expected ${bs}, got ${as}`);
}

// ── _mergeReadLog ─────────────────────────────────────────────────────────────
console.log('\n_mergeReadLog');

test('takes per-day maximum', () => {
  const a = JSON.stringify({ '2025-01-01': 10, '2025-01-02': 5 });
  const b = JSON.stringify({ '2025-01-01': 7,  '2025-01-02': 8 });
  const r = JSON.parse(_mergeReadLog(a, b));
  assertEqual(r['2025-01-01'], 10);
  assertEqual(r['2025-01-02'], 8);
});

test('merges disjoint days from both sides', () => {
  const a = JSON.stringify({ '2025-01-01': 3 });
  const b = JSON.stringify({ '2025-01-02': 7 });
  const r = JSON.parse(_mergeReadLog(a, b));
  assertEqual(r['2025-01-01'], 3);
  assertEqual(r['2025-01-02'], 7);
});

test('returns fallback string when both are null/empty', () => {
  const r = _mergeReadLog(null, null);
  assertEqual(r, '{}');
});

test('returns other side when one is null', () => {
  const b = JSON.stringify({ '2025-01-01': 5 });
  const r = JSON.parse(_mergeReadLog(null, b));
  assertEqual(r['2025-01-01'], 5);
});

test('discards entries before sinceMs', () => {
  const a = JSON.stringify({ '2025-01-01': 10, '2025-06-01': 3 });
  const since = new Date('2025-03-01').getTime();
  const r = JSON.parse(_mergeReadLog(a, '{}', since));
  assert(!('2025-01-01' in r), 'old entry should be discarded');
  assertEqual(r['2025-06-01'], 3);
});

test('keeps all entries when sinceMs is 0', () => {
  const a = JSON.stringify({ '2024-01-01': 5, '2025-01-01': 10 });
  const r = JSON.parse(_mergeReadLog(a, '{}', 0));
  assert('2024-01-01' in r, 'old entry should be kept when no cutoff');
});

test('handles invalid JSON gracefully', () => {
  const valid = JSON.stringify({ '2025-01-01': 5 });
  const r = _mergeReadLog('not json', valid);
  // should return one of the sides, not throw
  assert(typeof r === 'string');
});

// ── _mergeProgress ────────────────────────────────────────────────────────────
console.log('\n_mergeProgress');

test('unions ayah arrays from both sides', () => {
  const a = JSON.stringify([1, 2, 3]);
  const b = JSON.stringify([3, 4, 5]);
  const r = JSON.parse(_mergeProgress(a, b));
  assertDeepEqual(r, [1, 2, 3, 4, 5]);
});

test('deduplicates ayahs', () => {
  const a = JSON.stringify([1, 2]);
  const b = JSON.stringify([1, 2]);
  const r = JSON.parse(_mergeProgress(a, b));
  assertEqual(r.length, 2);
});

test('returns sorted result', () => {
  const a = JSON.stringify([5, 1, 3]);
  const b = JSON.stringify([4, 2]);
  const r = JSON.parse(_mergeProgress(a, b));
  assertDeepEqual(r, [1, 2, 3, 4, 5]);
});

test('handles empty arrays', () => {
  const a = JSON.stringify([]);
  const b = JSON.stringify([1, 2]);
  const r = JSON.parse(_mergeProgress(a, b));
  assertDeepEqual(r, [1, 2]);
});

test('returns fallback when both empty/null', () => {
  const r = _mergeProgress(null, null);
  assertEqual(r, '[]');
});

test('handles invalid JSON gracefully', () => {
  const valid = JSON.stringify([1, 2]);
  const r = _mergeProgress('not json', valid);
  assert(typeof r === 'string');
});

// ── mergeSyncData — basic ────────────────────────────────────────────────────
console.log('\nmergeSyncData basics');

test('returns cloud when local is null', () => {
  const cloud = { theme: 'dark', _syncTime: '2025-01-01T00:00:00Z' };
  const r = mergeSyncData(null, cloud);
  assertEqual(r.theme, 'dark');
});

test('returns local when cloud is null', () => {
  const local = { theme: 'noor', _syncTime: '2025-01-01T00:00:00Z' };
  const r = mergeSyncData(local, null);
  assertEqual(r.theme, 'noor');
});

test('LWW: newer cloud wins for simple keys', () => {
  const local = { theme: 'light', _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { theme: 'dark',  _syncTime: '2025-06-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  assertEqual(r.theme, 'dark');
});

test('LWW: local wins when timestamps are equal (unsaved local changes)', () => {
  const ts = '2025-06-01T00:00:00Z';
  const local = { theme: 'noor', _syncTime: ts };
  const cloud = { theme: 'dark', _syncTime: ts };
  const r = mergeSyncData(local, cloud);
  assertEqual(r.theme, 'noor');
});

test('LWW: local wins when local is newer', () => {
  const local = { theme: 'noor', _syncTime: '2025-06-01T00:00:00Z' };
  const cloud = { theme: 'dark', _syncTime: '2025-01-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  assertEqual(r.theme, 'noor');
});

test('result always has a _syncTime', () => {
  const local = { _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  assert(typeof r._syncTime === 'string' && r._syncTime.length > 0);
});

// ── mergeSyncData — readLog ───────────────────────────────────────────────────
console.log('\nmergeSyncData readLog');

test('merges readLog per-day max', () => {
  const local = { readLog: JSON.stringify({ '2025-06-01': 10 }), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { readLog: JSON.stringify({ '2025-06-01':  5, '2025-06-02': 8 }), _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const rl = JSON.parse(r.readLog);
  assertEqual(rl['2025-06-01'], 10);
  assertEqual(rl['2025-06-02'], 8);
});

test('readLog entries before trackingResetAt are discarded', () => {
  const resetAt = '2025-04-01T00:00:00Z';
  const local = {
    readLog: JSON.stringify({ '2025-01-01': 5, '2025-06-01': 10 }),
    trackingResetAt: resetAt,
    _syncTime: '2025-01-01T00:00:00Z'
  };
  const cloud = { readLog: JSON.stringify({}), _syncTime: '2024-01-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const rl = JSON.parse(r.readLog);
  assert(!('2025-01-01' in rl), 'pre-reset entry should be discarded');
  assertEqual(rl['2025-06-01'], 10);
});

// ── mergeSyncData — lastRead ──────────────────────────────────────────────────
console.log('\nmergeSyncData lastRead');

test('FURTHEST: takes whichever is deeper in Quran', () => {
  const local = { lastRead: JSON.stringify({ surah: 2,  ayah: 5  }), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { lastRead: JSON.stringify({ surah: 36, ayah: 1  }), _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const lr = JSON.parse(r.lastRead);
  assertEqual(lr.surah, 36);
});

test('FURTHEST: local deeper position wins over newer cloud', () => {
  // local is at Surah 50, cloud (newer) is at Surah 2
  const local = { lastRead: JSON.stringify({ surah: 50, ayah: 1 }), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { lastRead: JSON.stringify({ surah: 2,  ayah: 1 }), _syncTime: '2025-06-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const lr = JSON.parse(r.lastRead);
  assertEqual(lr.surah, 50);
});

test('fullResetAt: reset-winner lastRead is used', () => {
  // cloud has a newer full reset at Surah 1
  const local = { lastRead: JSON.stringify({ surah: 50, ayah: 1 }), fullResetAt: '2025-01-01T00:00:00Z', _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { lastRead: JSON.stringify({ surah: 1,  ayah: 1 }), fullResetAt: '2025-06-01T00:00:00Z', _syncTime: '2025-06-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const lr = JSON.parse(r.lastRead);
  assertEqual(lr.surah, 1, 'cloud reset is newer, should use cloud lastRead');
});

// ── mergeSyncData — surah_progress ────────────────────────────────────────────
console.log('\nmergeSyncData surah_progress');

test('additive: unions surah_progress across devices', () => {
  const local = { 'surah_progress_2': JSON.stringify([1, 2, 3]), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { 'surah_progress_2': JSON.stringify([3, 4, 5]), _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const p = JSON.parse(r['surah_progress_2']);
  assertDeepEqual(p, [1, 2, 3, 4, 5]);
});

test('after trackingResetAt: uses only reset-winner progress', () => {
  const resetAt = '2025-06-01T00:00:00Z';
  const local = { 'surah_progress_2': JSON.stringify([1, 2, 3]), trackingResetAt: '2025-01-01T00:00:00Z', _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { 'surah_progress_2': JSON.stringify([10, 11]),  trackingResetAt: resetAt, _syncTime: '2025-06-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const p = JSON.parse(r['surah_progress_2']);
  // cloud has newer reset — should use cloud's progress only
  assertDeepEqual(p, [10, 11]);
});

// ── mergeSyncData — surah_read_v3 ─────────────────────────────────────────────
console.log('\nmergeSyncData surah_read_v3');

test('takes maximum ayah count per surah', () => {
  const local = { 'surah_read_v3_1': '5',  _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { 'surah_read_v3_1': '10', _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  assertEqual(r['surah_read_v3_1'], '10');
});

test('local higher count wins over newer cloud', () => {
  const local = { 'surah_read_v3_36': '50', _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { 'surah_read_v3_36': '3',  _syncTime: '2025-06-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  assertEqual(r['surah_read_v3_36'], '50');
});

test('includes surah from either side when other is missing', () => {
  const local = { 'surah_read_v3_2': '7', _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  assertEqual(r['surah_read_v3_2'], '7');
});

// ── mergeSyncData — book_read_ids ─────────────────────────────────────────────
console.log('\nmergeSyncData book_read_ids');

test('additive union of book IDs across devices', () => {
  const local = { book_read_ids: JSON.stringify(['1','2']), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { book_read_ids: JSON.stringify(['2','3']), _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const ids = JSON.parse(r.book_read_ids);
  assert(ids.includes('1'));
  assert(ids.includes('2'));
  assert(ids.includes('3'));
  assertEqual(ids.length, 3);
});

// ── mergeSyncData — pdfProg_ ──────────────────────────────────────────────────
console.log('\nmergeSyncData pdfProg_*');

test('pdfProg: takes side with higher ts', () => {
  const localProg = { page: 5,  ts: 1000 };
  const cloudProg = { page: 20, ts: 2000 };
  const local = { 'pdfProg_book1': JSON.stringify(localProg), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { 'pdfProg_book1': JSON.stringify(cloudProg), _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const p = JSON.parse(r['pdfProg_book1']);
  assertEqual(p.page, 20);
});

test('pdfProg: local wins if it has higher ts despite older _syncTime', () => {
  const localProg = { page: 99, ts: 9999 };
  const cloudProg = { page: 1,  ts: 1 };
  const local = { 'pdfProg_book1': JSON.stringify(localProg), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { 'pdfProg_book1': JSON.stringify(cloudProg), _syncTime: '2025-06-01T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  const p = JSON.parse(r['pdfProg_book1']);
  assertEqual(p.page, 99);
});

test('pdfProg: included when only on one side', () => {
  const local = { 'pdfProg_book1': JSON.stringify({ page: 5, ts: 100 }), _syncTime: '2025-01-01T00:00:00Z' };
  const cloud = { _syncTime: '2025-01-02T00:00:00Z' };
  const r = mergeSyncData(local, cloud);
  assert('pdfProg_book1' in r);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
