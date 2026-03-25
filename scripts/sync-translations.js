/**
 * Syncs bulk-translations.js → Supabase kurdish_translations table.
 * Inserts only NEW keys (skips existing ones).
 *
 * Run: node scripts/sync-translations.js
 */
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const vm = require('vm');

// Load BULK_TRANSLATIONS by running the file in a sandbox context
const src = require('fs').readFileSync(__dirname + '/../src/utils/bulk-translations.js', 'utf8');
const ctx = { window: {} };
vm.runInNewContext(src, ctx);
const ENTRIES = ctx.window.BULK_TRANSLATIONS || ctx.BULK_TRANSLATIONS || [];

async function fetchConfig() {
  return new Promise((resolve, reject) => {
    https.request('https://tafsirkurd.com/config', {
      headers: { 'Origin': 'https://tafsirkurd.com' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject).end();
  });
}

async function main() {
  console.log('Fetching config...');
  const cfg = await fetchConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseKey) throw new Error('No supabase config');

  const sb = createClient(cfg.supabaseUrl, cfg.supabaseKey);

  // Load all existing key_ids in one pass
  console.log('Loading existing keys...');
  const existing = new Set();
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from('kurdish_translations').select('key_id').range(offset, offset + 999);
    if (error) throw error;
    data.forEach(r => existing.add(r.key_id));
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log('Existing keys in Supabase:', existing.size);

  // Filter to new-only
  const newEntries = ENTRIES.filter(e => !existing.has(e.key_id));
  console.log('New keys to insert:', newEntries.length);
  if (!newEntries.length) { console.log('Nothing to do.'); return; }

  // Insert in batches of 50
  let added = 0, errors = 0;
  for (let i = 0; i < newEntries.length; i += 50) {
    const batch = newEntries.slice(i, i + 50).map(e => ({
      key_id: e.key_id,
      kurdish_text: e.kurdish_text,
      page: e.page || 'android',
      category: e.category || 'general',
      context: e.context || ''
    }));
    process.stdout.write(`Inserting ${Math.min(i + 50, newEntries.length)}/${newEntries.length}...\r`);
    const { error } = await sb.from('kurdish_translations').insert(batch);
    if (error) {
      for (const row of batch) {
        const { error: e2 } = await sb.from('kurdish_translations').insert([row]);
        if (e2) { console.error('\nFailed:', row.key_id, e2.message); errors++; }
        else added++;
      }
    } else {
      added += batch.length;
    }
  }
  console.log(`\nDone. Added: ${added}  Errors: ${errors}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
