-- ===== TV USER DATA TRACKING TABLE =====
-- This table stores user's watch progress, bookmarks, history, and series progress
-- Run this migration in your Supabase SQL Editor

-- Create user_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Quran reading data (existing)
    currentPosition JSONB DEFAULT '{"surah": 1, "ayah": 1}'::jsonb,
    readAyahs JSONB DEFAULT '[]'::jsonb,
    stats JSONB DEFAULT '{"streak": 0, "ayahsRead": 0, "level": 1}'::jsonb,
    signupCompleted BOOLEAN DEFAULT FALSE,
    profileCompleted BOOLEAN DEFAULT FALSE,
    onboardingCompleted BOOLEAN DEFAULT FALSE,
    completion NUMERIC DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    daily_goal INTEGER DEFAULT 10,

    -- TV tracking data (new)
    watch_progress JSONB DEFAULT '{}'::jsonb,
    bookmarks JSONB DEFAULT '[]'::jsonb,
    watch_history JSONB DEFAULT '[]'::jsonb,
    series_progress JSONB DEFAULT '{}'::jsonb,
    continue_watching JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{"audioOnlyMode": false, "autoPlayNext": true, "defaultQuality": "1080p", "playbackSpeed": 1}'::jsonb,

    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;

-- Create RLS policies
-- Policy: Users can only view their own data
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own data
CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;
CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_data TO authenticated;

-- ===== EXAMPLE QUERIES =====

-- Check if table was created successfully
-- SELECT * FROM user_data LIMIT 10;

-- Insert sample user data (replace with actual user_id)
-- INSERT INTO user_data (user_id, bookmarks, watch_history)
-- VALUES
--     ('YOUR-USER-UUID-HERE',
--      '[{"episodeId": 123, "bookmarkedAt": 1234567890}]'::jsonb,
--      '[{"episodeId": 456, "watchedAt": 1234567890, "completed": true}]'::jsonb)
-- ON CONFLICT (user_id) DO UPDATE
--     SET bookmarks = EXCLUDED.bookmarks,
--         watch_history = EXCLUDED.watch_history,
--         updated_at = NOW();

-- Query user's watch progress
-- SELECT watch_progress, series_progress, continue_watching
-- FROM user_data
-- WHERE user_id = auth.uid();

-- Count total bookmarked episodes per user
-- SELECT user_id, jsonb_array_length(bookmarks) as total_bookmarks
-- FROM user_data
-- WHERE bookmarks != '[]'::jsonb;

-- ===== NOTES =====
-- 1. This table combines both Quran reading data and TV tracking data
-- 2. All JSON fields use JSONB for better performance and indexing
-- 3. RLS policies ensure users can only access their own data
-- 4. updated_at automatically updates on any row change
-- 5. Continue watching only stores videos between 5-95% completion
-- 6. Watch history is limited to last 100 videos per user (managed in JS)
-- 7. Series progress tracks completion percentage for each series
