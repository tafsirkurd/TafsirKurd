-- ============================================
-- Bot Logs Table - Complete Setup
-- Run this in Supabase SQL Editor
-- https://app.supabase.com/project/gijupzejtbpifjzwadee/editor
-- ============================================

-- Drop table if exists (CAREFUL: This deletes all data!)
-- Uncomment only if you want to start fresh
-- DROP TABLE IF EXISTS bot_logs CASCADE;

-- ============================================
-- 1. CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bot_logs (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Bot Information
    user_agent TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT false,
    bot_type VARCHAR(50) DEFAULT 'unknown',
    is_allowed BOOLEAN DEFAULT false,
    bot_score INTEGER DEFAULT 0,
    checks JSONB DEFAULT '{}',
    blocked BOOLEAN DEFAULT false,

    -- Network Information
    ip_address VARCHAR(45),
    country VARCHAR(100),
    city VARCHAR(100),

    -- Page Information
    page VARCHAR(500),
    referrer VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES (For Fast Queries)
-- ============================================

-- Index for date-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_bot_logs_created_at
    ON bot_logs(created_at DESC);

-- Index for filtering bots
CREATE INDEX IF NOT EXISTS idx_bot_logs_is_bot
    ON bot_logs(is_bot);

-- Index for filtering blocked bots
CREATE INDEX IF NOT EXISTS idx_bot_logs_blocked
    ON bot_logs(blocked);

-- Index for grouping by bot type
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_type
    ON bot_logs(bot_type);

-- Index for IP-based queries
CREATE INDEX IF NOT EXISTS idx_bot_logs_ip_address
    ON bot_logs(ip_address);

-- Index for country-based analytics
CREATE INDEX IF NOT EXISTS idx_bot_logs_country
    ON bot_logs(country);

-- Compound index for common queries (blocked + date)
CREATE INDEX IF NOT EXISTS idx_bot_logs_blocked_created
    ON bot_logs(blocked, created_at DESC);

-- Compound index for bot type analytics
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_type_created
    ON bot_logs(bot_type, created_at DESC);

-- GIN index for JSONB checks field (for advanced queries)
CREATE INDEX IF NOT EXISTS idx_bot_logs_checks
    ON bot_logs USING GIN (checks);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert" ON bot_logs;
DROP POLICY IF EXISTS "Allow authenticated read" ON bot_logs;
DROP POLICY IF EXISTS "Allow service role full access" ON bot_logs;

-- Policy 1: Allow anyone to INSERT (for bot logging)
CREATE POLICY "Allow public insert"
    ON bot_logs
    FOR INSERT
    WITH CHECK (true);

-- Policy 2: Allow anyone to SELECT (for admin dashboard)
-- You can restrict this to authenticated users if needed
CREATE POLICY "Allow authenticated read"
    ON bot_logs
    FOR SELECT
    USING (true);

-- Policy 3: Allow service role full access (for cleanup)
CREATE POLICY "Allow service role full access"
    ON bot_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- 4. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_bot_logs_updated_at ON bot_logs;

-- Create trigger
CREATE TRIGGER update_bot_logs_updated_at
    BEFORE UPDATE ON bot_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. AUTOMATIC CLEANUP (Delete old logs)
-- ============================================

-- Function to delete logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_bot_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM bot_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job (Supabase Cron Extension required)
-- Uncomment if you have pg_cron enabled
-- SELECT cron.schedule(
--     'cleanup-bot-logs',
--     '0 2 * * *', -- Every day at 2 AM
--     'SELECT cleanup_old_bot_logs();'
-- );

-- ============================================
-- 6. HELPFUL VIEWS
-- ============================================

-- View: Recent blocked bots (last 24 hours)
CREATE OR REPLACE VIEW recent_blocked_bots AS
SELECT
    id,
    user_agent,
    bot_type,
    ip_address,
    country,
    city,
    page,
    created_at
FROM bot_logs
WHERE blocked = true
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- View: Bot statistics summary
CREATE OR REPLACE VIEW bot_stats_summary AS
SELECT
    COUNT(*) as total_bots,
    COUNT(*) FILTER (WHERE blocked = true) as blocked_bots,
    COUNT(*) FILTER (WHERE is_allowed = true) as allowed_bots,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT country) as unique_countries,
    bot_type,
    COUNT(*) as count
FROM bot_logs
GROUP BY bot_type
ORDER BY count DESC;

-- View: Top blocked IPs
CREATE OR REPLACE VIEW top_blocked_ips AS
SELECT
    ip_address,
    country,
    city,
    COUNT(*) as block_count,
    MAX(created_at) as last_seen,
    array_agg(DISTINCT bot_type) as bot_types
FROM bot_logs
WHERE blocked = true
GROUP BY ip_address, country, city
ORDER BY block_count DESC
LIMIT 100;

-- ============================================
-- 7. USEFUL QUERIES
-- ============================================

-- Query 1: Count bots by type
-- SELECT bot_type, COUNT(*) as count
-- FROM bot_logs
-- GROUP BY bot_type
-- ORDER BY count DESC;

-- Query 2: Recent bot activity (last 24 hours)
-- SELECT * FROM bot_logs
-- WHERE created_at > NOW() - INTERVAL '24 hours'
-- ORDER BY created_at DESC;

-- Query 3: Most blocked IPs
-- SELECT ip_address, COUNT(*) as count
-- FROM bot_logs
-- WHERE blocked = true
-- GROUP BY ip_address
-- ORDER BY count DESC
-- LIMIT 10;

-- Query 4: Bots by country
-- SELECT country, COUNT(*) as count
-- FROM bot_logs
-- GROUP BY country
-- ORDER BY count DESC;

-- Query 5: Search engine vs malicious bots
-- SELECT
--     CASE
--         WHEN is_allowed THEN 'Search Engine'
--         ELSE 'Malicious'
--     END as category,
--     COUNT(*) as count
-- FROM bot_logs
-- WHERE is_bot = true
-- GROUP BY is_allowed;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT ON bot_logs TO authenticated;
GRANT SELECT ON recent_blocked_bots TO authenticated;
GRANT SELECT ON bot_stats_summary TO authenticated;
GRANT SELECT ON top_blocked_ips TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON bot_logs TO service_role;

-- ============================================
-- 9. COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE bot_logs IS 'Logs all bot detection attempts and blocks malicious bots';
COMMENT ON COLUMN bot_logs.id IS 'Unique identifier for each bot log entry';
COMMENT ON COLUMN bot_logs.user_agent IS 'User agent string of the bot';
COMMENT ON COLUMN bot_logs.is_bot IS 'Whether the visitor is identified as a bot';
COMMENT ON COLUMN bot_logs.bot_type IS 'Type of bot: malicious, search-engine, headless-browser, unknown';
COMMENT ON COLUMN bot_logs.is_allowed IS 'Whether the bot is allowed (search engines)';
COMMENT ON COLUMN bot_logs.bot_score IS 'Risk score (0-100, higher = more likely bot)';
COMMENT ON COLUMN bot_logs.checks IS 'JSON object with detection check results';
COMMENT ON COLUMN bot_logs.blocked IS 'Whether the bot was blocked from accessing the site';
COMMENT ON COLUMN bot_logs.ip_address IS 'IP address of the bot';
COMMENT ON COLUMN bot_logs.country IS 'Country of origin';
COMMENT ON COLUMN bot_logs.city IS 'City of origin';
COMMENT ON COLUMN bot_logs.page IS 'Page URL the bot tried to access';
COMMENT ON COLUMN bot_logs.referrer IS 'HTTP referrer';
COMMENT ON COLUMN bot_logs.created_at IS 'Timestamp when the bot was detected';
COMMENT ON COLUMN bot_logs.updated_at IS 'Timestamp when the record was last updated';

-- ============================================
-- 10. SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO bot_logs (user_agent, is_bot, bot_type, is_allowed, ip_address, country, city, page, blocked) VALUES
('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', true, 'search-engine', true, '66.249.66.1', 'United States', 'Mountain View', '/quran', false),
('python-requests/2.28.1', true, 'malicious', false, '192.168.1.100', 'Unknown', 'Unknown', '/admin', true),
('curl/7.68.0', true, 'malicious', false, '203.0.113.5', 'China', 'Beijing', '/bookmarks', true),
('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', true, 'search-engine', true, '40.77.167.1', 'United States', 'Redmond', '/profile', false),
('Scrapy/2.7.1', true, 'malicious', false, '185.220.101.1', 'Russia', 'Moscow', '/data/quran.json', true);
*/

-- ============================================
-- 11. VERIFICATION
-- ============================================

-- Check if table was created successfully
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'bot_logs'
ORDER BY ordinal_position;

-- Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bot_logs';

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'bot_logs';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Bot logs table created successfully!';
    RAISE NOTICE '📊 Indexes created for optimal performance';
    RAISE NOTICE '🔒 Row Level Security enabled';
    RAISE NOTICE '🎯 Ready to track bots!';
END $$;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Manual cleanup (delete logs older than 90 days)
-- DELETE FROM bot_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Get table size
-- SELECT pg_size_pretty(pg_total_relation_size('bot_logs'));

-- Get row count
-- SELECT COUNT(*) FROM bot_logs;

-- Vacuum table (optimize storage)
-- VACUUM ANALYZE bot_logs;
