#!/usr/bin/env node
/**
 * fetch-mushaf-v4-data.js
 *
 * One-time script: fetches all 604 Quran mushaf pages from api.quran.com
 * (mushaf=19, QPC Hafs Tajweed, code_v2 glyph encoding) and saves a compact
 * JSON bundle to src/data/mushaf-v4-pages.json.
 *
 * Run once before any release: node scripts/fetch-mushaf-v4-data.js
 * Re-run after quran.com data updates or when upgrading mushaf version.
 *
 * Output format (array, index 0 = page 1):
 *   [ { "verses": [ { "surah_number": N, "verse_number": N, "verse_key": "S:V",
 *                     "words": [ { "code_v2": "…", "line_number": N }, … ] } ] }, … ]
 *
 * Only the fields consumed by the QCF4 line renderer are kept.
 * Typical output size: ~3-5 MB (vs ~200 MB of full API responses).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const TOTAL_PAGES  = 604;
const MUSHAF_ID    = 19;
const CONCURRENCY  = 8;    // parallel requests (polite to quran.com)
const RETRY_MAX    = 3;
const RETRY_DELAY  = 1200; // ms between retries
const OUT_FILE     = path.join(__dirname, '..', 'src', 'data', 'mushaf-v4-pages.json');

const BASE_URL = 'https://api.quran.com/api/v4/verses/by_page';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(pageNum, attempt) {
  const url = `${BASE_URL}/${pageNum}?words=true&word_fields=code_v2&per_page=300&mushaf=${MUSHAF_ID}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // Extract only the fields used by the QCF4 renderer
  const compact = {
    verses: (json.verses || []).map(v => ({
      surah_number: v.surah_number,
      verse_number: v.verse_number,
      verse_key:    v.verse_key,
      words: (v.words || [])
        .filter(w => w.code_v2)
        .map(w => ({ code_v2: w.code_v2, line_number: w.line_number || 0 }))
    }))
  };
  return compact;
}

async function fetchPageWithRetry(pageNum) {
  for (let attempt = 1; attempt <= RETRY_MAX; attempt++) {
    try {
      return await fetchPage(pageNum, attempt);
    } catch (e) {
      if (attempt === RETRY_MAX) throw e;
      process.stderr.write(`  page ${pageNum} attempt ${attempt} failed: ${e.message} — retrying\n`);
      await sleep(RETRY_DELAY * attempt);
    }
  }
}

async function main() {
  // Check if fetch is available (Node 18+)
  if (typeof fetch === 'undefined') {
    console.error('Error: requires Node.js 18+ (built-in fetch).');
    console.error('Use: node --version to check, upgrade if needed.');
    process.exit(1);
  }

  console.log(`Fetching ${TOTAL_PAGES} pages (mushaf=${MUSHAF_ID}) from api.quran.com...`);
  console.log(`Concurrency: ${CONCURRENCY}  Output: ${path.relative(process.cwd(), OUT_FILE)}\n`);

  const results = new Array(TOTAL_PAGES);
  let done = 0;
  let failed = [];

  // Process in batches for controlled concurrency
  for (let batch = 0; batch < TOTAL_PAGES; batch += CONCURRENCY) {
    const pages = [];
    for (let i = batch; i < Math.min(batch + CONCURRENCY, TOTAL_PAGES); i++) {
      pages.push(i + 1); // pages are 1-indexed
    }
    const settled = await Promise.allSettled(pages.map(p => fetchPageWithRetry(p)));
    for (let i = 0; i < pages.length; i++) {
      const pageNum = pages[i];
      if (settled[i].status === 'fulfilled') {
        results[pageNum - 1] = settled[i].value;
        done++;
      } else {
        console.error(`  page ${pageNum} FAILED: ${settled[i].reason?.message}`);
        failed.push(pageNum);
        results[pageNum - 1] = { verses: [] }; // placeholder so array stays dense
      }
    }
    // Progress every 50 pages
    if (done % 50 === 0 || done === TOTAL_PAGES) {
      process.stdout.write(`  ${done}/${TOTAL_PAGES} pages fetched\r`);
    }
    // Brief pause between batches to be polite
    if (batch + CONCURRENCY < TOTAL_PAGES) await sleep(100);
  }

  console.log(`\n\nFetched: ${done} pages, Failed: ${failed.length}`);
  if (failed.length) console.warn('Failed pages:', failed.join(', '));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const json = JSON.stringify(results);
  fs.writeFileSync(OUT_FILE, json, 'utf8');

  const sizeKB = Math.round(json.length / 1024);
  console.log(`Saved: ${OUT_FILE} (${sizeKB} KB)`);

  if (failed.length > 0) {
    console.warn('\nSome pages failed. Re-run the script to retry failed pages,');
    console.warn('or those pages will fall back to API calls at runtime.');
    process.exit(1);
  }

  console.log('\nDone. Run `npm run cap:sync` to include this file in the next build.');
}

main().catch(err => { console.error(err); process.exit(1); });
