/**
 * Inserts all prayer translation keys into the kurdish_translations Supabase table.
 * Run with: node scripts/run-prayer-translations.js
 */
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

async function fetchConfig() {
  return new Promise((resolve, reject) => {
    const req = https.request('https://tafsirkurd.com/config', {
      headers: { 'Origin': 'https://tafsirkurd.com' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const RECORDS = [
  // Tab & Header
  { key_id: 'tabs.prayer',           kurdish_text: 'نوێژ',                                  page: 'android', category: 'tabs',    context: 'Prayer tab label in bottom navigation' },
  { key_id: 'header.prayer',         kurdish_text: 'کاتا نوێژ',                             page: 'android', category: 'header',  context: 'Prayer tab page header title' },
  // Prayer names
  { key_id: 'prayer.fajr',           kurdish_text: 'فەجر',                                  page: 'android', category: 'prayer',  context: 'Fajr (dawn) prayer name' },
  { key_id: 'prayer.sunrise',        kurdish_text: 'ڕۆژهەلات',                              page: 'android', category: 'prayer',  context: 'Sunrise time label' },
  { key_id: 'prayer.dhuhr',          kurdish_text: 'نیوەڕۆ',                                page: 'android', category: 'prayer',  context: 'Dhuhr (midday) prayer name' },
  { key_id: 'prayer.asr',            kurdish_text: 'ئێوارەی',                               page: 'android', category: 'prayer',  context: 'Asr (afternoon) prayer name' },
  { key_id: 'prayer.maghrib',        kurdish_text: 'ئاوابوون',                              page: 'android', category: 'prayer',  context: 'Maghrib (sunset) prayer name' },
  { key_id: 'prayer.isha',           kurdish_text: 'عیشا',                                  page: 'android', category: 'prayer',  context: 'Isha (night) prayer name' },
  // Countdown
  { key_id: 'prayer.next',           kurdish_text: 'نوێژا داهاتو',                          page: 'android', category: 'prayer',  context: 'Label above countdown: "Next prayer"' },
  { key_id: 'prayer.tomorrow',       kurdish_text: 'سبەیکو',                                page: 'android', category: 'prayer',  context: 'Tomorrow label shown after Isha' },
  // Settings
  { key_id: 'prayer.settings_title', kurdish_text: 'ڕێکخستنێن نوێژ',                       page: 'android', category: 'prayer',  context: 'Settings sheet title' },
  { key_id: 'prayer.city_label',     kurdish_text: 'شار',                                   page: 'android', category: 'prayer',  context: 'City selector section label in settings' },
  { key_id: 'prayer.method_label',   kurdish_text: 'ڕێبازا حیساب',                         page: 'android', category: 'prayer',  context: 'Calculation method section label' },
  { key_id: 'prayer.method_diyanet', kurdish_text: 'دیانەت — تورکیا (13)',                  page: 'android', category: 'prayer',  context: 'Diyanet / Turkey method option' },
  { key_id: 'prayer.method_mwl',     kurdish_text: 'لیگا جیھانی موسلمانان (3)',             page: 'android', category: 'prayer',  context: 'Muslim World League method option' },
  { key_id: 'prayer.method_uaq',     kurdish_text: 'ئوم الکورا (4)',                        page: 'android', category: 'prayer',  context: 'Umm Al-Qura (Saudi) method option' },
  { key_id: 'prayer.format_label',   kurdish_text: 'شێوازا کات',                           page: 'android', category: 'prayer',  context: 'Time format label (24h / 12h)' },
  // Athan
  { key_id: 'prayer.athan_section',  kurdish_text: 'ئاگاداری ئەزان',                       page: 'android', category: 'prayer',  context: 'Athan notifications section title' },
  { key_id: 'prayer.enable_athan',   kurdish_text: 'چالاککرنا ئازان',                      page: 'android', category: 'prayer',  context: 'Master toggle: enable athan notifications' },
  { key_id: 'prayer.notif_title',    kurdish_text: 'کاتا نوێژ',                            page: 'android', category: 'prayer',  context: 'Athan notification title' },
  { key_id: 'prayer.notif_body',     kurdish_text: 'کاتا ${prayer} گهیشتە ${city}',        page: 'android', category: 'prayer',  context: 'Athan notification body — ${prayer} and ${city} replaced at runtime' },
  // UI states
  { key_id: 'prayer.loading',        kurdish_text: 'چاوبیرکرن...',                          page: 'android', category: 'prayer',  context: 'Loading message while fetching prayer times' },
  { key_id: 'prayer.error',          kurdish_text: 'هەلەیەک هەیە. دووباره هەوڵبدە.',       page: 'android', category: 'prayer',  context: 'Error message when prayer times fail to load' },
  { key_id: 'prayer.retry',          kurdish_text: 'دووباره هەوڵبدە',                      page: 'android', category: 'prayer',  context: 'Retry button text after error' },
  // Qibla compass
  { key_id: 'prayer.qibla_title',    kurdish_text: 'ئیستیقامەتا قیبلە',                    page: 'android', category: 'prayer',  context: 'Qibla compass modal title' },
  { key_id: 'prayer.qibla_direction',kurdish_text: 'ئاراستە',                              page: 'android', category: 'prayer',  context: 'Direction chip label (shows degrees)' },
  { key_id: 'prayer.qibla_distance', kurdish_text: 'دووری',                                page: 'android', category: 'prayer',  context: 'Distance chip label (shows km to Mecca)' },
  { key_id: 'prayer.qibla_approx',   kurdish_text: 'نزیکەوە',                              page: 'android', category: 'prayer',  context: 'Approximate badge when using city coords instead of GPS' },
  { key_id: 'prayer.qibla_locating', kurdish_text: 'دیارکرنا شوین...',                     page: 'android', category: 'prayer',  context: 'Loading text while GPS acquires location' },
  { key_id: 'prayer.qibla_no_loc',   kurdish_text: 'ناکارە بوی دیارکرنا شوین',            page: 'android', category: 'prayer',  context: 'Error text when location unavailable' },
];

async function main() {
  console.log('Fetching Supabase config...');
  const cfg = await fetchConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseKey) {
    throw new Error('Missing supabaseUrl or supabaseKey in config response');
  }

  const supabase = createClient(cfg.supabaseUrl, cfg.supabaseKey);
  console.log(`Inserting ${RECORDS.length} prayer translation records...`);

  const { data, error } = await supabase
    .from('kurdish_translations')
    .upsert(RECORDS, { onConflict: 'key_id' });

  if (error) {
    console.error('Error inserting records:', error.message);
    process.exit(1);
  }

  console.log(`Done. ${RECORDS.length} records upserted into kurdish_translations.`);
  console.log('They now appear in the admin panel → Translations → Android → prayer category.');
}

main().catch(e => { console.error(e); process.exit(1); });
