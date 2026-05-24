// Split kurdish_tafsir.json into per-surah files for lazy loading.
// Output: src/data/tafsir/tafsir-{n}.json (114 files, ~27KB avg)
// Run: node scripts/split-tafsir.js
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const raw = JSON.parse(readFileSync('src/data/kurdish_tafsir.json', 'utf8'));
const outDir = 'src/data/tafsir';
mkdirSync(outDir, { recursive: true });

// Group flat array by surah (mirrors groupTafsirBySurah in app-init.js)
const grouped = {};
raw.forEach(function(item) {
  const sn = item.surah;
  if (!grouped[sn]) grouped[sn] = { verses: [] };
  const txt = item.kurdish_tafsir || item.text || item.tafsir || '';
  grouped[sn].verses.push({ verse: parseInt(item.ayah), text: txt });
});

let count = 0, totalBytes = 0;

for (let n = 1; n <= 114; n++) {
  const surahData = grouped[n] || { verses: [] };
  const json = JSON.stringify(surahData);
  writeFileSync(join(outDir, `tafsir-${n}.json`), json);
  totalBytes += json.length;
  count++;
}

const orig = readFileSync('src/data/kurdish_tafsir.json').length;
console.log(`✓ Split kurdish_tafsir.json into ${count} files → ${outDir}/`);
console.log(`  Total size: ${(totalBytes / 1024).toFixed(0)} KB (original: ${(orig / 1024).toFixed(0)} KB)`);
console.log(`  Avg size: ${(totalBytes / count / 1024).toFixed(1)} KB/surah`);
