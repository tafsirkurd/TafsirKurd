-- ================================================
-- Activity Feed Table for TafsirKurd Admin Panel
-- ================================================
-- This table stores all platform activities in a unified format
-- for the centralized activity feed system.
--
-- Features:
-- - Real-time event tracking across all sections
-- - Filterable by category, priority, and time
-- - Mark as read/dismissed functionality
-- - Metadata storage for event context
-- ================================================

CREATE TABLE IF NOT EXISTS admin_activity_feed (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Event Classification
    event_type VARCHAR(50) NOT NULL,      -- e.g., 'new_user_signup', 'quran_completion', 'new_message'
    category VARCHAR(30) NOT NULL,        -- 'users', 'content', 'security', 'analytics'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

    -- Event Content
    title TEXT NOT NULL,                  -- Display title: "New User Registration"
    message TEXT NOT NULL,                -- Description: "John Doe joined from Duhok, Iraq"
    icon VARCHAR(10) DEFAULT '📌',        -- Emoji icon for visual identification

    -- Context & Metadata (JSONB for flexibility)
    metadata JSONB DEFAULT '{}',          -- { userId, email, city, stats, etc. }
    source_table VARCHAR(50),             -- Which table triggered this event
    source_id BIGINT,                     -- ID from source table
    section VARCHAR(50),                  -- Which admin section to navigate to

    -- Admin Interaction
    is_read BOOLEAN DEFAULT false,        -- Has admin viewed this event?
    read_at TIMESTAMPTZ,                  -- When was it marked as read?
    is_dismissed BOOLEAN DEFAULT false,   -- Has admin dismissed this event?

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(), -- When the event occurred

    -- Constraints
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CHECK (category IN ('users', 'content', 'security', 'analytics'))
);

-- ================================================
-- PERFORMANCE INDEXES
-- ================================================

-- Primary index for chronological queries (most common use case)
CREATE INDEX IF NOT EXISTS idx_activity_created_at
ON admin_activity_feed (created_at DESC);

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_activity_category
ON admin_activity_feed (category);

-- Filter by event type
CREATE INDEX IF NOT EXISTS idx_activity_event_type
ON admin_activity_feed (event_type);

-- Filter by priority
CREATE INDEX IF NOT EXISTS idx_activity_priority
ON admin_activity_feed (priority);

-- Unread activities (partial index - only indexes unread events)
CREATE INDEX IF NOT EXISTS idx_activity_unread
ON admin_activity_feed (is_read)
WHERE is_read = false;

-- GIN index for metadata JSONB searches
CREATE INDEX IF NOT EXISTS idx_activity_metadata
ON admin_activity_feed USING GIN (metadata);

-- Composite index for common filter combinations
-- Optimizes queries like: category='users' AND priority='high' AND created_at > date
CREATE INDEX IF NOT EXISTS idx_activity_filters
ON admin_activity_feed (category, priority, created_at DESC)
WHERE is_dismissed = false;

-- Index for source tracking (to find all events from a specific record)
CREATE INDEX IF NOT EXISTS idx_activity_source
ON admin_activity_feed (source_table, source_id);

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON TABLE admin_activity_feed IS
'Centralized activity feed for admin panel - tracks all platform events in unified format';

COMMENT ON COLUMN admin_activity_feed.event_type IS
'Specific event type: new_user_signup, quran_completion, milestone_reached, new_message, security_alert, etc.';

COMMENT ON COLUMN admin_activity_feed.category IS
'High-level category for filtering: users, content, security, analytics';

COMMENT ON COLUMN admin_activity_feed.priority IS
'Event priority for visual emphasis: low (blue), normal (green), high (orange), urgent (red)';

COMMENT ON COLUMN admin_activity_feed.metadata IS
'Flexible JSONB field storing event-specific context like userId, email, location, stats, etc.';

COMMENT ON COLUMN admin_activity_feed.source_table IS
'Original database table that triggered this event (e.g., user_data, contact_messages, bot_logs)';

COMMENT ON COLUMN admin_activity_feed.section IS
'Admin panel section to navigate to when clicked (e.g., users, messages, bots, videos)';

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
-- Note: Only enable if using anon/authenticated roles
-- For service role access, RLS is bypassed

-- Enable RLS on the table
ALTER TABLE admin_activity_feed ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can view all activities" ON admin_activity_feed;
DROP POLICY IF EXISTS "System can insert activities" ON admin_activity_feed;
DROP POLICY IF EXISTS "Admin can update activities" ON admin_activity_feed;
DROP POLICY IF EXISTS "Admin can delete activities" ON admin_activity_feed;

-- Policy: Allow admin users to view all activities
CREATE POLICY "Admin users can view all activities"
ON admin_activity_feed FOR SELECT
USING (true);  -- All authenticated users can read (adjust as needed)

-- Policy: Allow system/triggers to insert activities
CREATE POLICY "System can insert activities"
ON admin_activity_feed FOR INSERT
WITH CHECK (true);  -- Triggers and functions can insert

-- Policy: Allow admin to update activities (mark as read/dismissed)
CREATE POLICY "Admin can update activities"
ON admin_activity_feed FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow admin to delete old activities
CREATE POLICY "Admin can delete activities"
ON admin_activity_feed FOR DELETE
USING (true);

-- ================================================
-- VERIFICATION QUERY
-- ================================================
-- Run this after creating the table to verify it worked:
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'admin_activity_feed'
-- ORDER BY ordinal_position;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Activity Feed table created successfully!';
    RAISE NOTICE '📊 Table: admin_activity_feed';
    RAISE NOTICE '🔢 Indexes: 8 performance indexes created';
    RAISE NOTICE '🔒 RLS: Row Level Security enabled';
    RAISE NOTICE '📝 Next step: Run activity_feed_triggers.sql to enable automatic event tracking';
END $$;
