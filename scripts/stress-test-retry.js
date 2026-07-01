/**
 * Stress test: retry_batch duplicate-delivery verification
 *
 * Simulates the retry pipeline with 1,000 tokens and multiple concurrent
 * retry_failed invocations.  No real network or DB required — every
 * external call is replaced by an in-memory mock that records what was
 * sent and enforces the exact same ordering guarantees as the real code.
 *
 * Run:  node scripts/stress-test-retry.js
 *
 * Three scenarios:
 *   A) Single retry of 1,000 failed tokens — verifies non-overlap
 *   B) Concurrent retries (current code) — exposes duplicate-send bug
 *   C) Concurrent retries (fixed code with claim step) — proves the fix
 */

'use strict';

// ── Shared in-memory delivery log ─────────────────────────────────────────
// sendCount tracks how many times each token was actually sent to FCM/APNs.
// In production a count > 1 means the user received a duplicate notification.

function makeDeliveryLog(tokens) {
    const log = new Map();
    for (const t of tokens) {
        log.set(t.token, { status: 'failed', sendCount: 0, platform: t.platform });
    }
    return log;
}

// ── Mock sendBatch ─────────────────────────────────────────────────────────
// Records each send; does NOT read or update the delivery log (mirrors real
// sendBatch, which sends first and writes the log after all sends complete).

async function mockSendBatch(deliveryLog, notifTokens) {
    for (const t of notifTokens) {
        const entry = deliveryLog.get(t.token);
        if (entry) entry.sendCount++;
    }
    // Simulate async I/O latency (10–50 ms per batch)
    await sleep(10 + Math.random() * 40);
    return { sent: notifTokens.length, failed: 0, stale: 0 };
}

// ── Atomic claim step (PostgreSQL UPDATE … RETURNING equivalent) ──────────
// Only tokens currently in ('failed','pending') are claimed and returned.
// Concurrent callers get disjoint sets because JS is single-threaded —
// the Set mutation and the return are never interleaved by two callers at
// the same microtask checkpoint.  In Postgres this is guaranteed by
// row-level locking on the UPDATE.

function atomicClaim(deliveryLog, tokenList) {
    const claimed = [];
    for (const t of tokenList) {
        const entry = deliveryLog.get(t.token);
        if (entry && (entry.status === 'failed' || entry.status === 'pending')) {
            entry.status = 'retrying';   // mark claimed atomically
            claimed.push(t);
        }
    }
    return claimed;
}

// ── Simulate retry_batch (CURRENT code — no claim step) ───────────────────

async function retryBatchCurrent(deliveryLog, tokens) {
    // Current code: sends to every token it receives, no pre-send check
    const result = await mockSendBatch(deliveryLog, tokens);
    // Update log after sends (mirrors upsert_delivery_results RPC)
    for (const t of tokens) {
        const entry = deliveryLog.get(t.token);
        if (entry) entry.status = 'sent';
    }
    return result;
}

// ── Simulate retry_batch (FIXED code — with atomic claim step) ────────────

async function retryBatchFixed(deliveryLog, tokens) {
    // Claim step: only send to tokens we atomically transitioned from
    // failed/pending → retrying.  Tokens already claimed by a concurrent
    // invocation are silently skipped.
    const claimed = atomicClaim(deliveryLog, tokens);
    if (!claimed.length) return { sent: 0, failed: 0, stale: 0, skipped: tokens.length };

    const result = await mockSendBatch(deliveryLog, claimed);
    // Update log for claimed tokens
    for (const t of claimed) {
        const entry = deliveryLog.get(t.token);
        if (entry) entry.status = 'sent';
    }
    return result;
}

// ── Simulate retry_failed ─────────────────────────────────────────────────
// Takes a DB-snapshot of the log at invocation time (mirrors the real
// SELECT that happens before any batch is dispatched), then slices and
// fans out to retry_batch sub-invocations concurrently.

async function retryFailed(deliveryLog, retryBatchFn, label) {
    // Read snapshot — this is the exact moment two concurrent calls diverge:
    // both see the same failed rows before either updates the log.
    const snapshot = [...deliveryLog.entries()]
        .filter(([, v]) => v.status === 'failed' || v.status === 'pending')
        .map(([token, v]) => ({ token, platform: v.platform }));

    if (!snapshot.length) return { retried: 0, sent: 0 };

    const RETRY_PAGE = 35;
    const totalBatches = Math.ceil(snapshot.length / RETRY_PAGE);

    const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
        const slice = snapshot.slice(i * RETRY_PAGE, (i + 1) * RETRY_PAGE);
        return retryBatchFn(deliveryLog, slice);
    });

    const results = await Promise.all(batchPromises);
    const totalSent = results.reduce((s, r) => s + (r.sent ?? 0), 0);

    console.log(`  [${label}] snapshot=${snapshot.length} batches=${totalBatches} sent=${totalSent}`);
    return { retried: snapshot.length, sent: totalSent };
}

// ── Assertion helpers ──────────────────────────────────────────────────────

function assertNoDuplicates(deliveryLog, scenario) {
    let duplicates = 0;
    let maxCount = 0;
    for (const [, entry] of deliveryLog) {
        if (entry.sendCount > 1) duplicates++;
        if (entry.sendCount > maxCount) maxCount = entry.sendCount;
    }
    const pass = duplicates === 0;
    const icon = pass ? '✓' : '✗';
    console.log(`  ${icon} Duplicate sends: ${duplicates} / ${deliveryLog.size}  (max sendCount=${maxCount})  [${scenario}]`);
    return pass;
}

function assertFullCoverage(deliveryLog, expectedCount, scenario) {
    const sent = [...deliveryLog.values()].filter(e => e.sendCount > 0).length;
    const pass = sent === expectedCount;
    const icon = pass ? '✓' : '✗';
    console.log(`  ${icon} Tokens reached: ${sent} / ${expectedCount}  [${scenario}]`);
    return pass;
}

function assertSlicesNonOverlapping(tokenCount, pageSize) {
    const tokens = Array.from({ length: tokenCount }, (_, i) => ({ token: `t${i}` }));
    const batches = Math.ceil(tokenCount / pageSize);
    const seen = new Set();
    for (let i = 0; i < batches; i++) {
        const slice = tokens.slice(i * pageSize, (i + 1) * pageSize);
        for (const t of slice) {
            if (seen.has(t.token)) return false;
            seen.add(t.token);
        }
    }
    return seen.size === tokenCount;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeTokens(n) {
    return Array.from({ length: n }, (_, i) => ({
        token: `tok_${String(i).padStart(5, '0')}`,
        platform: i % 3 === 0 ? 'ios' : 'android',
    }));
}

// ── SCENARIO A: Single retry, 1,000 tokens ─────────────────────────────────

async function scenarioA() {
    console.log('\n─── Scenario A: Single retry_failed, 1,000 failed tokens ───');

    // Verify slice non-overlap algebraically (no DB needed)
    const noOverlap = assertSlicesNonOverlapping(1000, 35);
    console.log(`  ${noOverlap ? '✓' : '✗'} Slice non-overlap (algebraic): batches=${Math.ceil(1000/35)}, every token appears exactly once`);

    const tokens = makeTokens(1000);
    const log = makeDeliveryLog(tokens);

    await retryFailed(log, retryBatchCurrent, 'single-retry');

    const noDups = assertNoDuplicates(log, 'single retry');
    const fullCov = assertFullCoverage(log, 1000, 'single retry');

    console.log(`  ${noDups && fullCov ? 'PASS' : 'FAIL'} — Scenario A`);
    return noDups && fullCov;
}

// ── SCENARIO B: Two concurrent retry_failed calls, CURRENT code ───────────
// Both read the same DB snapshot → both dispatch all 1,000 tokens →
// every token receives two notifications.

async function scenarioB() {
    console.log('\n─── Scenario B: Concurrent retry_failed × 2, CURRENT code (no claim step) ───');
    console.log('  Expect: ~1,000 duplicate sends (every token sent twice)');

    const tokens = makeTokens(1000);
    const log = makeDeliveryLog(tokens);

    // Both retries start at the same time — they read the same snapshot
    await Promise.all([
        retryFailed(log, retryBatchCurrent, 'concurrent-A'),
        retryFailed(log, retryBatchCurrent, 'concurrent-B'),
    ]);

    const noDups = assertNoDuplicates(log, 'concurrent retries (current)');
    const fullCov = assertFullCoverage(log, 1000, 'concurrent retries (current)');

    // This scenario SHOULD fail (duplicates expected)
    if (!noDups) console.log('  ← Confirmed: duplicate delivery is a real risk with the current code.');
    console.log(`  ${noDups ? 'PASS (unexpected)' : 'CONFIRMED BUG'} — Scenario B`);
    return !noDups; // we WANT this to expose duplicates, so returning true means "bug confirmed"
}

// ── SCENARIO C: Two concurrent retry_failed calls, FIXED code ─────────────
// Each retry_batch atomically claims tokens before sending.
// The first claimer sends; the second gets zero tokens for every overlap.

async function scenarioC() {
    console.log('\n─── Scenario C: Concurrent retry_failed × 2, FIXED code (with claim step) ───');
    console.log('  Expect: 0 duplicates, all 1,000 tokens reached exactly once');

    const tokens = makeTokens(1000);
    const log = makeDeliveryLog(tokens);

    await Promise.all([
        retryFailed(log, retryBatchFixed, 'fixed-A'),
        retryFailed(log, retryBatchFixed, 'fixed-B'),
    ]);

    const noDups = assertNoDuplicates(log, 'concurrent retries (fixed)');
    const fullCov = assertFullCoverage(log, 1000, 'concurrent retries (fixed)');

    console.log(`  ${noDups && fullCov ? 'PASS' : 'FAIL'} — Scenario C`);
    return noDups && fullCov;
}

// ── SCENARIO D: Failed sub-fetch cannot cause re-send of same tokens ───────
// Simulate batch 3 of 5 timing out — tokens in that batch stay failed/pending.
// The other batches complete normally. No batch re-runs automatically.

async function scenarioD() {
    console.log('\n─── Scenario D: One retry_batch sub-invocation fails (network timeout) ───');
    console.log('  Expect: 0 duplicates, tokens in failed batch stay pending, others reach sent');

    const RETRY_PAGE = 35;
    const tokens = makeTokens(175); // 5 exact batches of 35
    const log = makeDeliveryLog(tokens);

    const snapshot = tokens.map(t => ({ token: t.token, platform: t.platform }));
    const totalBatches = Math.ceil(snapshot.length / RETRY_PAGE);

    const FAILING_BATCH = 2; // 0-indexed — batch index 2 will "fail"
    let failCount = 0;

    const batchPromises = Array.from({ length: totalBatches }, (_, i) => {
        const slice = snapshot.slice(i * RETRY_PAGE, (i + 1) * RETRY_PAGE);
        if (i === FAILING_BATCH) {
            // Simulate network failure — returns {} just like the real .catch(() => ({}))
            console.log(`  [batch ${i}] simulated network failure`);
            failCount++;
            return Promise.resolve({});
        }
        return retryBatchCurrent(log, slice);
    });

    await Promise.all(batchPromises);

    const pendingCount = [...log.values()].filter(e => e.status === 'failed').length;
    const sentCount    = [...log.values()].filter(e => e.status === 'sent').length;
    const dupSends     = [...log.values()].filter(e => e.sendCount > 1).length;

    console.log(`  ✓ Batches that failed: ${failCount} (batch index ${FAILING_BATCH})`);
    console.log(`  ✓ Tokens sent: ${sentCount}  (expected ${175 - RETRY_PAGE})`);
    console.log(`  ✓ Tokens still failed (will retry next call): ${pendingCount}  (expected ${RETRY_PAGE})`);
    console.log(`  ${dupSends === 0 ? '✓' : '✗'} Duplicate sends from failed batch: ${dupSends}  (expected 0)`);

    const pass = dupSends === 0 && pendingCount === RETRY_PAGE && sentCount === 175 - RETRY_PAGE;
    console.log(`  ${pass ? 'PASS' : 'FAIL'} — Scenario D`);
    return pass;
}

// ── SCENARIO E: Five concurrent retries (stress) ──────────────────────────

async function scenarioE() {
    console.log('\n─── Scenario E: Five concurrent retry_failed calls, FIXED code ───');
    console.log('  Expect: 0 duplicates across all 1,000 tokens');

    const tokens = makeTokens(1000);
    const log = makeDeliveryLog(tokens);

    await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
            retryFailed(log, retryBatchFixed, `stress-${i}`)
        )
    );

    const noDups = assertNoDuplicates(log, '5x concurrent retries (fixed)');
    const fullCov = assertFullCoverage(log, 1000, '5x concurrent retries (fixed)');

    console.log(`  ${noDups && fullCov ? 'PASS' : 'FAIL'} — Scenario E`);
    return noDups && fullCov;
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {
    console.log('=== retry_batch duplicate-delivery stress test ===\n');
    console.log('Claim 1: Within one retry_failed call, each token appears in exactly one batch.');
    console.log('Claim 2: A failed sub-invocation cannot cause re-send of the same tokens.');
    console.log('Claim 3: Concurrent retry_failed calls cannot duplicate sends.\n');

    const a = await scenarioA();
    const b = await scenarioB(); // returns true if bug is confirmed (expected)
    const c = await scenarioC();
    const d = await scenarioD();
    const e = await scenarioE();

    console.log('\n=== Summary ===');
    console.log(`Claim 1 — ${a ? 'VERIFIED' : 'FAILED'}: slices are non-overlapping within one call`);
    console.log(`Claim 2 — ${d ? 'VERIFIED' : 'FAILED'}: failed sub-fetch does not re-send tokens`);
    console.log(`Claim 3 — ${b ? 'BUG CONFIRMED in current code' : 'could not reproduce'}: concurrent calls duplicate sends without claim step`);
    console.log(`Fix      — ${c && e ? 'VERIFIED' : 'FAILED'}: atomic claim step eliminates all duplicates`);

    const exitCode = (a && b && c && d && e) ? 0 : 1;
    console.log(`\nExit code: ${exitCode} (0 = all scenarios matched expectations)`);
    process.exit(exitCode);
})();
