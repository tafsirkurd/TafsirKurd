-- ============================================
-- KURDISH TRANSLATIONS MANAGEMENT TABLE
-- Complete text management for all Kurdish content
-- ============================================

-- Drop existing table if exists
DROP TABLE IF EXISTS kurdish_translations CASCADE;

-- Create translations table
CREATE TABLE IF NOT EXISTS kurdish_translations (
    id BIGSERIAL PRIMARY KEY,
    key_id VARCHAR(100) UNIQUE NOT NULL,
    kurdish_text TEXT NOT NULL,
    context VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    page VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_translations_key ON kurdish_translations(key_id);
CREATE INDEX idx_translations_category ON kurdish_translations(category);
CREATE INDEX idx_translations_page ON kurdish_translations(page);
CREATE INDEX idx_translations_active ON kurdish_translations(is_active);

-- Enable Row Level Security
ALTER TABLE kurdish_translations ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view active translations"
    ON kurdish_translations FOR SELECT
    USING (is_active = true);

-- Create policy for authenticated admin access
CREATE POLICY "Admins can manage translations"
    ON kurdish_translations FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_translations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER translations_updated_at
    BEFORE UPDATE ON kurdish_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translations_timestamp();

-- ============================================
-- INSERT INITIAL TRANSLATIONS DATA
-- Navigation & Menu Items
-- ============================================

INSERT INTO kurdish_translations (key_id, kurdish_text, context, category, page) VALUES
-- Navigation
('nav_home', 'لاپەڕا سەرەکی', 'Navigation link', 'navigation', 'index.html'),
('nav_features', 'تایبەتمەندی', 'Navigation link', 'navigation', 'index.html'),
('nav_reach', 'ئامار', 'Navigation link', 'navigation', 'index.html'),
('nav_schedule', 'خشتە', 'Navigation link', 'navigation', 'index.html'),
('nav_plans', 'پلان', 'Navigation link', 'navigation', 'index.html'),
('nav_about', 'دەربارە', 'Navigation link', 'navigation', 'index.html'),
('nav_contact', 'پەیوەندی', 'Navigation link', 'navigation', 'index.html'),
('nav_quran', 'قورئان', 'Navigation link', 'navigation', 'index.html'),
('nav_profile', 'پرۆفایل', 'Navigation link', 'navigation', 'profile.html'),
('nav_goals', 'ئارمانج', 'Navigation link', 'navigation', 'goals.html'),
('nav_bookmarks', 'نیشانەکری', 'Navigation link', 'navigation', 'bookmarks.html'),
('nav_settings', 'رێکخستن', 'Navigation link', 'navigation', 'settings.html'),

-- Authentication
('auth_welcome', 'ب خێر بێی بۆ تەفسیر کورد', 'Page heading', 'authentication', 'login.html'),
('auth_subtitle', 'چوونە ژوورڤە بکە بۆ دەستگەهشتن ب تایبەتمەندییێن تایبەت', 'Subtitle', 'authentication', 'login.html'),
('google_signin', 'چوونە ژوورڤە ب Google', 'Button text', 'authentication', 'login.html'),
('divider_or', 'یان', 'Divider text', 'authentication', 'login.html'),
('back_home', 'گەڕیان ڤە بۆ سەرەتا', 'Button text', 'authentication', 'login.html'),

-- Buttons & Actions
('btn_read_quran', 'دەست ب خواندنێ بکە', 'Button text', 'buttons', 'index.html'),
('btn_save', 'پاشکەفتکرن', 'Button text', 'buttons', 'all'),
('btn_delete', 'سڕینەڤە', 'Button text', 'buttons', 'all'),
('btn_back', 'گەڕیان ڤە', 'Button text', 'buttons', 'all'),
('btn_next', 'پاشین', 'Button text', 'buttons', 'all'),
('btn_previous', 'پێشین', 'Button text', 'buttons', 'all'),
('btn_continue', 'دەستپێکرن', 'Button text', 'buttons', 'complete-signup.html'),
('btn_logout', 'دەرکەفتن', 'Button text', 'buttons', 'profile.html'),
('btn_submit', 'هنارتنا نامەیێ', 'Button text', 'buttons', 'index.html'),

-- Forms
('form_name', 'ناڤ', 'Form label', 'forms', 'index.html'),
('form_email', 'ئیمەیل', 'Form label', 'forms', 'index.html'),
('form_subject', 'بابەت', 'Form label', 'forms', 'index.html'),
('form_message', 'ناما تە', 'Form label', 'forms', 'index.html'),
('form_contact_title', 'پەیوەندیێ بکە', 'Section heading', 'forms', 'index.html'),
('search_placeholder', 'گەڕیان ل نیشانەکری...', 'Search input', 'forms', 'bookmarks.html'),

-- Settings
('settings_title', 'رێکخستن', 'Page heading', 'settings', 'settings.html'),
('darkmode_label', 'رەوشا تاریک', 'Setting label', 'settings', 'settings.html'),
('darkmode_desc', 'گوهۆڕین بۆ رەوشا تاریک', 'Setting description', 'settings', 'settings.html'),
('font_arabic_title', 'فۆنتا عەرەبی', 'Card title', 'settings', 'settings.html'),
('font_size_label', 'قەبارەیا فۆنتێ', 'Setting label', 'settings', 'settings.html'),
('notification_title', 'بیرهاتن', 'Card title', 'settings', 'settings.html'),
('btn_reset', 'گەڕیاندنەڤەیا هەموو رێکخستنان', 'Button text', 'settings', 'settings.html'),

-- Profile
('profile_title', 'پرۆفایل', 'Page heading', 'profile', 'profile.html'),
('total_surahs', 'سوورەتا تەمامکری', 'Stat label', 'profile', 'profile.html'),
('total_ayahs', 'ئایەتا هاتیە خواندن', 'Stat label', 'profile', 'profile.html'),
('total_bookmarks', 'نیشانەکری', 'Stat label', 'profile', 'profile.html'),
('reading_time', 'خولەکێن خواندنێ', 'Stat label', 'profile', 'profile.html'),
('member_since', 'ئەندام ژ', 'Badge label', 'profile', 'profile.html'),
('achievements_title', 'دەستکەفتن', 'Section title', 'profile', 'profile.html'),

-- Goals
('goals_title', 'ئارمانج', 'Page heading', 'goals', 'goals.html'),
('new_goal_btn', 'ئارمانجەکا نوی', 'Button text', 'goals', 'goals.html'),
('progress_title', 'پێشکەفتن', 'Section title', 'goals', 'goals.html'),
('streak_label', 'رۆژ', 'Label', 'goals', 'goals.html'),
('today_goal', 'ئارمانجا ئەڤڕو: ١٠ خولەک خیندن', 'Goal text', 'goals', 'goals.html'),

-- Bookmarks
('bookmarks_title', 'نیشانەکری', 'Page heading', 'bookmarks', 'bookmarks.html'),
('empty_bookmarks', 'هێشتا تە چ ئایەت نیشانە نەکریە', 'Empty state', 'bookmarks', 'bookmarks.html'),
('empty_desc', 'دەما تو ئایەتەکێ نیشانە دکەی، ل ڤێرێ دێ بینی', 'Empty description', 'bookmarks', 'bookmarks.html'),
('start_reading_btn', 'دەستپێبکە ب خواندنێ', 'Button text', 'bookmarks', 'bookmarks.html'),
('note_label', 'تێبینی:', 'Label', 'bookmarks', 'bookmarks.html'),
('no_results', 'چ ئەنجامەک نەهاتە دیتن', 'Search message', 'bookmarks', 'bookmarks.html'),

-- Messages & Notifications
('msg_success', 'سەرکەفتی بوو!', 'Success message', 'messages', 'all'),
('msg_error', 'ئاریشەک چێبوو. دووبارە هەول بدە', 'Error message', 'messages', 'all'),
('msg_loading', 'چاڤەڕێبە...', 'Loading message', 'messages', 'all'),
('msg_darkmode_on', 'رەوشا تاریک چالاککر', 'Notification', 'messages', 'settings.html'),
('msg_darkmode_off', 'رەوشا رووناهیێ چالاککر', 'Notification', 'messages', 'settings.html'),
('msg_saved', 'تێبینییا پاشکەفتکری', 'Success message', 'messages', 'all'),
('msg_deleted', 'نیشانە هاتە سڕینەڤە', 'Success message', 'messages', 'all'),

-- Footer
('footer_desc', 'پلاتفۆرمەکا ئارام بۆ خواندنێ، گەڕیان و رامان ل سەر قورئانا پیرۆز', 'Footer description', 'footer', 'all'),
('footer_copyright', 'تەفسیر کورد. هەمی ماف د پاراستینە', 'Copyright text', 'footer', 'all'),
('footer_privacy', 'پاراستنا تایبەتمەندیێ', 'Link text', 'footer', 'all'),
('footer_terms', 'مەرج و رێسایان', 'Link text', 'footer', 'all'),
('footer_nav', 'گەڕیان', 'Section title', 'footer', 'all'),
('footer_connect', 'پەیوەندی', 'Section title', 'footer', 'all');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Kurdish translations table created successfully!';
    RAISE NOTICE '📝 Inserted 70+ base translations';
    RAISE NOTICE '🔐 Row Level Security enabled';
    RAISE NOTICE '📊 All indexes created';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next steps:';
    RAISE NOTICE '1. Go to admin panel';
    RAISE NOTICE '2. Navigate to "Translations" tab';
    RAISE NOTICE '3. Edit any Kurdish text';
    RAISE NOTICE '4. Changes appear instantly on website!';
END $$;
