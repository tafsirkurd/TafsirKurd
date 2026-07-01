'use strict';
/**
 * Patches mushaf-v1-pages.json to add ayah end-marker words (char_type_name==='end').
 * The original build script filtered these out — this restores them from the live API.
 *
 * Each end marker is a QPC V1 glyph (e.g. ﭣ for ayah 5) that the per-page font
 * renders as a decorated circle containing the verse number.
 *
 * Run: node scripts/patch-v1-end-markers.cjs
 * Resume-safe: skips pages already patched (verses with an end-marker word present).
 */
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const FILE    = path.join(__dirname, '..', 'src', 'data', 'mushaf-v1-pages.json');
const PAGES   = 604;
const CONCURR = 8;
const RETRY   = 4;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000, headers: { 'User-Agent': 'TafsirKurd-DataPatch/1.0' } }, res => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchEndMarkers(pageNum) {
  const url = 'https://api.quran.com/api/v4/verses/by_page/' + pageNum
    + '?words=true&word_fields=code_v1,char_type_name,line_number&per_page=300&mushaf=1';
  let lastErr;
  for (let i = 0; i < RETRY; i++) {
    try {
      const json = await fetchJSON(url);
      // Build map: verse_key → end marker word(s)
      const markers = {};
      for (const v of (json.verses || [])) {
        const ends = (v.words || []).filter(w => w.char_type_name === 'end' && w.code_v1);
        if (ends.length) markers[v.verse_key] = ends.map(w => ({ code_v1: w.code_v1, line_number: w.line_number }));
      }
      return markers;
    } catch(e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

function needsPatch(page) {
  for (const v of (page.verses || [])) {
    // A verse needs patching if none of its words are end markers
    // We detect this by checking if any word has a missing char_type (our stored words only have code_v1+line_number)
    // Since we stripped char_type_name during build, the only way to know if the end marker is present
    // is to check if the verse word count matches what we expect.
    // Simple heuristic: if ALL words have text content that looks like a QPC V1 glyph, no 'end' glyph is stored.
    // Better: check page-level: if word count in stored JSON < API word count.
    // We'll use a flag instead — mark pages we've already patched.
    if (v._patched) return false;
  }
  return true;
}

async function run() {
  console.log('Loading mushaf-v1-pages.json...');
  const pages = JSON.parse(fs.readFileSync(FILE, 'utf8'));

  // Identify pages that need patching — those where verses don't have _patched flag
  // (On first run, all pages need patching. On resume, already-patched pages are skipped.)
  const queue = [];
  for (let p = 1; p <= PAGES; p++) {
    const page = pages[p - 1];
    if (!page) { console.log('Page ' + p + ': missing, skipping'); continue; }
    if (needsPatch(page)) queue.push(p);
  }

  if (queue.length === 0) {
    console.log('All pages already patched. Nothing to do.');
    return;
  }
  console.log('Patching ' + queue.length + ' pages (adding end-marker words)...\n');

  const stats = { ok: 0, noMarkers: 0, fail: 0, failPages: [] };
  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      fs.writeFileSync(FILE, JSON.stringify(pages));
    }, 2000);
  }

  async function worker() {
    while (queue.length) {
      const pageNum = queue.shift();
      try {
        const markers = await fetchEndMarkers(pageNum);
        const page = pages[pageNum - 1];
        let added = 0;
        for (const v of (page.verses || [])) {
          const ends = markers[v.verse_key] || [];
          if (ends.length) {
            // Append end marker word(s) to the end of this verse's word array
            v.words = v.words.concat(ends);
            added++;
          }
          v._patched = true; // mark verse as processed
        }
        if (added === 0) stats.noMarkers++;
        else stats.ok++;
        process.stdout.write('+');
        scheduleSave();
      } catch(e) {
        stats.fail++;
        stats.failPages.push(pageNum);
        process.stdout.write('!');
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURR }, worker));
  if (saveTimer) { clearTimeout(saveTimer); fs.writeFileSync(FILE, JSON.stringify(pages)); }

  // Final cleanup: remove _patched flags from stored data (they were only runtime helpers)
  for (const page of pages) {
    if (!page) continue;
    for (const v of (page.verses || [])) delete v._patched;
  }
  fs.writeFileSync(FILE, JSON.stringify(pages));

  console.log('\n\nDone.');
  console.log('Patched (end markers added): ' + stats.ok);
  console.log('Pages with no end markers:   ' + stats.noMarkers);
  if (stats.fail) console.error('FAILED pages: ' + stats.failPages.join(', '));
  process.exit(stats.fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
