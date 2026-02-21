#!/usr/bin/env node

/**
 * verify-assets.js
 *
 * Runs after `npx cap sync` to guarantee both Android and iOS
 * ship the exact same files from src/.
 *
 * 1) Deletes leftover .gz files from platform asset dirs
 * 2) Compares SHA-256 hashes of critical files between src/ and platform copies
 * 3) Exits with code 1 if anything is missing or mismatched
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const ANDROID_PUBLIC = path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
const IOS_PUBLIC = path.join(ROOT, 'ios', 'App', 'App', 'public');

// Critical files that MUST exist and match in all three locations
const CRITICAL_FILES = [
  'i18n/kmr.json',
  'i18n/i18n.js',
  'data/quran.json',
  'data/kurdish_tafsir.json',
  'app/index.html',
  'app/app.js',
  'service-worker.js',
  'manifest.json',
];

// .gz files to clean from platform dirs (prevent double-bundling)
const GZ_CLEANUP = [
  'data/kurdish_tafsir.json.gz',
  'data/quran.json.gz',
];

function sha256(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 12);
  } catch {
    return null;
  }
}

function fileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '  MISSING';
  if (bytes < 1024) return `  ${bytes} B`;
  if (bytes < 1024 * 1024) return `  ${(bytes / 1024).toFixed(1)} KB`;
  return `  ${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Step 1: Clean .gz files ---
console.log('\n--- Cleaning .gz files from platform dirs ---');
let gzCleaned = 0;

for (const gz of GZ_CLEANUP) {
  for (const [label, dir] of [['android', ANDROID_PUBLIC], ['ios', IOS_PUBLIC]]) {
    const p = path.join(dir, gz);
    try {
      fs.unlinkSync(p);
      console.log(`  Deleted: ${label}/${gz}`);
      gzCleaned++;
    } catch {
      // File doesn't exist, that's fine
    }
  }
}

if (gzCleaned === 0) {
  console.log('  No .gz files to clean (already clean)');
}

// --- Step 2: Verify critical files ---
console.log('\n--- Verifying critical assets (SHA-256) ---');
console.log('');

const COL = { file: 28, hash: 14, status: 6 };

function pad(str, len) {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

console.log(
  pad('FILE', COL.file) +
  pad('SRC', COL.hash) +
  pad('ANDROID', COL.hash) +
  pad('iOS', COL.hash) +
  'STATUS'
);
console.log('-'.repeat(COL.file + COL.hash * 3 + COL.status));

let failures = 0;

for (const file of CRITICAL_FILES) {
  const srcPath = path.join(SRC, file);
  const androidPath = path.join(ANDROID_PUBLIC, file);
  const iosPath = path.join(IOS_PUBLIC, file);

  const srcHash = sha256(srcPath);
  const androidHash = sha256(androidPath);
  const iosHash = sha256(iosPath);

  let status = 'OK';
  const problems = [];

  if (!srcHash) {
    status = 'FAIL';
    problems.push('source missing');
  }
  if (!androidHash) {
    status = 'FAIL';
    problems.push('android missing');
  } else if (srcHash && androidHash !== srcHash) {
    status = 'FAIL';
    problems.push('android hash mismatch');
  }
  if (!iosHash) {
    status = 'FAIL';
    problems.push('ios missing');
  } else if (srcHash && iosHash !== srcHash) {
    status = 'FAIL';
    problems.push('ios hash mismatch');
  }

  if (status === 'FAIL') failures++;

  console.log(
    pad(file, COL.file) +
    pad(srcHash || 'MISSING', COL.hash) +
    pad(androidHash || 'MISSING', COL.hash) +
    pad(iosHash || 'MISSING', COL.hash) +
    (status === 'OK' ? 'OK' : 'FAIL  ' + problems.join(', '))
  );
}

// --- Step 3: Size summary ---
console.log('');
console.log('--- File sizes ---');
for (const file of CRITICAL_FILES) {
  const size = fileSize(path.join(SRC, file));
  console.log(`  ${pad(file, 30)} ${formatSize(size)}`);
}

// --- Result ---
console.log('');
if (failures > 0) {
  console.error(`FAILED: ${failures} file(s) missing or mismatched. Run "npx cap sync" first.`);
  process.exit(1);
} else {
  console.log(`ALL ${CRITICAL_FILES.length} critical files verified. Android and iOS are identical to src/.`);
}
