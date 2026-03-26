/**
 * Generates src/i18n/kmr-bundled.js from src/i18n/kmr.json.
 * The bundled file embeds ALL translations as a synchronous JS object so the
 * app never needs a fetch() to load local translations — works 100% offline.
 *
 * Run: node scripts/build-kmr-bundle.js
 * Run before every: npx cap sync android / npx cap sync ios
 */
const fs   = require('fs');
const path = require('path');

const KMR  = path.join(__dirname, '../src/i18n/kmr.json');
const OUT  = path.join(__dirname, '../src/i18n/kmr-bundled.js');

const data = JSON.parse(fs.readFileSync(KMR, 'utf8'));
const keys = Object.keys(data).length;

const content = [
  '// AUTO-GENERATED — do not edit. Regenerate: node scripts/build-kmr-bundle.js',
  '// Source: src/i18n/kmr.json  (' + keys + ' keys)',
  'window.KMR_TRANSLATIONS = ' + JSON.stringify(data, null, 0) + ';',
  ''
].join('\n');

fs.writeFileSync(OUT, content, 'utf8');
console.log('Generated kmr-bundled.js — ' + keys + ' keys, ' + content.length + ' bytes');
