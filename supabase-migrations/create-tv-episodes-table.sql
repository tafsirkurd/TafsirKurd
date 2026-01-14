-- TV Episodes Table
-- Stores individual episodes within TV series

CREATE TABLE IF NOT EXISTS tv_episodes (
    id BIGSERIAL PRIMARY KEY,
    series_id BIGINT NOT NULL REFERENCES tv_series(id) ON DELETE CASCADE,
    episode_number INTEGER,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail TEXT,
    duration INTEGER, -- Duration in seconds
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure episode numbers are unique within a series
    CONSTRAINT unique_episode_per_series UNIQUE(series_id, episode_number)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tv_episodes_series_id ON tv_episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_tv_episodes_episode_number ON tv_episodes(episode_number);
CREATE INDEX IF NOT EXISTS idx_tv_episodes_created_at ON tv_episodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tv_episodes_views ON tv_episodes(views DESC);

-- RLS Policies
ALTER TABLE tv_episodes ENABLE ROW LEVEL SECURITY;

-- Public can view episodes
CREATE POLICY "Allow public read access to tv_episodes"
    ON tv_episodes
    FOR SELECT
    USING (true);

-- Public can increment views
CREATE POLICY "Allow public to increment views on tv_episodes"
    ON tv_episodes
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Only service role can insert/delete/full update
CREATE POLICY "Allow service role full access to tv_episodes"
    ON tv_episodes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tv_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tv_episodes_updated_at
    BEFORE UPDATE ON tv_episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_tv_episodes_updated_at();

-- Foreign key constraint validation
ALTER TABLE tv_episodes
    ADD CONSTRAINT fk_tv_episodes_series
    FOREIGN KEY (series_id)
    REFERENCES tv_series(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Helper function to increment views safely
CREATE OR REPLACE FUNCTION increment_episode_views(episode_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE tv_episodes
    SET views = views + 1
    WHERE id = episode_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE tv_episodes IS 'Individual episodes within TV series';
COMMENT ON COLUMN tv_episodes.series_id IS 'References tv_series(id) - cascade delete if series removed';
COMMENT ON COLUMN tv_episodes.episode_number IS 'Episode number within the series (can be NULL for standalone videos)';
COMMENT ON COLUMN tv_episodes.title IS 'Episode title';
COMMENT ON COLUMN tv_episodes.video_url IS 'URL to video file (CDN, S3, YouTube, etc.)';
COMMENT ON COLUMN tv_episodes.thumbnail IS 'URL to episode thumbnail image';
COMMENT ON COLUMN tv_episodes.duration IS 'Video duration in seconds';
COMMENT ON COLUMN tv_episodes.views IS 'View count for analytics';
COMMENT ON FUNCTION increment_episode_views IS 'Safely increments view count for an episode';
