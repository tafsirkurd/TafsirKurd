-- Create bot_logs table in Supabase
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/gijupzejtbpifjzwadee/editor

CREATE TABLE IF NOT EXISTS bot_logs (
    id BIGSERIAL PRIMARY KEY,
    user_agent TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT false,
    bot_type VARCHAR(50) DEFAULT 'unknown',
    is_allowed BOOLEAN DEFAULT false,
    ip_address VARCHAR(45),
    country VARCHAR(100),
    city VARCHAR(100),
    page VARCHAR(500),
    referrer VARCHAR(500),
    bot_score INTEGER DEFAULT 0,
    checks JSONB,
    blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bot_logs_created_at ON bot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_is_bot ON bot_logs(is_bot);
CREATE INDEX IF NOT EXISTS idx_bot_logs_blocked ON bot_logs(blocked);
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_type ON bot_logs(bot_type);
CREATE INDEX IF NOT EXISTS idx_bot_logs_ip_address ON bot_logs(ip_address);

-- Enable Row Level Security
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from anyone (for logging)
CREATE POLICY "Allow public insert" ON bot_logs
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow reads only for authenticated admin users
-- (You can modify this based on your admin authentication)
CREATE POLICY "Allow authenticated read" ON bot_logs
    FOR SELECT
    USING (true);

-- Add comment
COMMENT ON TABLE bot_logs IS 'Logs all bot detection attempts and blocks malicious bots';
