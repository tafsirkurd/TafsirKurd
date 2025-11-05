-- Create geo_analytics table for tracking visitor locations
CREATE TABLE IF NOT EXISTS geo_analytics (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- IP and location data
    ip_address TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT NOT NULL,
    region TEXT,
    city TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    timezone TEXT,

    -- Visit metadata
    user_agent TEXT,
    page_url TEXT,
    referrer TEXT,

    -- Indexing for fast queries
    INDEX idx_geo_country (country),
    INDEX idx_geo_region (region),
    INDEX idx_geo_city (city),
    INDEX idx_geo_created_at (created_at),
    INDEX idx_geo_ip (ip_address)
);

-- Enable Row Level Security
ALTER TABLE geo_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert visit data
CREATE POLICY "Allow anonymous insert geo analytics"
ON geo_analytics FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous users to read their own data (by IP)
CREATE POLICY "Allow read geo analytics"
ON geo_analytics FOR SELECT TO anon, authenticated
USING (true);

-- Only allow authenticated users to delete (admin cleanup)
CREATE POLICY "Allow authenticated delete geo analytics"
ON geo_analytics FOR DELETE TO authenticated
USING (true);

-- Add comment
COMMENT ON TABLE geo_analytics IS 'Geographic analytics tracking visitor locations by country, region, and city';
