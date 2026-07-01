/**
 * Mushaf integrity validator
 *
 * Compares mushaf-v4-pages.json (604-page layout) against quran.json (canonical text)
 * and reports structural discrepancies:
 *   • Missing or extra verses
 *   • Out-of-order verses
 *   • Duplicate verses
 *   • Word-count mismatches between mushaf layout and canonical text
 *   • Verses with zero words
 *   • Lines with unusually high glyph density (risk of visual merging)
 *
 * Run:  node scripts/validate-mushaf-integrity.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MUSHAF_PATH  = path.join(__dirname, '../src/data/mushaf-v4-pages.json');
const QURAN_PATH   = path.join(__dirname, '../src/data/quran.json');

// ── Load data ────────────────────────────────────────────────────────────────

const mushafData = JSON.parse(fs.readFileSync(MUSHAF_PATH, 'utf8'));
const quranData  = JSON.parse(fs.readFileSync(QURAN_PATH,  'utf8'));

// ── Build canonical word-count map from quran.json ───────────────────────────
// Key: "surah:verse"  Value: word count (whitespace-split)

const canonicalWordCount = {};
for (const surahStr of Object.keys(quranData)) {
    const verses = quranData[surahStr];
    for (let i = 0; i < verses.length; i++) {
        const vn  = i + 1;
        const key = `${surahStr}:${vn}`;
        const txt = String(verses[i].text || '');
        canonicalWordCount[key] = txt.trim() ? txt.trim().split(/\s+/).length : 0;
    }
}

// ── Walk every page and collect results ──────────────────────────────────────

const errors   = [];
const warnings = [];
const seenKeys = new Map(); // verse_key → first occurrence {page, verseIdx}

// Expected canonical order (surah 1 verse 1 … surah 114 verse N)
let expectedSurah = 1;
let expectedVerse = 1;
const SURAH_LENGTHS = {};
for (const surahStr of Object.keys(quranData)) {
    SURAH_LENGTHS[parseInt(surahStr)] = quranData[surahStr].length;
}

// Per-page line density: accumulate max glyph chars per line
const HIGH_DENSITY_THRESHOLD = 14; // ≥14 glyph chars on one line → warning

let totalVersesSeen = 0;

for (let pi = 0; pi < mushafData.length; pi++) {
    const pageNum  = pi + 1;
    const page     = mushafData[pi];
    const verses   = page.verses || [];

    // Collect line→glyphs map for this page (for density check)
    const lineGlyphs = {};

    for (let vi = 0; vi < verses.length; vi++) {
        const verse     = verses[vi];
        const verseKey  = verse.verse_key || `${verse.surah_number || '?'}:${verse.verse_number || '?'}`;
        const words     = verse.words || [];

        totalVersesSeen++;

        // ── 1. Zero-word verse ────────────────────────────────────────────────
        if (words.length === 0) {
            errors.push(`[p${pageNum}] ${verseKey}: verse has 0 words`);
        }

        // ── 2. Duplicate detection ────────────────────────────────────────────
        if (seenKeys.has(verseKey)) {
            const first = seenKeys.get(verseKey);
            errors.push(`[p${pageNum}] ${verseKey}: DUPLICATE — first seen on page ${first.page}`);
        } else {
            seenKeys.set(verseKey, { page: pageNum, verseIdx: vi });
        }

        // ── 3. Sequence check ─────────────────────────────────────────────────
        const [surahPart, versePart] = verseKey.split(':');
        const sn = parseInt(surahPart);
        const vn = parseInt(versePart);
        if (!isNaN(sn) && !isNaN(vn)) {
            if (sn !== expectedSurah || vn !== expectedVerse) {
                errors.push(
                    `[p${pageNum}] ${verseKey}: out-of-order — expected ${expectedSurah}:${expectedVerse}`
                );
            }
            // Advance expected pointer
            const surahLen = SURAH_LENGTHS[expectedSurah] || 0;
            if (expectedVerse >= surahLen) {
                expectedSurah++;
                expectedVerse = 1;
            } else {
                expectedVerse++;
            }
        }

        // ── 4. Word-count check ───────────────────────────────────────────────
        // Mushaf word count = canonical words + 1 verse marker
        // Tolerance: ±0 (exact). Some verses may have 2 extra for a verse
        // marker that contains a two-character code_v2 (counted as 1 word object).
        const expected = canonicalWordCount[verseKey];
        if (expected !== undefined) {
            const mushafWordCount = words.length;
            const diff = mushafWordCount - expected;
            // Expected diff: +1 (verse marker). Allowed: 0 or +1 (some verses
            // have no standalone marker; a few have split-marker words).
            if (diff < 0) {
                errors.push(
                    `[p${pageNum}] ${verseKey}: word count SHORT — mushaf has ${mushafWordCount}, ` +
                    `canonical has ${expected} (diff ${diff})`
                );
            } else if (diff > 2) {
                warnings.push(
                    `[p${pageNum}] ${verseKey}: word count HIGH — mushaf has ${mushafWordCount}, ` +
                    `canonical has ${expected} (diff +${diff})`
                );
            }
        } else if (!verseKey.includes('?')) {
            warnings.push(`[p${pageNum}] ${verseKey}: not found in quran.json`);
        }

        // ── 5. Per-word checks + line density accumulation ───────────────────
        for (const w of words) {
            const code = w.code_v2 || '';
            const ln   = w.line_number || 0;

            if (!code) {
                errors.push(`[p${pageNum}] ${verseKey}: word with empty code_v2`);
            }

            if (!lineGlyphs[ln]) lineGlyphs[ln] = '';
            lineGlyphs[ln] += code;
        }
    }

    // ── 6. Line density warnings ─────────────────────────────────────────────
    for (const [ln, glyphs] of Object.entries(lineGlyphs)) {
        if (glyphs.length >= HIGH_DENSITY_THRESHOLD) {
            warnings.push(
                `[p${pageNum}] line ${ln}: high glyph density — ` +
                `${glyphs.length} chars (risk of visual word merging)`
            );
        }
    }
}

// ── 7. Coverage check: all quran.json verses appear in mushaf ────────────────
for (const key of Object.keys(canonicalWordCount)) {
    if (!seenKeys.has(key)) {
        errors.push(`MISSING: ${key} — present in quran.json but absent from mushaf pages`);
    }
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log('\n=== Mushaf integrity report ===\n');
console.log(`Pages checked:   ${mushafData.length}`);
console.log(`Verses checked:  ${totalVersesSeen}  (expected 6236)`);
console.log(`Unique verses:   ${seenKeys.size}`);
console.log(`Errors:          ${errors.length}`);
console.log(`Warnings:        ${warnings.length}`);

if (errors.length) {
    console.log('\n── ERRORS ──');
    errors.forEach(e => console.log('  ✗', e));
}

if (warnings.length) {
    console.log('\n── WARNINGS ──');
    warnings.slice(0, 100).forEach(w => console.log('  ⚠', w));
    if (warnings.length > 100) {
        console.log(`  … and ${warnings.length - 100} more warnings`);
    }
}

if (!errors.length && !warnings.length) {
    console.log('\n✓ All checks passed — mushaf layout matches canonical source.');
}

// ── Specific check: 18:5 ─────────────────────────────────────────────────────
console.log('\n── 18:5 detail ──');
const p294 = mushafData[293];
const v18_5 = (p294.verses || []).find(v => v.verse_key === '18:5');
if (v18_5) {
    console.log(`  Found on page 294, ${v18_5.words.length} words`);
    v18_5.words.forEach((w, i) => {
        const codes = [...(w.code_v2||'')].map(c =>
            'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')
        );
        console.log(`  word ${i}: line=${w.line_number} code_v2=[${codes.join(',')}]`);
    });
    const ln1glyphs = v18_5.words
        .filter(w => w.line_number === 1)
        .reduce((s, w) => s + (w.code_v2||'').length, 0);
    const allLn1 = (p294.verses||[]).flatMap(v => (v.words||[]).filter(w => w.line_number === 1));
    const ln1total = allLn1.reduce((s,w)=>s+(w.code_v2||'').length,0);
    console.log(`  page 294 line 1 total glyph chars: ${ln1total}`);
    console.log(`  canonical word 0: '${Object.values(quranData['18'])[4].text.split(/\s+/)[0]}'`);
    console.log(`  canonical word 1: '${Object.values(quranData['18'])[4].text.split(/\s+/)[1]}'`);
} else {
    console.log('  18:5 NOT FOUND on page 294 — check page assignment');
}

console.log('');
