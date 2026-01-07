-- Supabase Migration: Create user_data table for cloud sync
-- Run this in your Supabase SQL Editor

-- Create user_data table
CREATE TABLE IF NOT EXISTS public.user_data (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,

    -- User reference (from auth.users)
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Reading progress
    current_surah INTEGER DEFAULT 1,
    current_ayah INTEGER DEFAULT 1,
    scroll_position INTEGER DEFAULT 0,
    last_read_time TIMESTAMPTZ,

    -- Bookmarks (stored as JSONB array)
    bookmarks JSONB DEFAULT '[]'::jsonb,

    -- Reading goals
    daily_goal INTEGER DEFAULT 0,
    monthly_goal INTEGER DEFAULT 0,
    reading_streak INTEGER DEFAULT 0,
    total_ayahs_read INTEGER DEFAULT 0,
    completed_surahs JSONB DEFAULT '[]'::jsonb,

    -- Reading history
    reading_history JSONB DEFAULT '[]'::jsonb,

    -- Settings
    theme VARCHAR(50) DEFAULT 'light',
    font_size VARCHAR(50) DEFAULT 'medium',
    arabic_font VARCHAR(50) DEFAULT 'default',
    show_translation BOOLEAN DEFAULT true,
    show_tafsir BOOLEAN DEFAULT true,
    auto_scroll BOOLEAN DEFAULT false,

    -- Notifications
    notifications_enabled BOOLEAN DEFAULT true,
    reminder_times JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data(user_id);

-- Create index on updated_at for sync queries
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at ON public.user_data(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own data
CREATE POLICY "Users can view own data"
    ON public.user_data
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy: Users can insert their own data
CREATE POLICY "Users can insert own data"
    ON public.user_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own data
CREATE POLICY "Users can update own data"
    ON public.user_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own data
CREATE POLICY "Users can delete own data"
    ON public.user_data
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on every UPDATE
CREATE TRIGGER update_user_data_updated_at
    BEFORE UPDATE ON public.user_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.user_data TO authenticated;
GRANT USAGE ON SEQUENCE user_data_id_seq TO authenticated;
