-- Insert new Settings tab translation keys into kurdish_translations (page = android)
-- Run this in your Supabase SQL editor to make these editable from the admin translations panel.

INSERT INTO kurdish_translations (key_id, kurdish_text, page, category, context)
VALUES
  ('settings.stats_ayahs',      'ئایەت خوێندیە',                          'android', 'settings', 'Stats card — ayahs read label'),
  ('settings.stats_streak',     'ڕیزا ڕۆژان',                             'android', 'settings', 'Stats card — reading streak label'),
  ('settings.stats_bookmarks',  'نیشانکراو',                               'android', 'settings', 'Stats card — bookmarks count label'),
  ('settings.auto_advance',     'ئۆتۆماتیکی بڕوە بۆ سورەی دواتر',         'android', 'settings', 'Auto-advance surah toggle label'),
  ('settings.auto_advance_sub', 'کاتێ دەنگی سورەیەک تەواو بێت',           'android', 'settings', 'Auto-advance surah sublabel'),
  ('settings.scroll_follows',   'سکرین شوێن دەنگ دەکەوێت',                'android', 'settings', 'Scroll follows audio toggle label'),
  ('settings.scroll_follows_sub','ئایەتی دەنگ بخستینە ناوەند',             'android', 'settings', 'Scroll follows audio sublabel'),
  ('settings.notif_group',      'ئاگادارکردن و لەرزان',                    'android', 'settings', 'Notifications & Haptics group title'),
  ('settings.haptic',           'لەرزانی دەست',                            'android', 'settings', 'Haptic feedback toggle label'),
  ('settings.haptic_sub',       'ڤایبریشن کاتی تێپەڕینی ئامانج',          'android', 'settings', 'Haptic feedback sublabel'),
  ('settings.reminder',         'یادەوەریی ڕۆژانە',                        'android', 'settings', 'Daily reminder toggle label'),
  ('settings.reminder_sub',     'کاتی خوێندن دابنێ',                       'android', 'settings', 'Daily reminder sublabel'),
  ('settings.sync_label',       'دووبارە هاوکێشەکردن',                     'android', 'settings', 'Sync row label'),
  ('settings.sync_last',        'کاتی دوایین:',                            'android', 'settings', 'Sync row — last synced prefix'),
  ('settings.sync_never',       'هەرگیز',                                   'android', 'settings', 'Sync row — never synced text'),
  ('settings.sync_btn',         'هاوکێشە',                                  'android', 'settings', 'Sync button text'),
  ('settings.export_bookmarks', 'هەڵکێشانی نیشانکراوەکان',                 'android', 'settings', 'Export bookmarks row label'),
  ('settings.export_btn',       'هەڵبژاردن',                               'android', 'settings', 'Export bookmarks button text'),
  ('settings.reset_progress',   'سڕینەوەی پێشکەوتنی خوێندن',              'android', 'settings', 'Reset reading progress row label'),
  ('settings.reset_btn',        'سڕینەوە',                                  'android', 'settings', 'Reset reading progress button text'),
  ('settings.reset_confirm',    'دڵنیای؟ هەموو تۆمارەکانی خوێندن سڕاوە دەبن.', 'android', 'settings', 'Reset reading progress confirm dialog'),
  ('settings.app_group',        'ئەپ',                                      'android', 'settings', 'App group title in settings'),
  ('settings.share_app',        'بەشکردنی ئەپ',                            'android', 'settings', 'Share app row label'),
  ('settings.share_btn',        'بەشکردن',                                  'android', 'settings', 'Share app button text'),
  ('settings.rate_app',         'هەڵسەنگاندنی ئەپ',                        'android', 'settings', 'Rate app row label'),
  ('settings.rate_btn',         'هەڵسەنگاندن',                             'android', 'settings', 'Rate app button text'),
  ('toast.sync_started',        'هاوکێشەکردن دەستپێکرد…',                  'android', 'toast',    'Toast: sync started'),
  ('toast.no_bookmarks',        'هیچ نیشانکراوەیەک نییە',                  'android', 'toast',    'Toast: no bookmarks to export'),
  ('toast.progress_reset',      'پێشکەوتنی خوێندن سڕایەوە',               'android', 'toast',    'Toast: reading progress reset'),
  ('toast.link_copied',         'لینک کۆپی کرا',                           'android', 'toast',    'Toast: link copied to clipboard'),
  ('notif.reminder_body',       'خوێندنا قورئانێ — بابڵێ بخوێنی!',        'android', 'notification', 'Daily reminder notification body text')
ON CONFLICT (key_id, page) DO NOTHING;
