-- Supabase Migration: Create user_data table for cloud sync
-- Run this in your Supabase SQL Editor

-- Drop table if exists (for clean re-run)
DROP TABLE IF EXISTS public.user_data CASCADE;

-- Create user_data table
CREATE TABLE public.user_data (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,

    -- User reference (from auth.users) - THIS MUST BE UUID TYPE
    user_id UUID NOT NULL UNIQUE,

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
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_user_data_user_id ON public.user_data(user_id);
CREATE INDEX idx_user_data_updated_at ON public.user_data(updated_at);

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

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using proper UUID comparison
-- Policy 1: Users can view their own data
CREATE POLICY "user_data_select_policy" ON public.user_data
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy 2: Users can insert their own data
CREATE POLICY "user_data_insert_policy" ON public.user_data
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can update their own data
CREATE POLICY "user_data_update_policy" ON public.user_data
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can delete their own data
CREATE POLICY "user_data_delete_policy" ON public.user_data
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Grant necessary permissions to authenticated users
GRANT ALL ON public.user_data TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_data_id_seq TO authenticated;

-- Verify setup (this will show the table structure)
SELECT
    'Table created successfully!' as status,
    count(*) as policy_count
FROM pg_policies
WHERE tablename = 'user_data';
