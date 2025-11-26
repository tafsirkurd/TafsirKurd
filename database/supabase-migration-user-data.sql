-- Create user_data table for storing Quran reading data
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_data (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- Create index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at ON user_data(updated_at);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since we're using anonymous key with function auth)
CREATE POLICY "Enable all operations for all users" ON user_data
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE user_data IS 'Stores user Quran reading data (goals, stats, bookmarks, sessions, daily activity)';
COMMENT ON COLUMN user_data.user_id IS 'Google user ID (sub from JWT)';
COMMENT ON COLUMN user_data.data IS 'Complete user data object (stats, bookmarks, sessions, dailyActivity, readingGoal, etc.)';
