// Split quran.json into per-surah files for lazy loading / LCP optimization.
// Output: src/data/surahs/surah-{n}.json (114 files, ~8KB avg)
// Run: node scripts/split-quran.js
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const raw = JSON.parse(readFileSync('src/data/quran.json', 'utf8'));
const outDir = 'src/data/surahs';
mkdirSync(outDir, { recursive: true });

let count = 0;
let totalBytes = 0;

for (let n = 1; n <= 114; n++) {
  const key = String(n);
  const surahData = raw[key];
  if (!surahData) { console.warn(`  [warn] Missing surah ${n}`); continue; }
  const json = JSON.stringify(surahData);
  writeFileSync(join(outDir, `surah-${n}.json`), json);
  totalBytes += json.length;
  count++;
}

console.log(`✓ Split quran.json into ${count} files → ${outDir}/`);
console.log(`  Total size: ${(totalBytes / 1024).toFixed(0)} KB (original: ${(readFileSync('src/data/quran.json').length / 1024).toFixed(0)} KB)`);
console.log(`  Avg size: ${(totalBytes / count / 1024).toFixed(1)} KB/surah`);
