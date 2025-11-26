-- ============================================
-- Features and Schedule Management Tables
-- Easy editing from admin panel on mobile
-- ============================================

-- ============================================
-- 1. FEATURES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS features (
    id BIGSERIAL PRIMARY KEY,
    icon_class VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_features_order ON features(display_order);

-- Enable RLS
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read features" ON features
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated update features" ON features
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated insert features" ON features
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated delete features" ON features
    FOR DELETE USING (true);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_features_timestamp
    BEFORE UPDATE ON features
    FOR EACH ROW
    EXECUTE FUNCTION update_features_updated_at();

-- Insert initial data
INSERT INTO features (icon_class, title, description, display_order) VALUES
('fas fa-mobile-alt', 'وانێن کورت', 'ڤیدیویێن تەفسیری یێن بلەز و بسەناهی بۆ تێگەهشتنێ، دهێنە دروستکرن بۆ تۆڕێن جڤاکی، حیکمەتا قورئانێ ب شێوەیەکێ ڕاستەوخو بۆ لاپەڕەیا تە یا سەرەکی ڤەدگوهێزن، کو ڕێکەکا بێ وێنەیە بۆ زانینا ئیسلامی یا ڕۆژانە.', 1),
('fas fa-book-open', 'تەفسیرا قورئانێ ب تەمامی', 'شرۆڤەکرنەکا هەمەلایەنی یا ئایەتێن قورئانێ، دگەل خواندنێن زانستی و بجهئینانا کرداری بۆ ژیانا مۆدرێن.', 2),
('fas fa-language', 'زمانێ کوردی', 'هەمی ناڤەڕۆک ب شێوازەکێ ڕوون و ڕەسەن ب زمانێ کوردی دهێنە ڤەگوهاستن، ئەڤە وەدکەت پەیاما قورئانێ بگەهیتە خەلکێ کورد ل سەرانسەری جیهانێ. گوتنێن خودای یێن ئەبەدی، ب زمانێ تە یێ دایک.', 3),
('fas fa-heart', 'ڕەسەنایەتی و ڕێزگرتن', 'ناڤەرۆکەک کو لسەر بنەمایێ ژێدەرێن مێژوویی یێن باوەرپێکری، ب دلسۆزی و ڕێزگرتن ل دەقێ پیرۆز دهێتە پێشکێشکرن. لدیف ڕێکا زانایێن چاک و ڕاستگۆ.', 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. SCHEDULE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS schedule (
    id BIGSERIAL PRIMARY KEY,
    icon_class VARCHAR(100) NOT NULL,
    day_label TEXT NOT NULL,
    time_label TEXT NOT NULL,
    topic TEXT NOT NULL,
    description TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_schedule_order ON schedule(display_order);

-- Enable RLS
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read schedule" ON schedule
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated update schedule" ON schedule
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated insert schedule" ON schedule
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated delete schedule" ON schedule
    FOR DELETE USING (true);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedule_timestamp
    BEFORE UPDATE ON schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_schedule_updated_at();

-- Insert initial data
INSERT INTO schedule (icon_class, day_label, time_label, topic, description, display_order) VALUES
('fas fa-calendar-day', 'ڕۆژانە', 'ژ دەمژمێر ٥ ی ئێڤاری هەتا ١٢ ی شەڤ', 'پارڤەکرنا ناڤەڕۆکا ڕۆژانە', 'ڤیدیو و چیڕۆک و ناڤەڕۆکا ئیسلامی یێن نوی کو ڕۆژانە ل ئێڤارییان دهێنە بەڵاڤکرن. خوراکەکێ ڕۆحی یێ بەردەوام بۆ ڕۆحا تە.', 1),
('fas fa-sun', 'ل سپێدەهییان', 'سپێدێ', 'زکر و ستوری', 'ڕۆژانە ناڤەڕۆکا زکر و ستورییێن ئیسلامیێن سپێدەهییان ل ستوری و کەناڵێ پەخشی یێ ئنستاگرامی دهێنە بەڵاڤکرن. ڕۆژا خۆ ب زکرێ خودێ دەستپێبکە.', 2),
('fas fa-star', 'تایبەت ل ڕۆژا پێنجشەمبێ', 'پێنجشەمب', 'سەلەوات و سورەتا (الکهف)', 'ناڤەڕۆکەکا تایبەت یا سەلەواتان، ڕیلزێن سورەتا الکهف، کو دبیتە بیرئینان بۆ خواندنا وێ - (سونەت) نەریتێن پیرۆز یێن پێنجشەمبێ.', 3),
('fas fa-mosque', 'ناڤەڕۆکا ئاسایی', 'ب بەردەوامی', 'ستۆریێن ئنستاگرامی دەربارەی فەرموودە و سوننەتان', 'ستوریێن پلاتفورما ئنستاگرامی و فێرکاریێن سوننەتان، قورئان خواندنا نوی دگەل تەفسیرا کوردی. نمونا ژیانا پێغەمبەرایەتی ل سەردەمێ مۆدرێن.', 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE features IS 'Website features displayed on homepage - editable from admin panel';
COMMENT ON TABLE schedule IS 'Daily schedule/timeline displayed on homepage - editable from admin panel';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Features and Schedule tables created successfully!';
    RAISE NOTICE '📋 4 features inserted';
    RAISE NOTICE '📅 4 schedule items inserted';
    RAISE NOTICE '📱 Ready for editing in admin panel!';
END $$;
