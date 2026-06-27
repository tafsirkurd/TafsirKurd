'use strict';
const fs   = require('fs');
const path = require('path');

const V1_FILE = path.join(__dirname, '..', 'src', 'data', 'mushaf-v1-pages.json');
const v1 = JSON.parse(fs.readFileSync(V1_FILE, 'utf8'));

// Juz boundaries: which verse_key starts each juz (Hafs standard)
const JUZ_FIRST_VERSES = [
  '1:1','2:142','2:253','3:93','4:24','4:148','5:83','6:111','7:88','8:41',
  '9:93','11:6','12:53','15:1','17:1','18:75','21:1','23:1','25:21','27:56',
  '29:46','33:31','36:28','39:32','41:47','46:1','51:31','58:1','67:1','78:1'
];

// ── Surah start pages ─────────────────────────────────────────────────────
const surahFirstPage = {};
for (let i = 0; i < v1.length; i++) {
  const pageNum = i + 1;
  const verses  = (v1[i] || {}).verses || [];
  verses.forEach(function(v) {
    const sn = parseInt((v.verse_key||'').split(':')[0]);
    if (!surahFirstPage[sn]) surahFirstPage[sn] = pageNum;
  });
}

// Build compact JS array (index 0 = surah 1)
const surahArr = [];
for (let s = 1; s <= 114; s++) surahArr.push(surahFirstPage[s] || null);
console.log('\n// V1 surah start pages (index 0 = surah 1)');
console.log('var SURAH_PAGES_V1=' + JSON.stringify(surahArr) + ';');

// ── Juz start pages ───────────────────────────────────────────────────────
// Build a verse_key → page map first
const versePageMap = {};
for (let i = 0; i < v1.length; i++) {
  const pageNum = i + 1;
  (v1[i]?.verses || []).forEach(function(v) {
    if (!versePageMap[v.verse_key]) versePageMap[v.verse_key] = pageNum;
  });
}

const juzPages = JUZ_FIRST_VERSES.map(function(key, ji) {
  const pg = versePageMap[key];
  if (!pg) { console.error('Juz ' + (ji+1) + ': first verse ' + key + ' NOT FOUND in V1 data'); }
  return pg || null;
});
console.log('\n// V1 juz start pages (juz 1-30)');
console.log('var JUZ_PAGES_V1=' + JSON.stringify(juzPages) + ';');

// ── Diff vs QCF4 constants (for review) ──────────────────────────────────
const SURAH_PAGES_V4=[1,2,50,77,106,128,151,177,187,208,221,235,249,255,262,267,282,293,305,312,322,333,342,350,359,367,377,385,396,404,411,415,418,428,434,440,446,453,458,467,477,483,489,496,499,502,507,511,515,518,520,523,526,528,531,534,537,542,545,549,551,553,554,556,558,560,562,564,566,568,570,572,574,575,577,578,580,582,583,585,586,587,587,589,590,591,591,592,593,594,595,595,596,596,597,597,598,598,599,599,600,600,601,601,601,602,602,602,603,603,603,604,604,604];
const JUZ_PAGES_V4=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];

console.log('\n// Diffs V1 vs V4:');
surahArr.forEach(function(pg, i) {
  if (pg !== SURAH_PAGES_V4[i]) console.log('  Surah ' + (i+1) + ': V1=' + pg + ' V4=' + SURAH_PAGES_V4[i]);
});
juzPages.forEach(function(pg, i) {
  if (pg !== JUZ_PAGES_V4[i]) console.log('  Juz ' + (i+1) + ': V1=' + pg + ' V4=' + JUZ_PAGES_V4[i]);
});
