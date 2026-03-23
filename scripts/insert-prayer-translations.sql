-- Insert ALL prayer-times translation keys into kurdish_translations (page = android)
-- Already executed 2026-03-05 via Supabase MCP. All 47 keys upserted successfully.
-- Run this in your Supabase SQL editor to make all prayer texts editable
-- from the admin translations panel → Android tab → prayer / notification category.
--
-- Covers:
--   • All existing prayer keys from kmr.json
--   • NEW keys previously hardcoded in prayer.ui.js / prayer.notifications.android.js:
--       voice_label, duration_label, dur_10s/20s/30s/60s/full,
--       channel_desc, test_notif_title, test_notif_body

INSERT INTO kurdish_translations (key_id, kurdish_text, page, category, context)
VALUES
  -- Tab & header
  ('tabs.prayer',              'نوێژ',                                    'android', 'tabs',         'Bottom nav tab label for prayer times'),
  ('header.prayer',            'کاتا نوێژ',                               'android', 'header',       'Panel header title for prayer times'),

  -- Prayer names
  ('prayer.fajr',              'فەجر',                                    'android', 'prayer',       'Fajr (dawn) prayer name'),
  ('prayer.sunrise',           'ڕۆژهەلات',                                'android', 'prayer',       'Sunrise time label'),
  ('prayer.dhuhr',             'نیوەڕۆ',                                  'android', 'prayer',       'Dhuhr (midday) prayer name'),
  ('prayer.asr',               'ئێوارەی',                                 'android', 'prayer',       'Asr (afternoon) prayer name'),
  ('prayer.maghrib',           'ئاوابوون',                                 'android', 'prayer',       'Maghrib (sunset) prayer name'),
  ('prayer.isha',              'عیشا',                                    'android', 'prayer',       'Isha (night) prayer name'),

  -- Countdown & next prayer
  ('prayer.next',              'نوێژا داهاتو',                             'android', 'prayer',       'Label above countdown: Next prayer'),
  ('prayer.tomorrow',          'سبەیکو',                                   'android', 'prayer',       'Appended to countdown after Isha when showing tomorrow''s Fajr'),

  -- Settings sheet
  ('prayer.settings_title',    'ڕێکخستنێن نوێژ',                          'android', 'prayer',       'Settings bottom-sheet title'),
  ('prayer.city_label',        'شار',                                     'android', 'prayer',       'Section label above city selector grid'),
  ('prayer.method_label',      'ڕێبازا حیساب',                            'android', 'prayer',       'Section label above calculation method selector'),
  ('prayer.method_diyanet',    'دیانەت — تورکیا (13)',                     'android', 'prayer',       'Calculation method: Diyanet / Turkey'),
  ('prayer.method_mwl',        'لیگا جیھانی موسلمانان (3)',               'android', 'prayer',       'Calculation method: Muslim World League'),
  ('prayer.method_uaq',        'ئوم الکورا (4)',                           'android', 'prayer',       'Calculation method: Umm Al-Qura (Saudi)'),
  ('prayer.format_label',      'شێوازا کات',                              'android', 'prayer',       'Section label above 24h / 12h time format toggle'),

  -- Athan toggles
  ('prayer.athan_section',     'ئاگاداری ئەزان',                           'android', 'prayer',       'Section label above per-prayer athan notification toggles'),
  ('prayer.enable_athan',      'چالاككرنا ئازان',                          'android', 'prayer',       'Master toggle label: enable all athan notifications'),

  -- Voice picker (NEW — was hardcoded)
  ('prayer.voice_label',       'دەنگی ئازان',                             'android', 'prayer',       'Section label above athan voice (reciter) picker'),

  -- Duration picker (NEW — was hardcoded)
  ('prayer.duration_label',    'کاتی ئازان',                              'android', 'prayer',       'Section label above athan playback duration buttons'),
  ('prayer.dur_10s',           '10 چ',                                    'android', 'prayer',       'Duration button: stop athan after 10 seconds'),
  ('prayer.dur_20s',           '20 چ',                                    'android', 'prayer',       'Duration button: stop athan after 20 seconds'),
  ('prayer.dur_30s',           '30 چ',                                    'android', 'prayer',       'Duration button: stop athan after 30 seconds'),
  ('prayer.dur_60s',           '60 چ',                                    'android', 'prayer',       'Duration button: stop athan after 60 seconds'),
  ('prayer.dur_full',          'تەواو',                                    'android', 'prayer',       'Duration button: play full athan to end'),

  -- Loading / error states
  ('prayer.loading',           'چاوبیرکرن...',                             'android', 'prayer',       'Spinner text while fetching prayer times'),
  ('prayer.error',             'هەلەیەک هەیە. دووباره هەوڵبدە.',          'android', 'prayer',       'Error message when prayer-time fetch fails'),
  ('prayer.retry',             'دووباره هەوڵبدە',                          'android', 'prayer',       'Retry button label after error'),

  -- Qibla compass
  ('prayer.qibla_title',       'ئیستیقامەتا قیبلە',                        'android', 'prayer',       'Qibla compass sheet title'),
  ('prayer.qibla_direction',   'ئاراستە',                                  'android', 'prayer',       'Qibla — direction chip label (shows degrees)'),
  ('prayer.qibla_distance',    'دووری',                                    'android', 'prayer',       'Qibla — distance chip label (shows km to Mecca)'),
  ('prayer.qibla_approx',      'نزیکەوە',                                  'android', 'prayer',       'Qibla — approximate badge when using city coords instead of GPS'),
  ('prayer.qibla_locating',    'دیارکرنا شوین...',                         'android', 'prayer',       'Qibla — shown while GPS is acquiring location'),
  ('prayer.qibla_no_loc',      'ناکارە بوی دیارکرنا شوین',                'android', 'prayer',       'Qibla — shown when GPS / location permission unavailable'),

  -- Notifications
  ('prayer.notif_title',       'بانگ',                                                    'android', 'notification', 'Athan notification title in status bar'),
  ('prayer.notif_body',        'نوکە دەمێ بانگێ ${prayer} یە',                            'android', 'notification', 'Athan notification body — ${prayer} = Kurdish prayer name e.g. نیڤرو'),
  ('prayer.channel_desc',      'ئاگاداریێن کاتا نوێژ',                                    'android', 'notification', 'Android notification channel description (shown in system sound settings)'),
  ('prayer.test_notif_title',  'تێستی ئازان',                                             'android', 'notification', 'Test notification title (10-second test from prayer settings)'),
  ('prayer.test_notif_body',   'تاقیکردنا بانگ — ئاگادارکرن چاکە دیکا!',                 'android', 'notification', 'Test notification body — confirms real athan will play at prayer time'),

  -- Athan action buttons (Test + Reschedule) — NEW
  ('prayer.test_btn',          'تاقیکرن (10چ)',                                            'android', 'prayer',       'Button label: send a test athan notification in 10 seconds'),
  ('prayer.resched_btn',       'دابینکرنا نوی',                                            'android', 'prayer',       'Button label: force-reschedule all 7 days of athan notifications now'),

  -- Toast / feedback messages — NEW
  ('prayer.test_sent',         'ئاگادارکرنا تاقیکرنێ دهات ل 10 چرکەدا',                  'android', 'prayer',       'Toast: test notification was scheduled, arrives in 10 seconds'),
  ('prayer.test_failed',       'هەلە — ئاگادارکرن نەشکێت',                                'android', 'prayer',       'Toast: test notification scheduling failed'),
  ('prayer.scheduled_ok',      'دابین کرا: ${count} بانگ',                                 'android', 'prayer',       'Toast after successful reschedule — ${count} = number of notifications scheduled'),
  ('prayer.scheduled_zero',    'هیچ بانگ نەدابینکرا — ڕۆژا نوی تازەبیت',                  'android', 'prayer',       'Toast when 0 notifications scheduled (all prayer times today already passed)'),
  ('prayer.no_data',           'داتا نیه — ئینتەرنێت پشکنی',                               'android', 'prayer',       'Toast when fetchDaysData returns empty (no network, no cache)'),
  ('prayer.perm_denied',       'ئازن نەدرا — ئیجازەت پێدە',                               'android', 'prayer',       'Toast when notification permission is denied by user'),
  ('prayer.athan_off',         'بانگ هاتنە',                                               'android', 'prayer',       'Toast when user disables athan notifications master toggle')

ON CONFLICT (key_id) DO UPDATE SET
  kurdish_text = EXCLUDED.kurdish_text,
  page         = EXCLUDED.page,
  category     = EXCLUDED.category,
  context      = EXCLUDED.context,
  updated_at   = NOW();
