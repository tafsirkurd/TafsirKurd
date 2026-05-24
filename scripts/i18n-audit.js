// i18n audit: find all t('key') and data-i18n="key" usages, diff against kmr.json
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const kmr = JSON.parse(readFileSync('src/i18n/kmr.json', 'utf8'));
const defined = new Set(Object.keys(kmr));

const SCAN_DIRS = ['src/app', 'src/utils', 'src/prayer', 'src/dhikr', 'src/quran'];
const SCAN_EXT = new Set(['.js', '.html']);

const usedKeys = new Set();
const dynamicKeys = []; // t('prefix.' + var) patterns - can't fully audit

function scanFile(filePath) {
  const src = readFileSync(filePath, 'utf8');

  // t('key') and t("key") and tSafe('key')
  for (const m of src.matchAll(/\bt(?:Safe)?\s*\(\s*['"]([^'"]+)['"]\s*[,)]/g)) {
    usedKeys.add(m[1]);
  }

  // data-i18n="key"
  for (const m of src.matchAll(/data-i18n="([^"]+)"/g)) {
    usedKeys.add(m[1]);
  }

  // Dynamic keys like t('prefix.' + something) - flag but don't fail
  for (const m of src.matchAll(/\bt(?:Safe)?\s*\(\s*['"]([^'"]+)['"]\s*\+/g)) {
    dynamicKeys.push({ file: filePath.replace('src/', ''), prefix: m[1] });
  }
}

function walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkDir(full);
    else if (SCAN_EXT.has(extname(entry))) scanFile(full);
  }
}

for (const d of SCAN_DIRS) walkDir(d);

// Keys used in code but missing from kmr.json
const missing = [...usedKeys].filter(k => !defined.has(k)).sort();

// Keys defined in kmr.json but never used in scanned files
const unused = [...defined].filter(k => !usedKeys.has(k)).sort();

console.log(`\n=== i18n Audit ===`);
console.log(`Defined in kmr.json: ${defined.size}`);
console.log(`Used in code: ${usedKeys.size}`);
console.log(`Dynamic prefixes (can't fully audit): ${dynamicKeys.length}\n`);

if (missing.length) {
  console.log(`❌ MISSING (used in code, not in kmr.json) — ${missing.length} keys:`);
  missing.forEach(k => console.log(`  ${k}`));
} else {
  console.log(`✅ No missing keys`);
}

console.log('');

if (unused.length) {
  console.log(`⚠️  UNUSED (in kmr.json, not found in scanned code) — ${unused.length} keys:`);
  unused.forEach(k => console.log(`  ${k}`));
} else {
  console.log(`✅ No unused keys`);
}

if (dynamicKeys.length) {
  console.log('\n📌 Dynamic key prefixes (manual review needed):');
  const seen = new Set();
  dynamicKeys.forEach(({ file, prefix }) => {
    const key = `${prefix}* (${file})`;
    if (!seen.has(key)) { seen.add(key); console.log(`  ${key}`); }
  });
}
