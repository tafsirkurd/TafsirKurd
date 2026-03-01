-- ============================================================
-- Gencine (Religious Treasure) Tab — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Categories table
-- Drives the home screen cards AND the dua category filter tabs
CREATE TABLE IF NOT EXISTS gencine_categories (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,   -- e.g. 'morning', 'evening', custom slugs
  label_ku    TEXT NOT NULL,          -- Badini Kurdish label, e.g. 'بەیانیکردن'
  image_name  TEXT,                   -- filename stored in /assets/icons/, e.g. 'genc-morning-bg.webp'
  description TEXT,                   -- short description shown on home card subtitle
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Duas table
CREATE TABLE IF NOT EXISTS gencine_duas (
  id          BIGSERIAL PRIMARY KEY,
  category_key TEXT NOT NULL,         -- FK to gencine_categories.key
  ar          TEXT NOT NULL,          -- Arabic text
  ku          TEXT NOT NULL,          -- Badini Kurdish translation
  source      TEXT,                   -- Hadith source, e.g. 'بخاری'
  repeat      INTEGER DEFAULT 1,      -- how many times to recite
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hadiths table
CREATE TABLE IF NOT EXISTS gencine_hadiths (
  id          BIGSERIAL PRIMARY KEY,
  ar          TEXT NOT NULL,          -- Arabic text
  ku          TEXT NOT NULL,          -- Badini Kurdish translation
  source      TEXT,                   -- Hadith source, e.g. 'بخاری'
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE gencine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE gencine_duas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gencine_hadiths    ENABLE ROW LEVEL SECURITY;

-- Public read (app users)
CREATE POLICY "gencine_categories_public_read"
  ON gencine_categories FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "gencine_duas_public_read"
  ON gencine_duas FOR SELECT TO anon, authenticated USING (active = TRUE);
CREATE POLICY "gencine_hadiths_public_read"
  ON gencine_hadiths FOR SELECT TO anon, authenticated USING (active = TRUE);

-- Admin write (service_role bypasses RLS; these policies cover authenticated admin users)
CREATE POLICY "gencine_categories_admin_all"
  ON gencine_categories FOR ALL TO authenticated
  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "gencine_duas_admin_all"
  ON gencine_duas FOR ALL TO authenticated
  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "gencine_hadiths_admin_all"
  ON gencine_hadiths FOR ALL TO authenticated
  USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- Seed — Categories (matches current hardcoded CAT_KEYS)
-- ============================================================
INSERT INTO gencine_categories (key, label_ku, image_name, description, sort_order) VALUES
  ('morning', 'بەیانیکردن', 'genc-dua-bg.webp',     'دعاهای بەیانی',           10),
  ('evening', 'ئێواربوون',  'genc-dua-bg.webp',     'دعاهای ئێوار',            20),
  ('travel',  'گەشت',       'genc-dua-bg.webp',     'دعاهای مسافرەتێ',        30),
  ('eating',  'خواردن',     'genc-dua-bg.webp',     'دعاهای بەرپێشیا خwaردنێ', 40),
  ('sleep',   'خەو',        'genc-dua-bg.webp',     'دعاهای پێشیا خەوێ',      50),
  ('general', 'گشتی',       'genc-dua-bg.webp',     'دعاهای گشتی',             60)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Seed — Duas (from dua-data.js)
-- ============================================================
INSERT INTO gencine_duas (category_key, ar, ku, source, repeat, sort_order) VALUES

-- Morning
('morning', 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
  'بەیانیمان بوو و مولکەکە ژ بۆ خودایە، ستایش ژ بۆ خودایە، هیچ پەرستگەر نیه جگە لە خودا تەنیا، هاوبەشی نیه، مولک ژ بۆ ئویە و ستایش ژ بۆ ئویە، ئەوی بر هەر شتێکی توانایە',
  'مسلم', 1, 10),

('morning', 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
  'خودایە! ژ بەرکەتا تۆ بەیانی بووین، ژ بەرکەتا تۆ ئێوار بووین، ژ بەرکەتا تۆ ژیین، ژ بەرکەتا تۆ دمرین، و گەشتیبوون بۆ لا تۆیە',
  'ترمذی', 1, 20),

('morning', 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
  'خودایە! تۆ پەروەردگارا من ی، هیچ پەرستگەر نیه جگه لە تۆ، تۆ من دامەزراند و من خزمەتکارا تۆم، و من بر پەیمانا تۆ ئەقدەرا منە',
  'بخاری', 1, 30),

('morning', 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ — اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
  'پناه دبرم ب خودا ژ شەیتانی ڕەقاندی — خودا، هیچ پەرستگەر نیه جگه لە ئەو، ئەوی ژیان، ئەوی ئایندە',
  'آیة الكرسي — بخاری', 1, 40),

('morning', 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
  'ب ناوا خودایی کە ب ناوا ئەو هیچ شتێک ل زمین و ئاسمانێ زیان ناکە، ئەوی بیهیست و زانایە',
  'ابو داود — ترمذی', 3, 50),

-- Evening
('evening', 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
  'ئێوار بووین و مولکەکە ژ بۆ خودایە، ستایش ژ بۆ خودایە، هیچ پەرستگەر نیه جگه لە خودا تەنیا، هاوبەشی نیه',
  'مسلم', 1, 10),

('evening', 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
  'خودایە! ژ بەرکەتا تۆ ئێوار بووین، ژ بەرکەتا تۆ بەیانی بووین، ژ بەرکەتا تۆ ژیین، ژ بەرکەتا تۆ دمرین، و گەشتیبوون بۆ لا تۆیە',
  'ترمذی', 1, 20),

('evening', 'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ',
  'خودایە! من ئێوار بوومە و تۆ، وەزیفەدارێن عەرشا تۆ، فریشتەکانا تۆ و هەمو دامەزراندینا تۆ گواه دکم کە تۆ خودایی و هیچ پەرستگەر نیه جگه لە تۆ',
  'ابو داود', 4, 30),

('evening', 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي',
  'خودایە! تەندرووستیا بدە ب لەشا من، خودایە! تەندرووستیا بدە ب گوهێن من، خودایە! تەندرووستیا بدە ب چاوێن من',
  'ابو داود', 3, 40),

('evening', 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
  'پناه دبرم ب کلیلمێن تەواوێن خودا ژ خراپی ئەوچی دامەزراند',
  'مسلم', 3, 50),

-- Travel
('travel', 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
  'خودا گەورەتر، خودا گەورەتر، خودا گەورەتر، پیرۆز بێت ئەوی کو ئەمە بۆ من سوارکرد و من توانای کونترولا ئەو نەبووم، و من بۆ لا پەروەردگارا خو دگەرم',
  'مسلم — ابو داود', 1, 10),

('travel', 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى',
  'خودایە! ل ئەم گەشتا خو ما خێرخوازی و پارێزگاری داخوازین، و ژ کاران ئەوی تۆ ئەو قبووڵ دکی',
  'مسلم', 1, 20),

('travel', 'اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الْأَهْلِ',
  'خودایە! تۆ هاوکارا ل گەشتە، و جێگر ل مال و خێزانا',
  'مسلم', 1, 30),

-- Eating
('eating', 'بِسْمِ اللَّهِ',
  'ب ناوا خودا',
  'ابو داود', 1, 10),

('eating', 'اللَّهُمَّ بَارِكْ لَنَا فِيهِ وَأَطْعِمْنَا خَيْرًا مِنْهُ',
  'خودایە! ب خێرا ئەمەیی بدە و خواردنا بهتر ل ئەمی بدە ما',
  'ترمذی', 1, 20),

('eating', 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
  'ستایش ژ بۆ خودایی کو ما خواراند و ما دایاند و کرما موسلمانان',
  'ابو داود — ترمذی', 1, 30),

-- Sleep
('sleep', 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
  'ب ناوا تۆ خودایە، دمرم و ژیایم',
  'بخاری', 1, 10),

('sleep', 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
  'خودایە! بپارێزە من ژ شتاکا تۆ ل ڕۆژا تۆ خزمەتکاران هەلدی',
  'ابو داود', 3, 20),

('sleep', 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ',
  'پیرۆزی بۆ تۆ خودایە و ستایشا تۆ، گواه دم کە هیچ پەرستگەر نیه جگه لە تۆ، لێبووردن داخوازیم و توبەیێ دکم بۆ لا تۆ',
  'نسائی', 1, 30),

-- General
('general', 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
  'پەروەردگارا ما! بدە ما ل ئەم دنیایێ باشی و ل ئاخرەتێ باشی، و بپارێزە ما ژ شتاکا ئاگرێ',
  'البقرة 201', 1, 10),

('general', 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
  'خودایە! من ژ تۆ تەندرووستی ل دنیا و ئاخرەتێ داخوازیم',
  'ابن ماجه', 1, 20),

('general', 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
  'خودا ما بەسە و چ باش وەکیلێکە',
  'آل عمران 173', 3, 30),

('general', 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
  'هیچ پەرستگەر نیه جگه لە خودا تەنیا، هاوبەشی نیه، مولک ژ بۆ ئویە و ستایش ژ بۆ ئویە، ئەوی بر هەر شتێکی توانایە',
  'بخاری — مسلم', 10, 40);
