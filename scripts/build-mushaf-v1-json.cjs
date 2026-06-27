/**
 * Fetch all 604 Mushaf pages from the quran.com API and build mushaf-v1-pages.json.
 * Uses code_v1 (QPC V1 glyph encoding) + line_number from the live API.
 *
 * Output structure matches mushaf-v4-pages.json exactly, with code_v1 instead of code_v2.
 * Each entry: { verses: [ { verse_key, verse_number, words: [{code_v1, line_number}] } ] }
 *
 * Run: node scripts/build-mushaf-v1-json.cjs
 * Resume-safe: reads existing partial output and skips already-fetched pages.
 * Rate: 3 concurrent requests (polite to quran.com API).
 */

'use strict';
const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const API_BASE  = 'https://api.quran.com/api/v4/verses/by_page';
const OUT_FILE  = path.join(__dirname, '..', 'src', 'data', 'mushaf-v1-pages.json');
const PAGES     = 604;
const CONCURR   = 3;
const MAX_RETRY = 4;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000, headers: { 'User-Agent': 'TafsirKurd-DataBuilder/1.0' } }, res => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch(e) { reject(new Error('JSON parse: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchPageWithRetry(pageNum) {
  const url = API_BASE + '/' + pageNum
    + '?words=true&word_fields=code_v1,line_number&per_page=300&mushaf=1';
  let lastErr;
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      const json = await fetchJSON(url);
      const verses = (json.verses || []).map(v => {
        const sn = parseInt((v.verse_key || '0:0').split(':')[0]);
        const words = (v.words || [])
          .filter(w => w.code_v1 && w.char_type_name !== 'end')
          .map(w => ({ code_v1: w.code_v1, line_number: w.line_number }));
        return {
          verse_key:    v.verse_key,
          verse_number: v.verse_number,
          words
        };
      }).filter(v => v.words.length > 0);
      if (!verses.length) throw new Error('no verses returned');
      return { verses };
    } catch(e) {
      lastErr = e;
      const delay = 1000 * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function run() {
  const startTime = Date.now();

  // Load existing partial output for resume capability
  let pages = new Array(PAGES).fill(null);
  if (fs.existsSync(OUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      if (Array.isArray(existing)) {
        for (let i = 0; i < Math.min(existing.length, PAGES); i++) {
          if (existing[i] && existing[i].verses && existing[i].verses.length) {
            pages[i] = existing[i];
          }
        }
        const loaded = pages.filter(Boolean).length;
        if (loaded > 0) console.log('Resuming: ' + loaded + ' pages already fetched.');
      }
    } catch(e) { console.log('Could not read existing output, starting fresh.'); }
  }

  const queue = [];
  for (let p = 1; p <= PAGES; p++) {
    if (!pages[p - 1]) queue.push(p);
  }

  console.log('Building mushaf-v1-pages.json: ' + queue.length + ' pages to fetch');
  console.log('API: ' + API_BASE + ' | Concurrency: ' + CONCURR + '\n');

  const results = { ok: 0, fail: 0, failPages: [] };
  let saveTimer = null;

  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const out = JSON.stringify(pages);
      fs.writeFileSync(OUT_FILE, out);
    }, 2000);
  }

  async function worker() {
    while (queue.length) {
      const pageNum = queue.shift();
      try {
        const data = await fetchPageWithRetry(pageNum);
        pages[pageNum - 1] = data;
        results.ok++;
        process.stdout.write('+');
        scheduleSave();
      } catch(e) {
        results.fail++;
        results.failPages.push(pageNum);
        process.stdout.write('!');
        console.error('\n  FAIL page ' + pageNum + ': ' + e.message);
      }
      const done = results.ok + results.fail;
      if (done % 50 === 0) {
        const pct = Math.round((done + (PAGES - queue.length - done)) / PAGES * 100);
        process.stdout.write(' [' + (PAGES - queue.length) + '/' + PAGES + ']\n');
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURR }, () => worker()));
  process.stdout.write('\n');

  // Final save
  if (saveTimer) clearTimeout(saveTimer);
  fs.writeFileSync(OUT_FILE, JSON.stringify(pages));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const complete = pages.filter(p => p && p.verses && p.verses.length).length;

  // Validate
  const errors = [];
  for (let i = 0; i < PAGES; i++) {
    if (!pages[i] || !pages[i].verses || !pages[i].verses.length) {
      errors.push('page ' + (i + 1) + ': missing');
    } else {
      const allHaveCode = pages[i].verses.every(v => v.words.every(w => w.code_v1));
      if (!allHaveCode) errors.push('page ' + (i + 1) + ': missing code_v1 in some words');
      const allHaveLine = pages[i].verses.every(v => v.words.every(w => w.line_number));
      if (!allHaveLine) errors.push('page ' + (i + 1) + ': missing line_number in some words');
    }
  }

  console.log('\n── Result ──────────────────────────────');
  console.log('Fetched     : ' + results.ok);
  console.log('Failed      : ' + results.fail + (results.failPages.length ? ' — pages: ' + results.failPages.join(', ') : ''));
  console.log('Complete    : ' + complete + ' / ' + PAGES);
  console.log('Errors      : ' + errors.length);
  if (errors.length) errors.slice(0, 10).forEach(e => console.error('  ' + e));
  console.log('File size   : ' + (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2) + ' MB');
  console.log('Output      : ' + OUT_FILE);
  console.log('Time        : ' + elapsed + 's');

  if (results.fail > 0 || complete < PAGES) {
    console.error('\nIncomplete! Re-run to retry failed pages.');
    process.exit(1);
  }
  console.log('\nmushaf-v1-pages.json built successfully. All ' + PAGES + ' pages present.');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
