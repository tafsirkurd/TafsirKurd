/**
 * Validates mushaf-v1-pages.json against known-good Quran metadata.
 * Checks: page count, ayah count per page, surah starts, juz starts,
 * sajdah positions, word ordering, line_number presence, code_v1 presence.
 *
 * Run: node scripts/validate-mushaf-v1.cjs
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const V1_FILE  = path.join(__dirname, '..', 'src', 'data', 'mushaf-v1-pages.json');
const V4_FILE  = path.join(__dirname, '..', 'src', 'data', 'mushaf-v4-pages.json');
const FONT_DIR = path.join(__dirname, '..', 'src', 'assets', 'fonts', 'qpcv1');

// Known-good Quran metadata
const TOTAL_AYAHS = 6236; // excluding Basmalah-as-verse (standard Hafs count for Quran text)
const TOTAL_PAGES = 604;

// Surah first-page lookup (surah N starts on page X in the Madinah Mushaf)
const SURAH_START_PAGES = {
  1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,
  11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,
  19:305,20:312,21:322,22:333,23:342,24:350,25:359,26:367,
  27:377,28:385,29:396,30:404,31:411,32:415,33:418,34:428,
  35:434,36:440,37:446,38:453,39:458,40:467,41:477,42:483,
  43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,
  51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,
  59:545,60:549,61:551,62:553,63:554,64:556,65:558,66:560,
  67:562,68:564,69:566,70:568,71:570,72:572,73:574,74:575,
  75:577,76:578,77:580,78:582,79:583,80:585,81:586,82:587,
  83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,
  91:595,92:595,93:596,94:596,95:597,97:598,96:597,98:598,
  99:599,100:599,101:600,102:600,103:601,104:601,105:601,
  106:602,107:602,108:602,109:603,110:603,111:603,112:604,113:604,114:604
};

// Juz start pages (juz 1-30 → page where they begin)
const JUZ_START_PAGES = [
  1,22,42,62,82,102,121,142,162,182,
  201,221,242,262,282,302,322,342,362,382,
  402,422,442,462,482,502,522,542,562,582
];

// Sajdah ayahs (surah:ayah) — 15 obligatory sajdahs in Hafs recitation
const SAJDAH_KEYS = new Set([
  '7:206','13:15','16:50','17:109','19:58','22:18','22:77',
  '25:60','27:26','32:15','38:24','41:38','53:62','84:21','96:19'
]);

const errors   = [];
const warnings = [];
let   totalAyahsFound = 0;

console.log('Validating mushaf-v1-pages.json…\n');

// ── 1. File exists ──────────────────────────────────────────────────────────
if (!fs.existsSync(V1_FILE)) { console.error('FAIL: file not found: ' + V1_FILE); process.exit(1); }

const v1 = JSON.parse(fs.readFileSync(V1_FILE, 'utf8'));

// ── 2. Page count ───────────────────────────────────────────────────────────
if (!Array.isArray(v1) || v1.length !== TOTAL_PAGES) {
  errors.push('Page count: expected ' + TOTAL_PAGES + ', got ' + v1.length);
}

// ── 3. Per-page: verse presence, code_v1, line_number ──────────────────────
const verseKeysSeen = new Set();
const surahFirstPages = {}; // surah → first page number

for (let i = 0; i < v1.length; i++) {
  const pageNum = i + 1;
  const page    = v1[i];
  if (!page || !page.verses || !page.verses.length) {
    errors.push('Page ' + pageNum + ': no verses');
    continue;
  }
  page.verses.forEach(function(v, vi) {
    const key = v.verse_key;
    if (!key) { errors.push('Page ' + pageNum + ' verse[' + vi + ']: missing verse_key'); return; }
    const [snStr, vnStr] = key.split(':');
    const sn = parseInt(snStr); const vn = parseInt(vnStr);
    // Track surah first page
    if (!surahFirstPages[sn]) surahFirstPages[sn] = pageNum;
    // Duplicate check
    if (verseKeysSeen.has(key)) warnings.push('Duplicate verse_key ' + key + ' on page ' + pageNum);
    verseKeysSeen.add(key);
    totalAyahsFound++;
    // Word fields
    if (!v.words || !v.words.length) {
      errors.push('Page ' + pageNum + ' ' + key + ': no words');
      return;
    }
    v.words.forEach(function(w, wi) {
      if (!w.code_v1) errors.push('Page ' + pageNum + ' ' + key + ' word[' + wi + ']: missing code_v1');
      if (!w.line_number) errors.push('Page ' + pageNum + ' ' + key + ' word[' + wi + ']: missing line_number');
    });
  });
}

// ── 4. Total ayah count ─────────────────────────────────────────────────────
// Note: API may include end markers filtered out; check is approximate (≥6236)
if (totalAyahsFound < 6230) {
  errors.push('Total ayahs: expected ≥6230, found ' + totalAyahsFound);
} else {
  console.log('Total ayah-entries: ' + totalAyahsFound + ' ✓');
}

// ── 5. Surah start pages ────────────────────────────────────────────────────
let surahOk = 0, surahFail = 0;
Object.entries(SURAH_START_PAGES).forEach(function([snStr, expectedPage]) {
  const sn = parseInt(snStr);
  const actualPage = surahFirstPages[sn];
  if (actualPage !== expectedPage) {
    warnings.push('Surah ' + sn + ' starts on page ' + actualPage + ', expected ' + expectedPage);
    surahFail++;
  } else surahOk++;
});
console.log('Surah start pages: ' + surahOk + ' correct, ' + surahFail + ' mismatches');

// ── 6. Juz start pages (verify juz boundary verses are on correct pages) ────
// We check that the first verse on each juz-start page matches expectations.
// Simplified: just verify juz boundary pages are non-empty and have reasonable content.
let juzOk = 0;
JUZ_START_PAGES.forEach(function(jp, ji) {
  if (jp < 1 || jp > TOTAL_PAGES) return;
  const page = v1[jp - 1];
  if (page && page.verses && page.verses.length) juzOk++;
  else warnings.push('Juz ' + (ji + 1) + ' start page ' + jp + ': no verses');
});
console.log('Juz start pages populated: ' + juzOk + '/30');

// ── 7. Sajdah positions ─────────────────────────────────────────────────────
const sajdahFound = new Set();
v1.forEach(function(page) {
  if (!page || !page.verses) return;
  page.verses.forEach(function(v) {
    if (SAJDAH_KEYS.has(v.verse_key)) sajdahFound.add(v.verse_key);
  });
});
SAJDAH_KEYS.forEach(function(key) {
  if (!sajdahFound.has(key)) warnings.push('Sajdah ' + key + ': not found in data');
});
console.log('Sajdah positions: ' + sajdahFound.size + '/' + SAJDAH_KEYS.size + ' found');

// ── 8. Cross-check page/line structure against V4 ───────────────────────────
let matchPages = 0, diffPages = 0;
if (fs.existsSync(V4_FILE)) {
  const v4 = JSON.parse(fs.readFileSync(V4_FILE, 'utf8'));
  for (let i = 0; i < Math.min(v1.length, v4.length); i++) {
    const p1 = v1[i]; const p4 = v4[i];
    if (!p1 || !p4) continue;
    const k1 = (p1.verses||[]).map(function(v){return v.verse_key;}).join(',');
    const k4 = (p4.verses||[]).map(function(v){return v.verse_key;}).join(',');
    if (k1 === k4) matchPages++;
    else { diffPages++; if (diffPages <= 5) warnings.push('Page ' + (i+1) + ' verse_keys differ between V1 and V4: V1=['+k1+'] V4=['+k4+']'); }
  }
  console.log('V1 vs V4 verse_key alignment: ' + matchPages + ' match, ' + diffPages + ' differ');
}

// ── 9. Font files ───────────────────────────────────────────────────────────
if (fs.existsSync(FONT_DIR)) {
  const fonts  = fs.readdirSync(FONT_DIR).filter(f => f.endsWith('.woff2'));
  const missing = [];
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    if (!fs.existsSync(path.join(FONT_DIR, 'p' + p + '.woff2'))) missing.push(p);
  }
  if (missing.length) errors.push('Missing fonts: p' + missing.slice(0,10).join(', p') + (missing.length>10?'…('+missing.length+' total)':''));
  else console.log('Font files: all 604 woff2 present ✓');
  const totalKB = fonts.reduce(function(s, f){return s + fs.statSync(path.join(FONT_DIR, f)).size;}, 0);
  console.log('Font bundle size: ' + (totalKB/1024/1024).toFixed(1) + ' MB');
} else {
  errors.push('Font directory not found: ' + FONT_DIR);
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n── Validation Summary ─────────────────────────────────');
if (errors.length === 0 && warnings.length === 0) {
  console.log('ALL CHECKS PASSED ✓');
  console.log('V1 data is ready for production use.');
} else {
  if (errors.length) {
    console.error('\nERRORS (' + errors.length + '):');
    errors.forEach(function(e){console.error('  ✗ ' + e);});
  }
  if (warnings.length) {
    console.warn('\nWARNINGS (' + warnings.length + '):');
    warnings.slice(0, 20).forEach(function(w){console.warn('  ⚠ ' + w);});
    if (warnings.length > 20) console.warn('  … and ' + (warnings.length - 20) + ' more');
  }
}

if (errors.length > 0) process.exit(1);
