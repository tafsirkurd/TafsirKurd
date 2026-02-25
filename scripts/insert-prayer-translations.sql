-- Insert Prayer tab translation keys into kurdish_translations (page = android)
-- Run this in your Supabase SQL editor to make these editable from the admin translations panel.

INSERT INTO kurdish_translations (key_id, kurdish_text, page, category, context)
VALUES
  -- Tab & Header
  ('tabs.prayer',           'نوێژ',                                   'android', 'tabs',    'Prayer tab label in bottom navigation'),
  ('header.prayer',         'کاتا نوێژ',                              'android', 'header',  'Prayer tab page header title'),

  -- Prayer names
  ('prayer.fajr',           'فەجر',                                   'android', 'prayer',  'Fajr (dawn) prayer name'),
  ('prayer.sunrise',        'ڕۆژهەلات',                               'android', 'prayer',  'Sunrise time label'),
  ('prayer.dhuhr',          'نیوەڕۆ',                                 'android', 'prayer',  'Dhuhr (midday) prayer name'),
  ('prayer.asr',            'ئێوارەی',                                'android', 'prayer',  'Asr (afternoon) prayer name'),
  ('prayer.maghrib',        'ئاوابوون',                               'android', 'prayer',  'Maghrib (sunset) prayer name'),
  ('prayer.isha',           'عیشا',                                   'android', 'prayer',  'Isha (night) prayer name'),

  -- Countdown & next prayer
  ('prayer.next',           'نوێژا داهاتو',                           'android', 'prayer',  'Label above countdown: "Next prayer"'),
  ('prayer.tomorrow',       'سبەیکو',                                 'android', 'prayer',  'Tomorrow label shown after Isha when counting to next Fajr'),

  -- Settings sheet
  ('prayer.settings_title', 'ڕێکخستنێن نوێژ',                        'android', 'prayer',  'Settings sheet title'),
  ('prayer.city_label',     'شار',                                    'android', 'prayer',  'City selector section label in settings'),
  ('prayer.method_label',   'ڕێبازا حیساب',                          'android', 'prayer',  'Calculation method section label in settings'),
  ('prayer.method_diyanet', 'دیانەت — تورکیا (13)',                   'android', 'prayer',  'Diyanet / Turkey calculation method option'),
  ('prayer.method_mwl',     'لیگا جیھانی موسلمانان (3)',              'android', 'prayer',  'Muslim World League calculation method option'),
  ('prayer.method_uaq',     'ئوم الکورا (4)',                         'android', 'prayer',  'Umm Al-Qura (Saudi) calculation method option'),
  ('prayer.format_label',   'شێوازا کات',                            'android', 'prayer',  'Time format section label (24h / 12h toggle)'),

  -- Athan notifications
  ('prayer.athan_section',  'ئاگاداری ئەزان',                        'android', 'prayer',  'Athan notifications section title in settings'),
  ('prayer.enable_athan',   'چالاککرنا ئازان',                       'android', 'prayer',  'Master toggle label: enable athan notifications'),
  ('prayer.notif_title',    'کاتا نوێژ',                             'android', 'prayer',  'Athan notification title text'),
  ('prayer.notif_body',     'کاتا ${prayer} گهیشتە ${city}',         'android', 'prayer',  'Athan notification body — ${prayer} and ${city} are replaced at runtime'),

  -- UI states
  ('prayer.loading',        'چاوبیرکرن...',                           'android', 'prayer',  'Loading spinner message while fetching prayer times'),
  ('prayer.error',          'هەلەیەک هەیە. دووباره هەوڵبدە.',        'android', 'prayer',  'Error message when prayer times fail to load'),
  ('prayer.retry',          'دووباره هەوڵبدە',                       'android', 'prayer',  'Retry button text after error'),

  -- Qibla compass
  ('prayer.qibla_title',    'ئیستیقامەتا قیبلە',                     'android', 'prayer',  'Qibla compass modal title'),
  ('prayer.qibla_direction','ئاراستە',                               'android', 'prayer',  'Direction chip label in Qibla compass (shows degrees)'),
  ('prayer.qibla_distance', 'دووری',                                  'android', 'prayer',  'Distance chip label in Qibla compass (shows km to Mecca)'),
  ('prayer.qibla_approx',   'نزیکەوە',                               'android', 'prayer',  'Approximate badge shown when using city coords instead of GPS'),
  ('prayer.qibla_locating', 'دیارکرنا شوین...',                      'android', 'prayer',  'Loading text shown while GPS is acquiring location'),
  ('prayer.qibla_no_loc',   'ناکارە بوی دیارکرنا شوین',             'android', 'prayer',  'Error text shown when location is unavailable')

ON CONFLICT (key_id) DO UPDATE SET
  kurdish_text = EXCLUDED.kurdish_text,
  page         = EXCLUDED.page,
  category     = EXCLUDED.category,
  context      = EXCLUDED.context,
  updated_at   = NOW();
