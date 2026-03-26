/**
 * Translation Audit Script
 * Scans ALL t('key') calls in app.js and verifies each key exists in:
 *   1. src/i18n/kmr.json  (bundled)
 *   2. Supabase DB        (via /app-translations endpoint)
 *
 * Usage: node scripts/verify-translations.js
 */
const fs   = require('fs');
const path = require('path');

const APP_JS   = path.join(__dirname, '../src/app/app.js');
const KMR_JSON = path.join(__dirname, '../src/i18n/kmr.json');

function extractKeys(src){
  const keys = new Set();
  const re = /\bt\(\s*['"]([^'"]+)['"]/g;
  let m;
  while((m = re.exec(src)) !== null) keys.add(m[1]);
  return keys;
}

async function fetchDB(){
  const res = await fetch('https://tafsirkurd.com/app-translations?platform=android', {
    headers: { 'Origin': 'capacitor://localhost' }
  });
  if(!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function main(){
  const appSrc = fs.readFileSync(APP_JS, 'utf8');
  const kmr    = JSON.parse(fs.readFileSync(KMR_JSON, 'utf8'));

  console.log('Fetching DB translations...');
  const db = await fetchDB();

  const usedKeys = extractKeys(appSrc);
  console.log('Keys used in app.js: ' + usedKeys.size);

  const missingKmr = [];
  const missingDb  = [];

  for(const key of [...usedKeys].sort()){
    if(!(key in kmr)) missingKmr.push(key);
    if(!(key in db))  missingDb.push(key);
  }

  if(missingKmr.length){
    console.log('\nMISSING from kmr.json (' + missingKmr.length + '):');
    missingKmr.forEach(k => console.log('  ' + k));
  } else {
    console.log('All keys present in kmr.json');
  }

  if(missingDb.length){
    console.log('\nMISSING from DB (' + missingDb.length + '):');
    missingDb.forEach(k => console.log('  ' + k));
  } else {
    console.log('All keys present in DB');
  }

  if(missingKmr.length === 0 && missingDb.length === 0){
    console.log('\nAll translations are complete!');
  } else {
    console.log('\nRun: node scripts/sync-translations.js to push missing keys to DB');
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
