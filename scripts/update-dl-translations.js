/**
 * Updates dl.* and toast.dl_* rows in kurdish_translations with Kurdish text.
 * Uses UPDATE (not insert) so existing rows are overwritten.
 *
 * Run: node scripts/update-dl-translations.js
 */
const https  = require('https');
const { createClient } = require('@supabase/supabase-js');

const UPDATES = [
  { key_id: 'dl.section',          kurdish_text: 'داخستن' },
  { key_id: 'dl.storage_used',     kurdish_text: 'شوێنا بکارهاتی' },
  { key_id: 'dl.no_reciters',      kurdish_text: 'هیچ دەنگخوێنێک نەهاتیە داخسترن. ژبۆ گوهداری بێ ئینترنەتێ، بشکوڵکا ↓ ئەفشار بکە' },
  { key_id: 'dl.full_quran',       kurdish_text: 'تەواوی قورئانێ' },
  { key_id: 'dl.surahs',           kurdish_text: 'سورە' },
  { key_id: 'dl.manage',           kurdish_text: 'رێڤەبرن' },
  { key_id: 'dl.remove',           kurdish_text: 'ژێبرن' },
  { key_id: 'dl.not_downloaded',   kurdish_text: 'نەهاتیە داخسترن' },
  { key_id: 'dl.measuring',        kurdish_text: 'پێوانەکرن...' },
  { key_id: 'dl.downloading',      kurdish_text: 'داخستن...' },
  { key_id: 'dl.fully_downloaded', kurdish_text: 'تەواو داخسترا' },
  { key_id: 'dl.surah_downloaded', kurdish_text: 'سورە داخسترا' },
  { key_id: 'dl.partial',          kurdish_text: 'بەشێک داخسترا' },
  { key_id: 'dl.partial_surahs',   kurdish_text: 'بەشێک داخسترا ({n}/114 سورە)' },
  { key_id: 'dl.partial_issues',   kurdish_text: 'بەشێک داخسترا — کێشەی تەندروستیێ هەیە' },
  { key_id: 'dl.left',             kurdish_text: 'مایە' },
  { key_id: 'dl.failed_check',     kurdish_text: 'تاقیکرنا تەندروستیێ شکست خوارد' },
  { key_id: 'dl.wifi_only',        kurdish_text: 'Wi-Fi تەنها' },
  { key_id: 'dl.wifi_blocked',     kurdish_text: 'دەستوورا Wi-Fi تەنها چالاکە. ب Wi-Fi ve girêde bide yan vê modeê rakin.' },
  { key_id: 'dl.verify',           kurdish_text: 'تاقیکرنا تەندروستیێ' },
  { key_id: 'dl.verifying',        kurdish_text: 'تاقیکردن...' },
  { key_id: 'dl.last_checked',     kurdish_text: 'دوا تاقیکرن' },
  { key_id: 'dl.not_verified',     kurdish_text: 'تەندروستی نەهاتیە تاقیکرن' },
  { key_id: 'dl.repair',           kurdish_text: 'چارەسەرکرن' },
  { key_id: 'dl.surah_word',       kurdish_text: 'سورە' },
  { key_id: 'dl.download_btn',     kurdish_text: 'داخستن' },
  { key_id: 'dl.continue_btn',     kurdish_text: 'داخستن بەردەوام بکە' },
  { key_id: 'dl.redownload_btn',   kurdish_text: 'دووبارە داخستن' },
  { key_id: 'dl.cancel',           kurdish_text: 'هەڵوەشاندنا داخستنێ' },
  { key_id: 'dl.tip_downloading',  kurdish_text: 'داخستن...' },
  { key_id: 'dl.tip_downloaded',   kurdish_text: 'داخسترا — بەکلیک بکە ژبۆ رێڤەبرنێ' },
  { key_id: 'dl.tip_downloaded_s', kurdish_text: 'داخسترا' },
  { key_id: 'dl.tip_partial',      kurdish_text: 'بەشێک داخسترا — بەکلیک بکە ژبۆ رێڤەبرنێ' },
  { key_id: 'dl.tip_partial_s',    kurdish_text: 'بەشێک داخسترا' },
  { key_id: 'dl.tip_corrupt',      kurdish_text: 'کێشەی تەندروستیێ — بەکلیک بکە چارەسەر بکە' },
  { key_id: 'dl.tip_corrupt_s',    kurdish_text: 'پێویستا چارەسەرکرنێ' },
  { key_id: 'dl.tip_offline',      kurdish_text: 'ژبۆ گوهداری بێ ئینترنەتێ داخستن' },
  { key_id: 'toast.dl_complete',   kurdish_text: 'داخستن تەمام بوو' },
  { key_id: 'toast.dl_removed',    kurdish_text: 'داخستن هاتە ژێبرن' },
  { key_id: 'toast.dl_stopped',    kurdish_text: 'داخستن هاتە وەستاندن' },
];

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
  console.log('Fetching config...');
  const cfg = await fetchConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseKey) throw new Error('No supabase config');

  const sb = createClient(cfg.supabaseUrl, cfg.supabaseKey);

  let updated = 0, errors = 0;
  for (const row of UPDATES) {
    const { error } = await sb
      .from('kurdish_translations')
      .update({ kurdish_text: row.kurdish_text })
      .eq('key_id', row.key_id);
    if (error) {
      console.error(`FAIL [${row.key_id}]: ${error.message}`);
      errors++;
    } else {
      console.log(`OK   ${row.key_id}`);
      updated++;
    }
  }
  console.log(`\nDone. Updated: ${updated}  Errors: ${errors}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
