-- TV Categories Table
-- Stores categories for organizing TV series (e.g., Tafsir, Islamic History, Lectures)

CREATE TABLE IF NOT EXISTS tv_categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tv_categories_name ON tv_categories(name);

-- RLS Policies
ALTER TABLE tv_categories ENABLE ROW LEVEL SECURITY;

-- Public can view categories
CREATE POLICY "Allow public read access to tv_categories"
    ON tv_categories
    FOR SELECT
    USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Allow service role full access to tv_categories"
    ON tv_categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tv_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tv_categories_updated_at
    BEFORE UPDATE ON tv_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_tv_categories_updated_at();

-- Sample data (optional - remove if not needed)
-- INSERT INTO tv_categories (name, description) VALUES
-- ('Tafsir', 'Quran interpretation and explanation'),
-- ('Islamic History', 'Historical events and figures in Islam'),
-- ('Lectures', 'Educational Islamic lectures');

COMMENT ON TABLE tv_categories IS 'Categories for organizing TV series content';
COMMENT ON COLUMN tv_categories.name IS 'Unique category name';
COMMENT ON COLUMN tv_categories.description IS 'Optional description of the category';
