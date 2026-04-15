/**
 * Lists all keys in kurdish_translations that still have English/untranslated text.
 * Run: node scripts/check-untranslated.js
 */
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const kurdishRe = /[\u0600-\u06FF]/;

function fetchConfig() {
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
  const cfg = await fetchConfig();
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseKey);

  let all = [], offset = 0;
  while (true) {
    const { data, error } = await sb.from('kurdish_translations')
      .select('key_id, kurdish_text, page, category')
      .range(offset, offset + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  const untranslated = all.filter(r => !r.kurdish_text || !kurdishRe.test(r.kurdish_text));

  if (!untranslated.length) {
    console.log('✅ All keys translated!');
    return;
  }

  // Group by category
  const byCategory = {};
  untranslated.forEach(r => {
    const cat = r.category || r.page || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r.key_id);
  });

  console.log(`\n❌ ${untranslated.length} untranslated keys:\n`);
  Object.keys(byCategory).sort().forEach(cat => {
    console.log(`[${cat}] — ${byCategory[cat].length} keys`);
    byCategory[cat].forEach(k => console.log(`  ${k}`));
  });
}

main().catch(e => { console.error(e.message); process.exit(1); });
