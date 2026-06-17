#!/usr/bin/env node
/* check-versions.js — verify version strings are consistent across index.html and service-worker.js
   Exit 0 = all match. Exit 1 = mismatches found.
*/
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const indexHtml = readFileSync(join(ROOT, 'src/app/index.html'), 'utf8');
const swJs      = readFileSync(join(ROOT, 'src/service-worker.js'), 'utf8');

// Extract all versioned src/href references from index.html (preload + script tags)
const htmlVers = {};
const htmlRe = /(?:href|src)="([^"]+\?v=[^"]+)"/g;
let m;
while ((m = htmlRe.exec(indexHtml)) !== null) {
  const url = m[1];
  const base = url.split('?')[0];
  const ver  = url.split('?v=')[1] || '';
  htmlVers[base] = ver;
}

// Extract all versioned entries from SW PRECACHE array
const swVers = {};
const swRe = /'([^']+\?v=[^']+)'/g;
while ((m = swRe.exec(swJs)) !== null) {
  const url = m[1];
  const base = url.split('?')[0];
  const ver  = url.split('?v=')[1] || '';
  swVers[base] = ver;
}

let errors = 0;
// Check: every file in SW PRECACHE that also appears in index.html must match version
for (const [base, swVer] of Object.entries(swVers)) {
  if (htmlVers[base] && htmlVers[base] !== swVer) {
    console.error(`  MISMATCH  ${base}`);
    console.error(`    index.html : ?v=${htmlVers[base]}`);
    console.error(`    sw.js      : ?v=${swVer}`);
    errors++;
  }
}

if (errors === 0) {
  console.log('[check-versions] OK — all versioned files match between index.html and service-worker.js');
} else {
  console.error(`[check-versions] FAIL — ${errors} version mismatch(es) found`);
}
process.exit(errors > 0 ? 1 : 0);
