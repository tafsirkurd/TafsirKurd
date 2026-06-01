#!/usr/bin/env node
/**
 * Translation bundle verification script.
 *
 * Checks:
 *   1. Every entry in CORRECTIONS (apply-text-fixes.js) exists in kmr.json
 *      with the exact expected value.
 *   2. kmr.json and kmr-bundled.js are byte-for-byte identical content-wise.
 *   3. No known-bad strings exist in any bundled file.
 *   4. bulk-translations.js entries that overlap with CORRECTIONS have the
 *      correct kurdish_text value.
 *
 * Exit 0 = all checks pass.
 * Exit 1 = one or more failures (details printed to stdout).
 *
 * Usage:
 *   node scripts/check-translations.js
 *   npm run check-translations
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Known-bad values that must NEVER appear as translation values ─────────────
// Format: { key_id: string, bad_value: string, reason: string }
const KNOWN_BAD = [
  { key_id: 'iv.delete', bad_value: 'بەلێ',          reason: 'should be ژێبرن — was set wrong in DB' },
  { key_id: 'iv.delete', bad_value: 'بەلێ، ژێ ببە',   reason: 'old reset-confirmation text leaked into wrong key' },
];

// ── Load helpers ──────────────────────────────────────────────────────────────
function loadKmrJson() {
  const raw = fs.readFileSync(path.join(ROOT, 'src/i18n/kmr.json'), 'utf8');
  return JSON.parse(raw);
}

function loadKmrBundled() {
  const raw = fs.readFileSync(path.join(ROOT, 'src/i18n/kmr-bundled.js'), 'utf8')
    .replace(/^﻿/, '')          // strip BOM
    .replace(/^window\.KMR_TRANSLATIONS=/, '')
    .replace(/;$/, '');
  return JSON.parse(raw);
}

function loadBulkTranslations() {
  // BULK_TRANSLATIONS is an array assignment — eval in a sandbox
  const raw = fs.readFileSync(path.join(ROOT, 'src/utils/bulk-translations.js'), 'utf8');
  let arr;
  // Strip the assignment prefix and eval
  const match = raw.match(/window\.BULK_TRANSLATIONS\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
  if (!match) throw new Error('Could not parse bulk-translations.js');
  eval('arr = ' + match[1]);  // safe — local file
  return arr;
}

function loadCorrections() {
  const raw = fs.readFileSync(path.join(ROOT, 'functions/apply-text-fixes.js'), 'utf8');
  const match = raw.match(/const CORRECTIONS\s*=\s*\[([\s\S]*?)\n\];/);
  if (!match) throw new Error('Could not find CORRECTIONS in apply-text-fixes.js');
  let arr;
  eval('arr = [' + match[1] + ']');
  return arr;
}

// ── Run checks ────────────────────────────────────────────────────────────────
let errors   = 0;
let warnings = 0;

function fail(msg) { console.error('FAIL  ' + msg); errors++; }
function warn(msg) { console.warn ('WARN  ' + msg); warnings++; }
function ok(msg)   { console.log  ('ok    ' + msg); }

console.log('=== Translation bundle verification ===\n');

// Load all files
const corrections    = loadCorrections();
const kmrJson        = loadKmrJson();
const kmrBundled     = loadKmrBundled();
let   bulkTranslations;
try { bulkTranslations = loadBulkTranslations(); }
catch(e) { warn('Could not load bulk-translations.js: ' + e.message); bulkTranslations = []; }

ok('Loaded ' + corrections.length    + ' corrections from apply-text-fixes.js');
ok('Loaded ' + Object.keys(kmrJson).length    + ' keys from kmr.json');
ok('Loaded ' + Object.keys(kmrBundled).length + ' keys from kmr-bundled.js');
ok('Loaded ' + bulkTranslations.length        + ' entries from bulk-translations.js');
console.log('');

// ── Check 1: CORRECTIONS vs kmr.json ─────────────────────────────────────────
console.log('--- Check 1: CORRECTIONS vs kmr.json ---');
let c1ok = 0;
corrections.forEach(function(c) {
  if (!(c.key_id in kmrJson)) {
    fail('Missing in kmr.json: ' + c.key_id + ' (expected: ' + JSON.stringify(c.kurdish_text) + ')');
  } else if (kmrJson[c.key_id] !== c.kurdish_text) {
    fail('Wrong value in kmr.json: ' + c.key_id +
         '\n       got:      ' + JSON.stringify(kmrJson[c.key_id]) +
         '\n       expected: ' + JSON.stringify(c.kurdish_text));
  } else {
    c1ok++;
  }
});
if (c1ok === corrections.length) ok('All ' + corrections.length + ' corrections present and correct in kmr.json');
console.log('');

// ── Check 2: kmr.json vs kmr-bundled.js (must be identical) ──────────────────
console.log('--- Check 2: kmr.json vs kmr-bundled.js sync ---');
const allJsonKeys     = Object.keys(kmrJson);
const allBundledKeys  = Object.keys(kmrBundled);
let c2ok = 0;
const inJsonNotBundled = allJsonKeys.filter(k => !(k in kmrBundled));
const inBundledNotJson = allBundledKeys.filter(k => !(k in kmrJson));
if (inJsonNotBundled.length) {
  inJsonNotBundled.forEach(k => fail('In kmr.json but not kmr-bundled.js: ' + k));
}
if (inBundledNotJson.length) {
  inBundledNotJson.forEach(k => fail('In kmr-bundled.js but not kmr.json: ' + k));
}
allJsonKeys.forEach(function(k) {
  if (kmrJson[k] !== kmrBundled[k]) {
    fail('Value mismatch for key "' + k + '"' +
         '\n       kmr.json:      ' + JSON.stringify(kmrJson[k]) +
         '\n       kmr-bundled:   ' + JSON.stringify(kmrBundled[k]));
  } else {
    c2ok++;
  }
});
if (c2ok === allJsonKeys.length && !inJsonNotBundled.length && !inBundledNotJson.length)
  ok('kmr.json and kmr-bundled.js are in sync (' + allJsonKeys.length + ' keys)');
console.log('');

// ── Check 3: Known-bad strings ────────────────────────────────────────────────
console.log('--- Check 3: Known-bad values ---');
let c3ok = 0;
KNOWN_BAD.forEach(function(entry) {
  [
    { label: 'kmr.json',     val: kmrJson[entry.key_id] },
    { label: 'kmr-bundled',  val: kmrBundled[entry.key_id] },
  ].forEach(function(src) {
    if (src.val === entry.bad_value) {
      fail('Bad value in ' + src.label + ': ' + entry.key_id +
           ' = ' + JSON.stringify(entry.bad_value) +
           '  (' + entry.reason + ')');
    } else {
      c3ok++;
    }
  });
});
// Also scan bulk-translations.js
bulkTranslations.forEach(function(entry) {
  KNOWN_BAD.forEach(function(bad) {
    if (entry.key_id === bad.key_id && entry.kurdish_text === bad.bad_value) {
      fail('Bad value in bulk-translations.js: ' + bad.key_id +
           ' = ' + JSON.stringify(bad.bad_value) + '  (' + bad.reason + ')');
    }
  });
});
if (errors === 0) ok('No known-bad strings found in any bundled file');
console.log('');

// ── Check 4: CORRECTIONS vs bulk-translations.js (overlapping keys only) ──────
console.log('--- Check 4: CORRECTIONS overlap in bulk-translations.js ---');
const bulkMap = {};
bulkTranslations.forEach(function(e) { bulkMap[e.key_id] = e.kurdish_text; });
let c4ok = 0, c4skip = 0;
corrections.forEach(function(c) {
  if (!(c.key_id in bulkMap)) { c4skip++; return; } // not in bulk — expected
  if (bulkMap[c.key_id] !== c.kurdish_text) {
    fail('Wrong value in bulk-translations.js: ' + c.key_id +
         '\n       got:      ' + JSON.stringify(bulkMap[c.key_id]) +
         '\n       expected: ' + JSON.stringify(c.kurdish_text));
  } else {
    c4ok++;
  }
});
ok('Checked ' + (c4ok + 0) + ' overlapping keys in bulk-translations.js (' + c4skip + ' corrections not present there — expected)');
console.log('');

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('=== Summary ===');
if (errors > 0) {
  console.error(errors + ' error(s) found. Fix them before deploying.');
  process.exit(1);
} else {
  console.log('All checks passed.' + (warnings ? ' (' + warnings + ' warning(s))' : ''));
  process.exit(0);
}
