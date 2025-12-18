-- ========================================
-- TafsirKurd Database Schema
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. User Data Table
CREATE TABLE IF NOT EXISTS user_data (
    id BIGSERIAL PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    message TEXT,
    status TEXT DEFAULT 'unread',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Featured Videos Table
CREATE TABLE IF NOT EXISTS featured_videos (
    id BIGSERIAL PRIMARY KEY,
    video_url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Social Stats Table
CREATE TABLE IF NOT EXISTS social_stats (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    display_order INTEGER DEFAULT 0,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Features Table
CREATE TABLE IF NOT EXISTS features (
    id BIGSERIAL PRIMARY KEY,
    icon_class TEXT,
    title_ku TEXT,
    title_ar TEXT,
    description_ku TEXT,
    description_ar TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Schedule Table
CREATE TABLE IF NOT EXISTS schedule (
    id BIGSERIAL PRIMARY KEY,
    icon_class TEXT,
    time_ku TEXT,
    time_ar TEXT,
    activity_ku TEXT,
    activity_ar TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Kurdish Translations Table
CREATE TABLE IF NOT EXISTS kurdish_translations (
    id BIGSERIAL PRIMARY KEY,
    key_id TEXT UNIQUE NOT NULL,
    kurdish_text TEXT NOT NULL,
    context TEXT,
    category TEXT DEFAULT 'general',
    page TEXT DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Background Images Table
CREATE TABLE IF NOT EXISTS background_images (
    id BIGSERIAL PRIMARY KEY,
    page_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Admin Activity Feed Table
CREATE TABLE IF NOT EXISTS admin_activity_feed (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT,
    title TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Location Tracking Table
CREATE TABLE IF NOT EXISTS location_tracking (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    user_agent TEXT,
    page_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE kurdish_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tracking ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables (using anon key)
CREATE POLICY "Public read access" ON user_data FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON user_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON user_data FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON contact_messages FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON contact_messages FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON contact_messages FOR DELETE USING (true);

CREATE POLICY "Public read access" ON featured_videos FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON featured_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON featured_videos FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON featured_videos FOR DELETE USING (true);

CREATE POLICY "Public read access" ON social_stats FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON social_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON social_stats FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON social_stats FOR DELETE USING (true);

CREATE POLICY "Public read access" ON features FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON features FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON features FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON features FOR DELETE USING (true);

CREATE POLICY "Public read access" ON schedule FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON schedule FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON schedule FOR DELETE USING (true);

CREATE POLICY "Public read access" ON kurdish_translations FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON kurdish_translations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON kurdish_translations FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON kurdish_translations FOR DELETE USING (true);

CREATE POLICY "Public read access" ON background_images FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON background_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON background_images FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON background_images FOR DELETE USING (true);

CREATE POLICY "Public read access" ON admin_activity_feed FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON admin_activity_feed FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON admin_activity_feed FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON admin_activity_feed FOR DELETE USING (true);

CREATE POLICY "Public read access" ON location_tracking FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON location_tracking FOR INSERT WITH CHECK (true);

-- ========================================
-- Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_data_created_at ON user_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_featured_videos_position ON featured_videos(position);
CREATE INDEX IF NOT EXISTS idx_social_stats_order ON social_stats(display_order);
CREATE INDEX IF NOT EXISTS idx_features_order ON features(display_order);
CREATE INDEX IF NOT EXISTS idx_schedule_order ON schedule(display_order);
CREATE INDEX IF NOT EXISTS idx_translations_key ON kurdish_translations(key_id);
CREATE INDEX IF NOT EXISTS idx_translations_category ON kurdish_translations(category);
CREATE INDEX IF NOT EXISTS idx_background_images_page ON background_images(page_name);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON admin_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_country ON location_tracking(country);
CREATE INDEX IF NOT EXISTS idx_location_created ON location_tracking(created_at DESC);

-- ========================================
-- Initial Data (Optional)
-- ========================================

-- You can add initial data here if needed
-- Example:
-- INSERT INTO featured_videos (video_url, position) VALUES
--     ('https://www.youtube.com/watch?v=example1', 1),
--     ('https://www.youtube.com/watch?v=example2', 2);
