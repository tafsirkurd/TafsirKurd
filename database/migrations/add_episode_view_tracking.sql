-- Migration: Add episode view tracking
-- Run this in Supabase SQL Editor

-- Ensure view_count column exists on islamvoice_episodes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'islamvoice_episodes'
        AND column_name = 'view_count'
    ) THEN
        ALTER TABLE islamvoice_episodes ADD COLUMN view_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create or replace function to increment view count atomically
CREATE OR REPLACE FUNCTION increment_episode_view(episode_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE islamvoice_episodes
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = episode_id;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION increment_episode_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_episode_view(UUID) TO anon;

-- Also ensure the islamvoice_episodes table has proper RLS for updates
-- This allows the view_count to be updated via the RPC function
-- Note: The function runs with SECURITY DEFINER so it bypasses RLS
