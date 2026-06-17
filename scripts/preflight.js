#!/usr/bin/env node
/* preflight.js — run all pre-deploy checks, exit non-zero if any fail */
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const checks = [
  { name: 'version-consistency', script: join(__dir, 'check-versions.js') },
  { name: 'service-worker',      script: join(__dir, 'check-sw.js') },
];

let failed = 0;
for (const check of checks) {
  process.stdout.write('[preflight] Running: ' + check.name + ' ... ');
  const result = spawnSync(process.execPath, [check.script], { cwd: ROOT, encoding: 'utf8' });
  if (result.status === 0) {
    console.log('PASS');
  } else {
    console.log('FAIL');
    if (result.stdout && result.stdout.trim()) console.error(result.stdout.trim());
    if (result.stderr && result.stderr.trim()) console.error(result.stderr.trim());
    failed++;
  }
}

if (failed === 0) {
  console.log('\n[preflight] All checks passed.');
} else {
  console.error('\n[preflight] ' + failed + ' check(s) failed — fix before deploying.');
  process.exit(1);
}
