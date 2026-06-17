#!/usr/bin/env node
/* check-sw.js — verify service-worker.js CACHE_NAME format and PRECACHE completeness
   Exit 0 = OK. Exit 1 = problems found.
*/
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const swJs = readFileSync(join(ROOT, 'src/service-worker.js'), 'utf8');

let errors = 0;

// 1. CACHE_NAME must match pattern tafsir-kurd-vNNN
const cacheMatch = swJs.match(/CACHE_NAME\s*=\s*'(tafsir-kurd-v(\d+))'/);
if (!cacheMatch) {
  console.error('[check-sw] FAIL — CACHE_NAME not found or malformed');
  errors++;
} else {
  const ver = parseInt(cacheMatch[2], 10);
  console.log('[check-sw] CACHE_NAME: ' + cacheMatch[1] + ' (v' + ver + ')');
  if (ver < 1200) {
    console.error('[check-sw] WARN — CACHE_NAME version looks very low: ' + ver);
  }
}

// 2. PRECACHE must contain core files
const required = [
  '/app/app.min.js',
  '/dhikr/dhikr.js',
  '/app/app-styles.min.css',
  '/i18n/i18n.min.js',
  '/data/quran.json',
];
const precacheSection = swJs.match(/const PRECACHE\s*=\s*\[([\s\S]*?)\]/);
const precacheText = precacheSection ? precacheSection[1] : '';

for (const file of required) {
  if (!precacheText.includes(file)) {
    console.error('[check-sw] FAIL — PRECACHE missing: ' + file);
    errors++;
  }
}

// 3. No duplicate base paths
const entries = precacheText.match(/'[^']+'/g) || [];
const seen = {};
for (const e of entries) {
  const key = e.replace(/\?v=[^']+/, '');
  if (seen[key]) {
    console.error('[check-sw] WARN — duplicate PRECACHE base path: ' + key);
  }
  seen[key] = true;
}

if (errors === 0) {
  console.log('[check-sw] OK — service-worker.js looks valid');
} else {
  console.error('[check-sw] FAIL — ' + errors + ' problem(s) found');
}
process.exit(errors > 0 ? 1 : 0);
