-- Seed new site_settings keys for About + Social
-- Run once in Supabase SQL editor.
-- Uses ON CONFLICT DO UPDATE so empty/missing values are filled in,
-- but existing non-empty values are NOT overwritten.

INSERT INTO site_settings (key, value) VALUES
  ('founder_name',       'سامان عبدالرحمن'),
  ('founder_role',       'دامەزرێنەرێ تەفسیر کورد'),
  ('founder_bio',        'بەندەیەکێ خودایێ مەزن ژ دۆهۆکا هەرێما کوردستانا عیراقێ. ئەڤ پلاتفۆرم ب ڤیانا مەزن دامەزراند بۆ خزمەتکرنا پەرتوکا خودای و گەهاندنا مانایێن قورئانا پیرۆز بۆ گەلێ کورد ل سەرانسەری جیهانێ.'),
  ('about_app_text',     'تەفسیر کورد پلاتفۆرمەکا دیجیتاڵیەیە بۆ خواندنا قورئانا پیرۆز و تەفسیرا وی ب زمانێ کوردی — ب ڕێکا مالپەڕ و ئەپلیکەشنێ مۆبایل، بۆ هەمی کوردان ل سەرانسەری جیهانێ.'),
  ('social_instagram',   ''),
  ('social_youtube',     ''),
  ('social_tiktok',      ''),
  ('social_telegram',    ''),
  ('social_website',     'https://tafsirkurd.com')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value
  WHERE site_settings.value = '' OR site_settings.value IS NULL;
