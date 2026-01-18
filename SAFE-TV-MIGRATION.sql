-- ========================================
-- SAFE TV Migration - Works on Any Schema
-- ========================================
-- This migration is safe to run multiple times

-- Add audio/video columns to tv_episodes (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_episodes' AND column_name='audio_url') THEN
        ALTER TABLE tv_episodes ADD COLUMN audio_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_episodes' AND column_name='video_url_native') THEN
        ALTER TABLE tv_episodes ADD COLUMN video_url_native TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_episodes' AND column_name='audio_duration') THEN
        ALTER TABLE tv_episodes ADD COLUMN audio_duration INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_episodes' AND column_name='is_audio_only') THEN
        ALTER TABLE tv_episodes ADD COLUMN is_audio_only BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add series-level flags to tv_series (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_series' AND column_name='has_audio') THEN
        ALTER TABLE tv_series ADD COLUMN has_audio BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_series' AND column_name='has_video') THEN
        ALTER TABLE tv_series ADD COLUMN has_video BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_series' AND column_name='default_playback_mode') THEN
        ALTER TABLE tv_series ADD COLUMN default_playback_mode VARCHAR(10) DEFAULT 'audio';
    END IF;
END $$;

-- Make category_id nullable (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tv_series' AND column_name='category_id') THEN
        ALTER TABLE tv_series ALTER COLUMN category_id DROP NOT NULL;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete! New columns added to tv_episodes and tv_series.';
    RAISE NOTICE 'Next step: Build the new UI and upload audio files.';
END $$;
