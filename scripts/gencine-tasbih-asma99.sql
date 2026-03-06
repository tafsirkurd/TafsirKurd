-- ── Tasbih dhikr items ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gencine_tasbih (
  id          bigserial PRIMARY KEY,
  ar          text        NOT NULL,
  ku          text        NOT NULL DEFAULT '',
  sort_order  int         NOT NULL DEFAULT 10,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE gencine_tasbih ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tasbih"  ON gencine_tasbih FOR SELECT USING (active = true);
CREATE POLICY "auth write tasbih"   ON gencine_tasbih USING (auth.role() = 'authenticated');

-- Default dhikr items (matches hardcoded DHIKR_LIST fallback)
INSERT INTO gencine_tasbih (ar, ku, sort_order) VALUES
  ('سُبْحَانَ اللَّهِ',                       'سبحان الله',              10),
  ('الْحَمْدُ لِلَّهِ',                       'الحمد لله',               20),
  ('اللَّهُ أَكْبَرُ',                        'الله أكبر',               30),
  ('لَا إِلَهَ إِلَّا اللَّهُ',               'لا اله الا الله',          40),
  ('أَسْتَغْفِرُ اللَّهَ',                    'استغفر الله',             50),
  ('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',          'سبحان الله وبحمده',       60),
  ('سُبْحَانَ اللَّهِ الْعَظِيمِ',            'سبحان الله العظیم',       70),
  ('اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',        'صلات بەسەر پێغەمبەر',     80),
  ('لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ','لا حوله ولا قوه',        90),
  ('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',   'بسم الله الرحمن الرحیم', 100)
ON CONFLICT DO NOTHING;

-- ── 99 Names Kurdish overrides ────────────────────────────────────────────
-- Only stores rows when the admin edits a name's Kurdish translation.
-- The app merges these with the hardcoded ASMA_DATA list.
CREATE TABLE IF NOT EXISTS gencine_asma99 (
  n           int  PRIMARY KEY CHECK (n >= 1 AND n <= 99),
  ku          text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE gencine_asma99 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read asma99" ON gencine_asma99 FOR SELECT USING (true);
CREATE POLICY "auth write asma99"  ON gencine_asma99 USING (auth.role() = 'authenticated');
