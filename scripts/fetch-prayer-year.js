#!/usr/bin/env node
/**
 * Fetch all prayer times for a year from amozhgary.tv via the CF Worker,
 * save as static JSON files in src/prayer-data/{year}/{city}.json.
 *
 * Usage:
 *   node scripts/fetch-prayer-year.js 2026              ← full year, all 20 cities
 *   node scripts/fetch-prayer-year.js 2026 Duhok        ← one city, all 12 months
 *   node scripts/fetch-prayer-year.js 2026 Duhok 5      ← correction: one city + month
 *
 * After running: git add src/prayer-data && git commit && git push
 *
 * City keys must match exactly what the app uses (same as CITY_COORDS in prayer.api.js).
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WORKER_BASE = 'https://tafsirkurd.com/prayer-kurd';

const ALL_CITIES = [
  'Sulaymaniyah', 'Erbil',    'Duhok',       'Kirkuk',  'Halabja',
  'Kfry',         'Rania',    'Koya',         'Qaladze', 'Zakho',
  'Bardarash',    'Mosul',    'Darbandikhan', 'Kalar',   'Akre',
  'Daquq',        'Makhmur',  'Mandali',      'Qarahanjir', 'DuzKhormatou',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchMonth(city, year, month, attempt) {
  attempt = attempt || 1;
  const url = `${WORKER_BASE}?city=${encodeURIComponent(city)}&year=${year}&month=${month}`;
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 15000); // 15s per request
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const count = Object.keys(data.days || {}).length;
  if (count < 20) throw new Error(`only ${count} days returned`);
  return data.days;
}

async function fetchMonthWithRetry(city, year, month) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchMonth(city, year, month, attempt);
    } catch(e) {
      const last = attempt === 3;
      process.stdout.write(last ? ` ✗ (${e.message})\n` : ` retry${attempt}..`);
      if (!last) await sleep(2000 * attempt);
      else return null;
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [,, yearArg, cityArg, monthArg] = process.argv;

  const year = parseInt(yearArg);
  if (!year || year < 2024 || year > 2035) {
    console.error('Usage: node scripts/fetch-prayer-year.js <year> [city] [month]');
    console.error('  year : 2024–2035');
    console.error('  city : one of the 20 city keys (optional)');
    console.error('  month: 1–12 (optional, correction mode)');
    process.exit(1);
  }

  const cities = cityArg
    ? (ALL_CITIES.includes(cityArg) ? [cityArg] : (console.error(`Unknown city: ${cityArg}\nValid: ${ALL_CITIES.join(', ')}`), process.exit(1)))
    : ALL_CITIES;

  const months = monthArg
    ? (() => {
        const m = parseInt(monthArg);
        if (!m || m < 1 || m > 12) {
          console.error('Invalid month: ' + monthArg + ' — must be 1–12');
          process.exit(1);
        }
        return [m];
      })()
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const isCorrectionMode = !!(cityArg && monthArg);

  const outDir = path.join(__dirname, '..', 'src', 'prayer-data', String(year));
  fs.mkdirSync(outDir, { recursive: true });

  let totalOk = 0, totalFail = 0;

  for (const city of cities) {
    const filePath = path.join(outDir, `${city}.json`);
    console.log(`\n📅 ${city} ${year}  [${months.map(m => String(m).padStart(2,'0')).join(', ')}]`);

    // In correction mode, merge into existing file instead of replacing it
    let existingMonths = {};
    if (isCorrectionMode && fs.existsSync(filePath)) {
      try {
        existingMonths = JSON.parse(fs.readFileSync(filePath, 'utf8')).months || {};
        console.log(`   (merging into existing file — ${Object.keys(existingMonths).length} months cached)`);
      } catch(e) {
        console.warn('   could not read existing file, starting fresh');
      }
    }

    const freshMonths = {};
    for (const month of months) {
      process.stdout.write(`   month ${String(month).padStart(2,'0')}... `);
      const days = await fetchMonthWithRetry(city, year, month);
      if (days) {
        freshMonths[month] = days;
        const count = Object.keys(days).length;
        console.log(`✓  (${count} days)`);
        totalOk++;
      } else {
        totalFail++;
      }
      await sleep(600); // ~0.6s between month fetches — don't hammer upstream
    }

    const merged = {
      city,
      year,
      generatedAt: Date.now(), // used by client to detect deployed corrections
      months: { ...existingMonths, ...freshMonths },
    };

    fs.writeFileSync(filePath, JSON.stringify(merged));
    console.log(`   → saved (${Object.keys(merged.months).length} months total)`);

    if (cities.length > 1) await sleep(1200); // 1.2s between cities
  }

  console.log(`\n✅ Done — ${totalOk} months fetched, ${totalFail} failed`);
  if (totalFail > 0) console.warn('⚠️  Some months failed — re-run the failed cities individually to retry');
  console.log('\nNext step:');
  console.log('  git add src/prayer-data');
  console.log(`  git commit -m "data(prayer): ${year} static times${isCorrectionMode ? ' — correction ' + cityArg + '/' + monthArg : ''} "`);
  console.log('  git push origin main');
}

main().catch(e => { console.error('\n💥', e.message || e); process.exit(1); });
