-- Insert Gencine tab + Daily Verse notification translation keys
-- into kurdish_translations (page = android, Android tab in admin)
-- Already executed 2026-03-05 via Supabase MCP.

INSERT INTO kurdish_translations (key_id, kurdish_text, page, category, context) VALUES

  -- Gencine tab navigation
  ('tabs.gencine',             'گەنجینە',                          'android', 'tabs',     'Bottom nav tab label for Gencine (Religious Treasure) tab'),
  ('header.gencine',           'گەنجینەیا ئایینی',                 'android', 'header',   'Panel header title for Gencine tab'),

  -- Gencine section labels
  ('gencine.dua',              'دوعا',                             'android', 'gencine',  'Dua section label in Gencine home cards'),
  ('gencine.tasbih',           'تەسبیح',                           'android', 'gencine',  'Tasbih counter section label'),
  ('gencine.hadith',           'حەدیس',                            'android', 'gencine',  'Hadith section label'),

  -- Dua categories
  ('gencine.cat_morning',      'بەیانیکردن',                       'android', 'gencine',  'Morning adhkar category chip label'),
  ('gencine.cat_evening',      'ئێواربوون',                        'android', 'gencine',  'Evening adhkar category chip label'),
  ('gencine.cat_travel',       'گەشت',                             'android', 'gencine',  'Travel duas category chip label'),
  ('gencine.cat_eating',       'خواردن',                           'android', 'gencine',  'Eating duas category chip label'),
  ('gencine.cat_sleep',        'خەو',                              'android', 'gencine',  'Sleep duas category chip label'),
  ('gencine.cat_general',      'گشتی',                             'android', 'gencine',  'General duas category chip label'),

  -- Hadith coming-soon placeholder
  ('gencine.hadith_soon',      'بەمزوانە دێت',                     'android', 'gencine',  'Hadith section coming-soon title'),
  ('gencine.hadith_soon_sub',  'ئەم بەشە هەنووکا ئامادەدەبێت.\nبەمزوانە زیاد دەبێت!', 'android', 'gencine', 'Hadith section coming-soon subtitle'),

  -- Tasbih UI
  ('gencine.reset',            'سفر',                              'android', 'gencine',  'Tasbih reset button label'),
  ('gencine.tap_hint',         'بتەقینە',                          'android', 'gencine',  'Tasbih tap-to-count hint text'),

  -- Daily verse notification (Settings)
  ('settings.daily_verse',     'ئایەتا ڕۆژانە',                   'android', 'settings', 'Daily verse notification toggle label'),
  ('settings.daily_verse_sub', 'هەر ڕۆژ یەک ئایەتێ هەزانديار',   'android', 'settings', 'Daily verse notification toggle sublabel'),

  -- Prayer keys missing from earlier script
  ('prayer.cached_data',       'داتای کاش — دەمێ دوا نوێکراوە',  'android', 'prayer',   'Shown when prayer data is loaded from cache'),
  ('prayer.offline_no_cache',  'بێ ئینتەرنێت — داتایەک نەدیتووە','android', 'prayer',   'Shown when offline and no cache available')

ON CONFLICT (key_id) DO NOTHING;
