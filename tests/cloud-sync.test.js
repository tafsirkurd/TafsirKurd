/**
 * Unit tests for src/utils/cloud-sync.js
 * Run with: node tests/cloud-sync.test.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── In-memory localStorage mock ───────────────────────────────────────────────
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem:    k      => store.has(k) ? store.get(k) : null,
    setItem:    (k, v) => store.set(k, String(v)),
    removeItem: k      => store.delete(k),
    clear:      ()     => store.clear(),
    _store:     store,
    _seed:      (k, v) => store.set(k, v),
  };
}

// ── Load the class into this Node.js context ──────────────────────────────────
function loadCloudSync() {
  const ls = makeLocalStorage();
  globalThis.window = { localStorage: ls };
  globalThis.localStorage = ls;

  const code = readFileSync(join(__dirname, '../src/utils/cloud-sync.js'), 'utf8');
  new Function(code)();

  const CloudSyncManager = globalThis.window.cloudSync.constructor;
  return { CloudSyncManager, ls };
}

const { CloudSyncManager, ls: rootLs } = loadCloudSync();

// ── Minimal test runner ───────────────────────────────────────────────────────
let passed = 0, failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  ✓ ${name}`);
        passed++;
      }).catch(e => {
        console.error(`  ✗ ${name}`);
        console.error(`    ${e.message}`);
        failed++;
      });
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
  return Promise.resolve();
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertDeepEqual(a, b, msg) {
  const as = JSON.stringify(a), bs = JSON.stringify(b);
  if (as !== bs) throw new Error(msg || `expected ${bs}, got ${as}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeSync(overrides = {}) {
  const s = new CloudSyncManager();
  Object.assign(s, overrides);
  return s;
}

// Build a mock Supabase that records calls and returns controlled responses
function makeSupabaseMock(responses = {}) {
  const calls = [];
  function chain(table) {
    const q = {
      _table: table,
      _action: null,
      _data: null,
      _filters: [],
      select(cols)    { q._action = 'select'; q._cols = cols; return q; },
      upsert(data, o) { q._action = 'upsert'; q._data = data; q._opts = o; return q; },
      delete()        { q._action = 'delete'; return q; },
      insert(data)    { q._action = 'insert'; q._data = data; return q; },
      eq(col, val)    { q._filters.push([col, val]); return q; },
      single()        {
        calls.push({ table, ...q });
        const key = `${table}.${q._action}`;
        const resp = responses[key] ?? { data: null, error: null };
        return Promise.resolve(typeof resp === 'function' ? resp(q._data, q._filters) : resp);
      },
      // .upsert().then() — upsert returns a thenable
      then(resolve, reject) {
        calls.push({ table, ...q });
        const key = `${table}.${q._action}`;
        const resp = responses[key] ?? { data: null, error: null };
        const val = typeof resp === 'function' ? resp(q._data, q._filters) : resp;
        return Promise.resolve(val).then(resolve, reject);
      }
    };
    return q;
  }
  return {
    from: (table) => chain(table),
    _calls: calls,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const tests = [];

// safeJsonParse ────────────────────────────────────────────────────────────────
tests.push(() => console.log('\nsafeJsonParse'));
tests.push(() => test('parses valid JSON array', () => {
  const s = makeSync();
  assertDeepEqual(s.safeJsonParse('[1,2,3]'), [1, 2, 3]);
}));

tests.push(() => test('parses valid JSON object', () => {
  const s = makeSync();
  assertDeepEqual(s.safeJsonParse('{"a":1}'), { a: 1 });
}));

tests.push(() => test('returns fallback for invalid JSON', () => {
  const s = makeSync();
  assertDeepEqual(s.safeJsonParse('not json', []), []);
}));

tests.push(() => test('returns fallback for null input', () => {
  const s = makeSync();
  assertDeepEqual(s.safeJsonParse(null, []), []);
}));

tests.push(() => test('returns fallback for empty string', () => {
  const s = makeSync();
  assertDeepEqual(s.safeJsonParse('', []), []);
}));

tests.push(() => test('custom fallback is respected', () => {
  const s = makeSync();
  assertDeepEqual(s.safeJsonParse(null, { default: true }), { default: true });
}));

// initialize ───────────────────────────────────────────────────────────────────
tests.push(() => console.log('\ninitialize'));
tests.push(() => test('returns false when supabase client is missing', async () => {
  const s = makeSync();
  const result = await s.initialize(null, 'uid-123');
  assertEqual(result, false);
}));

tests.push(() => test('returns false when userId is missing', async () => {
  const s = makeSync();
  const result = await s.initialize({}, null);
  assertEqual(result, false);
}));

tests.push(() => test('sets userId and supabase on success', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock({ 'user_data.select': { data: null, error: { code: 'PGRST116' } } });
  const s = makeSync();
  s.startAutoSync = () => {}; // prevent real interval
  const result = await s.initialize(mock, 'uid-abc');
  assertEqual(result, true);
  assertEqual(s.userId, 'uid-abc');
  assert(s.supabase === mock);
  s.stopAutoSync();
}));

// syncAllToCloud — throttle guards ─────────────────────────────────────────────
tests.push(() => console.log('\nsyncAllToCloud throttle guards'));
tests.push(() => test('returns immediately when isSyncing=true', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock();
  const s = makeSync({ supabase: mock, userId: 'u1', isSyncing: true });
  await s.syncAllToCloud();
  assertEqual(mock._calls.length, 0, 'no Supabase calls should be made while syncing');
}));

tests.push(() => test('returns immediately when called too soon after last sync', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock();
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: Date.now() });
  await s.syncAllToCloud();
  assertEqual(mock._calls.length, 0, 'no Supabase calls should be made within MIN_SYNC_INTERVAL');
}));

tests.push(() => test('proceeds when enough time has elapsed', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock({ 'user_data.upsert': { error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: 0 });
  await s.syncAllToCloud();
  assert(mock._calls.length > 0, 'should call Supabase upsert');
}));

tests.push(() => test('resets isSyncing to false after success', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock({ 'user_data.upsert': { error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: 0 });
  await s.syncAllToCloud();
  assertEqual(s.isSyncing, false);
}));

tests.push(() => test('resets isSyncing to false after error', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock({ 'user_data.upsert': { error: { message: 'DB error' } } });
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: 0 });
  try { await s.syncAllToCloud(); } catch (_) {}
  assertEqual(s.isSyncing, false);
}));

// syncAllToCloud — data assembly ───────────────────────────────────────────────
tests.push(() => console.log('\nsyncAllToCloud data assembly'));
tests.push(() => test('reads bookmarks from localStorage as parsed array', async () => {
  const ls = makeLocalStorage();
  ls._seed('bookmarks', JSON.stringify([{ id: 1, surah: 2, ayah: 5 }]));
  globalThis.localStorage = ls;
  let captured = null;
  const mock = makeSupabaseMock({ 'user_data.upsert': (data) => { captured = data; return { error: null }; } });
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: 0 });
  await s.syncAllToCloud();
  assertDeepEqual(captured.bookmarks, [{ id: 1, surah: 2, ayah: 5 }]);
}));

tests.push(() => test('defaults bookmarks to [] when localStorage is empty', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  let captured = null;
  const mock = makeSupabaseMock({ 'user_data.upsert': (data) => { captured = data; return { error: null }; } });
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: 0 });
  await s.syncAllToCloud();
  assertDeepEqual(captured.bookmarks, []);
}));

tests.push(() => test('defaults currentSurah to 1 when not set', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  let captured = null;
  const mock = makeSupabaseMock({ 'user_data.upsert': (data) => { captured = data; return { error: null }; } });
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: 0 });
  await s.syncAllToCloud();
  assertEqual(captured.current_surah, 1);
}));

tests.push(() => test('reads currentSurah from localStorage', async () => {
  const ls = makeLocalStorage();
  ls._seed('currentSurah', '36');
  globalThis.localStorage = ls;
  let captured = null;
  const mock = makeSupabaseMock({ 'user_data.upsert': (data) => { captured = data; return { error: null }; } });
  const s = makeSync({ supabase: mock, userId: 'u1', lastSyncTime: 0 });
  await s.syncAllToCloud();
  assertEqual(captured.current_surah, 36);
}));

// loadAllFromCloud ─────────────────────────────────────────────────────────────
tests.push(() => console.log('\nloadAllFromCloud'));
tests.push(() => test('returns null for new user (PGRST116)', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock({ 'user_data.select': { data: null, error: { code: 'PGRST116' } } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  const result = await s.loadAllFromCloud();
  assertEqual(result, null);
}));

tests.push(() => test('returns null when data is null', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock({ 'user_data.select': { data: null, error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  const result = await s.loadAllFromCloud();
  assertEqual(result, null);
}));

tests.push(() => test('restores currentSurah to localStorage', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const cloudData = { current_surah: 18, current_ayah: 5, scroll_position: 200 };
  const mock = makeSupabaseMock({ 'user_data.select': { data: cloudData, error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.loadAllFromCloud();
  assertEqual(ls.getItem('currentSurah'), '18');
}));

tests.push(() => test('restores zero streak (0 is a valid value)', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const cloudData = { reading_streak: 0 };
  const mock = makeSupabaseMock({ 'user_data.select': { data: cloudData, error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.loadAllFromCloud();
  assertEqual(ls.getItem('readingStreak'), '0');
}));

tests.push(() => test('restores zero scroll_position (0 is valid)', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const cloudData = { scroll_position: 0 };
  const mock = makeSupabaseMock({ 'user_data.select': { data: cloudData, error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.loadAllFromCloud();
  assertEqual(ls.getItem('scrollPosition'), '0');
}));

tests.push(() => test('restores bookmarks array', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const bm = [{ id: 'bm1', surah: 36, ayah: 1 }];
  const cloudData = { bookmarks: bm };
  const mock = makeSupabaseMock({ 'user_data.select': { data: cloudData, error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.loadAllFromCloud();
  assertDeepEqual(JSON.parse(ls.getItem('bookmarks')), bm);
}));

tests.push(() => test('restores boolean show_translation as string "true"', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const cloudData = { show_translation: true, show_tafsir: false, auto_scroll: true };
  const mock = makeSupabaseMock({ 'user_data.select': { data: cloudData, error: null } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.loadAllFromCloud();
  assertEqual(ls.getItem('showTranslation'), 'true');
  assertEqual(ls.getItem('showTafsir'), 'false');
  assertEqual(ls.getItem('autoScroll'), 'true');
}));

tests.push(() => test('returns null on unexpected error', async () => {
  const ls = makeLocalStorage();
  globalThis.localStorage = ls;
  const mock = makeSupabaseMock({ 'user_data.select': { data: null, error: { code: 'UNEXPECTED', message: 'bang' } } });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  const result = await s.loadAllFromCloud();
  assertEqual(result, null);
}));

// saveBookmark ─────────────────────────────────────────────────────────────────
tests.push(() => console.log('\nsaveBookmark'));
tests.push(() => test('appends new bookmark to existing list', async () => {
  const existing = [{ id: 'bm1', surah: 1, ayah: 1 }];
  const newBm    = { id: 'bm2', surah: 36, ayah: 1 };
  let upserted = null;
  const mock = makeSupabaseMock({
    'user_data.select': { data: { bookmarks: existing }, error: null },
    'user_data.upsert': (data) => { upserted = data; return { error: null }; }
  });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.saveBookmark(newBm);
  assertDeepEqual(upserted.bookmarks, [...existing, newBm]);
}));

tests.push(() => test('handles empty cloud bookmarks (new user)', async () => {
  const newBm = { id: 'bm1', surah: 2, ayah: 255 };
  let upserted = null;
  const mock = makeSupabaseMock({
    'user_data.select': { data: null, error: null },
    'user_data.upsert': (data) => { upserted = data; return { error: null }; }
  });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.saveBookmark(newBm);
  assertDeepEqual(upserted.bookmarks, [newBm]);
}));

// deleteBookmark ───────────────────────────────────────────────────────────────
tests.push(() => console.log('\ndeleteBookmark'));
tests.push(() => test('removes bookmark with matching id', async () => {
  const bm1 = { id: 'bm1', surah: 1, ayah: 1 };
  const bm2 = { id: 'bm2', surah: 2, ayah: 2 };
  let upserted = null;
  const mock = makeSupabaseMock({
    'user_data.select': { data: { bookmarks: [bm1, bm2] }, error: null },
    'user_data.upsert': (data) => { upserted = data; return { error: null }; }
  });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.deleteBookmark('bm1');
  assertDeepEqual(upserted.bookmarks, [bm2]);
}));

tests.push(() => test('no-op when bookmark id not found', async () => {
  const bm1 = { id: 'bm1', surah: 1, ayah: 1 };
  let upserted = null;
  const mock = makeSupabaseMock({
    'user_data.select': { data: { bookmarks: [bm1] }, error: null },
    'user_data.upsert': (data) => { upserted = data; return { error: null }; }
  });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.deleteBookmark('nonexistent');
  assertDeepEqual(upserted.bookmarks, [bm1]);
}));

tests.push(() => test('results in empty array when last bookmark deleted', async () => {
  const bm1 = { id: 'bm1', surah: 1, ayah: 1 };
  let upserted = null;
  const mock = makeSupabaseMock({
    'user_data.select': { data: { bookmarks: [bm1] }, error: null },
    'user_data.upsert': (data) => { upserted = data; return { error: null }; }
  });
  const s = makeSync({ supabase: mock, userId: 'u1' });
  await s.deleteBookmark('bm1');
  assertDeepEqual(upserted.bookmarks, []);
}));

// stopAutoSync / startAutoSync ─────────────────────────────────────────────────
tests.push(() => console.log('\nautoSync'));
tests.push(() => test('stopAutoSync clears the interval', () => {
  const s = makeSync();
  s.syncInterval = setInterval(() => {}, 99999);
  s.stopAutoSync();
  assertEqual(s.syncInterval, null);
}));

tests.push(() => test('startAutoSync sets syncInterval', () => {
  const s = makeSync({ supabase: {}, userId: 'u1' });
  s.syncAllToCloud = async () => {};
  s.startAutoSync();
  assert(s.syncInterval !== null, 'syncInterval should be set');
  s.stopAutoSync();
}));

// ── Run all tests ─────────────────────────────────────────────────────────────
async function main() {
  for (const t of tests) {
    await t();
  }
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
