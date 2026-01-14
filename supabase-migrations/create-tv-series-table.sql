-- TV Series Table
-- Stores TV series that belong to categories (e.g., "Tafsir Al-Baqarah", "Life of Prophet Muhammad")

CREATE TABLE IF NOT EXISTS tv_series (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES tv_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tv_series_category_id ON tv_series(category_id);
CREATE INDEX IF NOT EXISTS idx_tv_series_title ON tv_series(title);
CREATE INDEX IF NOT EXISTS idx_tv_series_created_at ON tv_series(created_at DESC);

-- RLS Policies
ALTER TABLE tv_series ENABLE ROW LEVEL SECURITY;

-- Public can view series
CREATE POLICY "Allow public read access to tv_series"
    ON tv_series
    FOR SELECT
    USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Allow service role full access to tv_series"
    ON tv_series
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tv_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tv_series_updated_at
    BEFORE UPDATE ON tv_series
    FOR EACH ROW
    EXECUTE FUNCTION update_tv_series_updated_at();

-- Foreign key constraint validation
ALTER TABLE tv_series
    ADD CONSTRAINT fk_tv_series_category
    FOREIGN KEY (category_id)
    REFERENCES tv_categories(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

COMMENT ON TABLE tv_series IS 'TV series organized by categories';
COMMENT ON COLUMN tv_series.category_id IS 'References tv_categories(id) - cascade delete if category removed';
COMMENT ON COLUMN tv_series.title IS 'Series title';
COMMENT ON COLUMN tv_series.description IS 'Optional series description';
COMMENT ON COLUMN tv_series.thumbnail_url IS 'URL to series thumbnail/poster image';
