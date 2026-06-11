// Rebuilds mushaf-v4-pages.json page assignment from the glyph-code structure.
//
// BUG: the source generator bucketed verses to pages incorrectly around every
// page boundary (sometimes whole spanning verses on the wrong neighbor, on late
// pages a systematic shift). Result: 5 pages render fallback soup, ~14 silently
// render duplicate/wrong glyphs, ~19 are missing words.
//
// PRINCIPLE: QCF page fonts allocate codepoints sequentially per page starting
// at ~0xFC41. So the TRUE page of every word is recoverable from the data
// itself: sort all verses in mushaf order, walk the code stream, and start a
// new page at every code restart (large drop back to the 0xFC41 region).
// Verses split across pages are split at the restart point. No Quran text,
// codes, or line numbers are altered — only which page each word renders on.
//
// VALIDATION (hard-fails the write):
//   • per page: zero EXTRA codes (not in font cmap), zero DUPLICATE codes
//   • global: word count and concatenated code stream identical to input
//   • exactly 604 pages reconstructed
import { readFileSync, writeFileSync } from 'fs';
import wawoff2mod from 'wawoff2';
const wawoff2 = wawoff2mod.default || wawoff2mod;

const SRC = 'C:/TafsirKurd/src/data/mushaf-v4-pages.json';
const data = JSON.parse(readFileSync(SRC, 'utf8'));

function cmapSet(ttf) {
  const dv = new DataView(ttf.buffer, ttf.byteOffset, ttf.byteLength);
  const numTables = dv.getUint16(4);
  let cmapOff = -1;
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    const tag = String.fromCharCode(ttf[o], ttf[o+1], ttf[o+2], ttf[o+3]);
    if (tag === 'cmap') { cmapOff = dv.getUint32(o + 8); break; }
  }
  const n = dv.getUint16(cmapOff + 2);
  let best = -1;
  for (let i = 0; i < n; i++) {
    const subOff = cmapOff + dv.getUint32(cmapOff + 4 + i * 8 + 4);
    if (dv.getUint16(subOff) === 4) { best = subOff; break; }
  }
  const segCountX2 = dv.getUint16(best + 6), segCount = segCountX2 / 2;
  const set = new Set();
  for (let i = 0; i < segCount; i++) {
    const end = dv.getUint16(best + 14 + i * 2);
    const start = dv.getUint16(best + 16 + segCountX2 + i * 2);
    if (start === 0xFFFF) continue;
    for (let c = start; c <= end; c++) if (c >= 0xFB00) set.add(c);
  }
  return set;
}

console.error('loading 604 font cmaps...');
const band = [];
for (let p = 1; p <= 604; p++) {
  band[p] = cmapSet(Buffer.from(await wawoff2.decompress(
    readFileSync(`C:/TafsirKurd/src/assets/fonts/qcf4/p${p}.woff2`))));
}

const keyOrder = k => { const [s, a] = k.split(':').map(Number); return s * 10000 + a; };
const firstCode = w => { for (const ch of (w.code_v2 || '')) { const c = ch.codePointAt(0); if (c >= 0xFB00) return c; } return null; };

// ── flatten: all verses in strict mushaf order, preserving objects ──
const flat = [];
data.forEach(pg => (pg.verses || []).forEach(v => flat.push(v)));
flat.sort((a, b) => keyOrder(a.verse_key) - keyOrder(b.verse_key));

// input fingerprints for the no-content-change check
const inWordCount = flat.reduce((s, v) => s + (v.words || []).length, 0);
const inStream = [];
flat.forEach(v => (v.words || []).forEach(w => { const c = firstCode(w); if (c !== null) for (const ch of w.code_v2) { const cc = ch.codePointAt(0); if (cc >= 0xFB00) inStream.push(cc); } }));

// ── walk the code stream, assigning pages at restarts ──
// Within a true page the code stream is strictly ascending (one glyph slot per
// word, sequential). ANY decrease therefore marks a page restart.
const newPages = Array.from({ length: 605 }, () => []); // [page] -> verse entries
let P = 1, prev = 0;
const lastCode = w => { let last = null; for (const ch of (w.code_v2 || '')) { const c = ch.codePointAt(0); if (c >= 0xFB00) last = c; } return last; };
for (const v of flat) {
  let cur = null; // current page's partial verse entry
  for (const w of (v.words || [])) {
    const c = firstCode(w);
    if (c !== null) {
      if (prev && c < prev) { P++; cur = null; }
      prev = lastCode(w);
    }
    if (!cur) {
      cur = { ...v, words: [] };
      newPages[P].push(cur);
    }
    cur.words.push(w);
  }
  if (!(v.words || []).length) { newPages[P].push({ ...v, words: [] }); }
}

console.error('pages reconstructed:', P);
if (P !== 604) { console.error('FATAL: expected 604 pages, got ' + P); process.exit(1); }

// ── validation ──
let fail = 0;
const holes = [];
for (let p = 1; p <= 604; p++) {
  const used = new Map();
  newPages[p].forEach(v => (v.words || []).forEach(w => { for (const ch of (w.code_v2 || '')) { const c = ch.codePointAt(0); if (c >= 0xFB00) used.set(c, (used.get(c) || 0) + 1); } }));
  const extra = [...used.keys()].filter(c => !band[p].has(c));
  const dup = [...used.entries()].filter(([, n]) => n > 1);
  const hole = [...band[p]].filter(c => !used.has(c) && c !== 0xFB50);
  if (extra.length || dup.length) { fail++; console.error(`FAIL p${p}: extra=${extra.length} dup=${dup.length}`); }
  if (hole.length) holes.push(`p${p}:${hole.length}`);
}
const outWordCount = newPages.flat().reduce((s, v) => s + (v.words || []).length, 0);
const outStream = [];
for (let p = 1; p <= 604; p++) newPages[p].forEach(v => (v.words || []).forEach(w => { for (const ch of (w.code_v2 || '')) { const c = ch.codePointAt(0); if (c >= 0xFB00) outStream.push(c); } }));
if (outWordCount !== inWordCount) { fail++; console.error(`FAIL: word count ${inWordCount} -> ${outWordCount}`); }
if (outStream.length !== inStream.length || outStream.some((c, i) => c !== inStream[i])) { fail++; console.error('FAIL: code stream changed'); }

console.error('residual holes (unused font glyphs, e.g. bismillah slots):', holes.join(' ') || 'none');
if (fail) { console.error('VALIDATION FAILED — file NOT written'); process.exit(1); }

// ── emit in original shape ──
const out = data.map((pg, i) => ({ ...pg, verses: newPages[i + 1] }));
writeFileSync(SRC, JSON.stringify(out));
console.error('VALIDATION PASSED — extra=0 dup=0 on all 604 pages, content stream identical');
console.error('written:', SRC);
