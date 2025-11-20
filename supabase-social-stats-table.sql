-- ============================================
-- Social Media Statistics Table
-- Easy editing from admin panel on mobile
-- ============================================

-- Create table
CREATE TABLE IF NOT EXISTS social_stats (
    id BIGSERIAL PRIMARY KEY,
    stat_key VARCHAR(50) UNIQUE NOT NULL,
    stat_value INTEGER NOT NULL,
    stat_unit VARCHAR(10) NOT NULL,
    stat_label TEXT NOT NULL,
    icon_class VARCHAR(50) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_social_stats_order ON social_stats(display_order);

-- Enable Row Level Security
ALTER TABLE social_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Allow everyone to read (for index.html)
CREATE POLICY "Allow public read" ON social_stats
    FOR SELECT
    USING (true);

-- Policy: Allow authenticated users to update (for admin panel)
CREATE POLICY "Allow authenticated update" ON social_stats
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert" ON social_stats
    FOR INSERT
    WITH CHECK (true);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_social_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_social_stats_timestamp
    BEFORE UPDATE ON social_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_social_stats_updated_at();

-- Insert initial data (current stats from index.html)
INSERT INTO social_stats (stat_key, stat_value, stat_unit, stat_label, icon_class, display_order) VALUES
('instagram_followers', 65, 'ھ+', 'فۆڵۆوەرێن ئینستاگرامى', 'fab fa-instagram', 1),
('tiktok_followers', 10, 'ھ+', 'فۆڵۆوەرێن تیکتۆکى', 'fab fa-tiktok', 2),
('total_views', 25, 'م+', 'ژمارا بینەران', 'fas fa-eye', 3),
('videos_published', 1000, '+', 'ڤیدیۆیێن بەلاڤکرین', 'fas fa-video', 4)
ON CONFLICT (stat_key) DO NOTHING;

-- Add comments
COMMENT ON TABLE social_stats IS 'Social media statistics displayed on homepage - editable from admin panel';
COMMENT ON COLUMN social_stats.stat_key IS 'Unique identifier (e.g., instagram_followers)';
COMMENT ON COLUMN social_stats.stat_value IS 'Numeric value (e.g., 65, 1000)';
COMMENT ON COLUMN social_stats.stat_unit IS 'Unit suffix (e.g., ھ+, م+, +)';
COMMENT ON COLUMN social_stats.stat_label IS 'Kurdish label text';
COMMENT ON COLUMN social_stats.icon_class IS 'FontAwesome icon class';
COMMENT ON COLUMN social_stats.display_order IS 'Order to display stats';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Social stats table created successfully!';
    RAISE NOTICE '📊 Initial data inserted (Instagram: 65ھ+, TikTok: 10ھ+, Views: 25م+, Videos: 1000+)';
    RAISE NOTICE '📱 Ready for mobile editing in admin panel!';
END $$;
