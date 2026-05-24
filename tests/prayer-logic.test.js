/**
 * Unit tests for src/prayer/prayer.logic.js
 * Run with: node tests/prayer-logic.test.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load the IIFE into this Node.js context ───────────────────────────────────
globalThis.window = {};
const code = readFileSync(join(__dirname, '../src/prayer/prayer.logic.js'), 'utf8');
new Function(code)();
const { PRAYER_ORDER, NOTIF_PRAYERS, parseAsDate, getNextPrayer, formatCountdown, formatTime, tomorrowBaghdad } = globalThis.window.PrayerLogic;

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

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── PRAYER_ORDER / NOTIF_PRAYERS ─────────────────────────────────────────────
console.log('\nConstants');

test('PRAYER_ORDER has 6 entries', () => {
  assertEqual(PRAYER_ORDER.length, 6);
});

test('PRAYER_ORDER contains Sunrise', () => {
  assert(PRAYER_ORDER.includes('Sunrise'));
});

test('NOTIF_PRAYERS has 5 entries (Sunrise excluded)', () => {
  assertEqual(NOTIF_PRAYERS.length, 5);
});

test('NOTIF_PRAYERS does not contain Sunrise', () => {
  assert(!NOTIF_PRAYERS.includes('Sunrise'));
});

test('NOTIF_PRAYERS preserves prayer order', () => {
  const expected = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  assertEqual(NOTIF_PRAYERS.join(','), expected.join(','));
});

// ── parseAsDate ───────────────────────────────────────────────────────────────
console.log('\nparseAsDate');

test('parses plain HH:MM string at Baghdad +03:00', () => {
  const d = parseAsDate('05:23', '2025-01-15');
  // Should be 05:23 Baghdad = 02:23 UTC
  assertEqual(d.toISOString(), '2025-01-15T02:23:00.000Z');
});

test('strips trailing timezone label "(PKT)"', () => {
  const d = parseAsDate('05:23 (PKT)', '2025-01-15');
  assertEqual(d.toISOString(), '2025-01-15T02:23:00.000Z');
});

test('returns NaN for empty string', () => {
  const d = parseAsDate('', '2025-01-15');
  assert(isNaN(d.getTime()), 'expected NaN for empty string');
});

test('returns NaN for null', () => {
  const d = parseAsDate(null, '2025-01-15');
  assert(isNaN(d.getTime()), 'expected NaN for null');
});

test('parses midnight 00:00 correctly', () => {
  const d = parseAsDate('00:00', '2025-06-01');
  assertEqual(d.toISOString(), '2025-05-31T21:00:00.000Z');
});

test('parses Isha at 21:30 correctly', () => {
  const d = parseAsDate('21:30', '2025-01-15');
  assertEqual(d.toISOString(), '2025-01-15T18:30:00.000Z');
});

test('parses single-digit hours correctly', () => {
  const d = parseAsDate('4:05', '2025-01-15');
  assertEqual(d.toISOString(), '2025-01-15T01:05:00.000Z');
});

// ── formatCountdown ───────────────────────────────────────────────────────────
console.log('\nformatCountdown');

test('zero ms returns 00:00:00', () => {
  assertEqual(formatCountdown(0), '00:00:00');
});

test('negative ms returns 00:00:00', () => {
  assertEqual(formatCountdown(-5000), '00:00:00');
});

test('1 second = 00:00:01', () => {
  assertEqual(formatCountdown(1000), '00:00:01');
});

test('59 seconds = 00:00:59', () => {
  assertEqual(formatCountdown(59000), '00:00:59');
});

test('60 seconds = 00:01:00', () => {
  assertEqual(formatCountdown(60000), '00:01:00');
});

test('1 hour = 01:00:00', () => {
  assertEqual(formatCountdown(3600000), '01:00:00');
});

test('1h 23m 45s = 01:23:45', () => {
  assertEqual(formatCountdown((1 * 3600 + 23 * 60 + 45) * 1000), '01:23:45');
});

test('10h 9m 5s = 10:09:05', () => {
  assertEqual(formatCountdown((10 * 3600 + 9 * 60 + 5) * 1000), '10:09:05');
});

test('sub-second remainder truncated (not rounded)', () => {
  // 1999ms → 1 second, not 2
  assertEqual(formatCountdown(1999), '00:00:01');
});

// ── formatTime ────────────────────────────────────────────────────────────────
console.log('\nformatTime');

test('null returns --:--', () => {
  assertEqual(formatTime(null, false), '--:--');
});

test('empty string returns --:--', () => {
  assertEqual(formatTime('', false), '--:--');
});

test('24h: 05:23 → 05:23', () => {
  assertEqual(formatTime('05:23', false), '05:23');
});

test('24h: 13:45 → 13:45', () => {
  assertEqual(formatTime('13:45', false), '13:45');
});

test('24h: 00:00 → 00:00', () => {
  assertEqual(formatTime('00:00', false), '00:00');
});

test('12h: 05:23 → 5:23 AM', () => {
  assertEqual(formatTime('05:23', true), '5:23 AM');
});

test('12h: 13:00 → 1:00 PM', () => {
  assertEqual(formatTime('13:00', true), '1:00 PM');
});

test('12h: noon 12:00 → 12:00 PM', () => {
  assertEqual(formatTime('12:00', true), '12:00 PM');
});

test('12h: midnight 00:00 → 12:00 AM', () => {
  assertEqual(formatTime('00:00', true), '12:00 AM');
});

test('12h: 23:59 → 11:59 PM', () => {
  assertEqual(formatTime('23:59', true), '11:59 PM');
});

test('strips label before formatting: "17:57 (PKT)" → 5:57 PM (12h)', () => {
  assertEqual(formatTime('17:57 (PKT)', true), '5:57 PM');
});

test('strips label before formatting: "17:57 (PKT)" → 17:57 (24h)', () => {
  assertEqual(formatTime('17:57 (PKT)', false), '17:57');
});

// ── getNextPrayer ─────────────────────────────────────────────────────────────
console.log('\ngetNextPrayer');

const SAMPLE_TIMINGS = {
  Fajr:    '05:00',
  Sunrise: '06:30',
  Dhuhr:   '12:00',
  Asr:     '15:30',
  Maghrib: '18:00',
  Isha:    '19:30'
};
const DATE = '2025-06-15';

function baghdadTime(hh, mm) {
  // Create a Date that represents HH:MM Baghdad time on DATE
  return new Date(`${DATE}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00+03:00`);
}

test('before Fajr → returns Fajr', () => {
  const now = baghdadTime(4, 0);
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  assertEqual(result.name, 'Fajr');
});

test('after Fajr before Dhuhr → returns Dhuhr (Sunrise skipped)', () => {
  const now = baghdadTime(7, 0); // after Sunrise 06:30
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  assertEqual(result.name, 'Dhuhr');
});

test('exactly at Fajr time → Fajr NOT returned (> not >=), returns Dhuhr', () => {
  const now = baghdadTime(5, 0); // exactly Fajr
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  // t > now is strict, so at exactly Fajr it's not next — next is Dhuhr
  assertEqual(result.name, 'Dhuhr');
});

test('after Dhuhr → returns Asr', () => {
  const now = baghdadTime(13, 0);
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  assertEqual(result.name, 'Asr');
});

test('after Asr → returns Maghrib', () => {
  const now = baghdadTime(16, 0);
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  assertEqual(result.name, 'Maghrib');
});

test('after Maghrib → returns Isha', () => {
  const now = baghdadTime(18, 30);
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  assertEqual(result.name, 'Isha');
});

test('after Isha → returns null', () => {
  const now = baghdadTime(20, 0);
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  assertEqual(result, null);
});

test('returned time is a Date object', () => {
  const now = baghdadTime(4, 0);
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE, now);
  assert(result.time instanceof Date, 'time should be a Date');
  assert(!isNaN(result.time.getTime()), 'time should be valid');
});

test('uses current time when now omitted', () => {
  // Just verify it returns a non-error result
  const result = getNextPrayer(SAMPLE_TIMINGS, DATE);
  // After all prayers for a past date → null; either way no exception
  assert(result === null || typeof result.name === 'string');
});

// ── tomorrowBaghdad ───────────────────────────────────────────────────────────
console.log('\ntomorrowBaghdad');

test('returns a string in YYYY-MM-DD format', () => {
  const tomorrow = tomorrowBaghdad();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(tomorrow), `not YYYY-MM-DD: ${tomorrow}`);
});

test('is exactly one day after todayBaghdad', () => {
  const { todayBaghdad } = globalThis.window.PrayerLogic;
  const today = todayBaghdad();
  const tomorrow = tomorrowBaghdad();
  const todayMs = new Date(today + 'T00:00:00Z').getTime();
  const tomorrowMs = new Date(tomorrow + 'T00:00:00Z').getTime();
  assertEqual(tomorrowMs - todayMs, 86400000, 'difference should be exactly 1 day (86400000 ms)');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
