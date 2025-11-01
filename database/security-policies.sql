-- Row Level Security (RLS) Policies for Tafsir Kurd Database
-- Run these commands in your Supabase SQL Editor

-- ========================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ========================================

-- User profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Reading progress table
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- Bookmarks table
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- User activity table
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Goals table
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. USER PROFILES POLICIES
-- ========================================

-- Users can view only their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON user_profiles FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- 3. READING PROGRESS POLICIES
-- ========================================

-- Users can view only their own reading progress
CREATE POLICY "Users can view own reading progress"
ON reading_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own reading progress
CREATE POLICY "Users can insert own reading progress"
ON reading_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reading progress
CREATE POLICY "Users can update own reading progress"
ON reading_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reading progress
CREATE POLICY "Users can delete own reading progress"
ON reading_progress FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- 4. BOOKMARKS POLICIES
-- ========================================

-- Users can view only their own bookmarks
CREATE POLICY "Users can view own bookmarks"
ON bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own bookmarks
CREATE POLICY "Users can insert own bookmarks"
ON bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookmarks
CREATE POLICY "Users can update own bookmarks"
ON bookmarks FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
ON bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- 5. USER ACTIVITY POLICIES
-- ========================================

-- Users can view only their own activity
CREATE POLICY "Users can view own activity"
ON user_activity FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity"
ON user_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own activity
CREATE POLICY "Users can update own activity"
ON user_activity FOR UPDATE
USING (auth.uid() = user_id);

-- ========================================
-- 6. USER GOALS POLICIES
-- ========================================

-- Users can view only their own goals
CREATE POLICY "Users can view own goals"
ON user_goals FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own goals
CREATE POLICY "Users can insert own goals"
ON user_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update own goals"
ON user_goals FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own goals
CREATE POLICY "Users can delete own goals"
ON user_goals FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- 7. PUBLIC TABLES (Read-only for all users)
-- ========================================

-- Quran data table (everyone can read, no one can modify)
ALTER TABLE quran_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quran data"
ON quran_data FOR SELECT
TO authenticated, anon
USING (true);

-- Surah names (everyone can read)
ALTER TABLE surah_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view surah names"
ON surah_names FOR SELECT
TO authenticated, anon
USING (true);

-- ========================================
-- 8. ANALYTICS TABLE (Admin only)
-- ========================================

-- Website stats table (admin only)
ALTER TABLE website_stats ENABLE ROW LEVEL SECURITY;

-- Only admins can view stats
CREATE POLICY "Only admins can view stats"
ON website_stats FOR SELECT
USING (
  auth.email() IN (
    SELECT email FROM admin_users WHERE is_admin = true
  )
);

-- Only admins can update stats
CREATE POLICY "Only admins can update stats"
ON website_stats FOR UPDATE
USING (
  auth.email() IN (
    SELECT email FROM admin_users WHERE is_admin = true
  )
);

-- ========================================
-- 9. CONTACT MESSAGES (Admin + Owner)
-- ========================================

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own messages"
ON contact_messages FOR SELECT
USING (auth.email() = email);

-- Users can insert their own messages
CREATE POLICY "Users can insert messages"
ON contact_messages FOR INSERT
WITH CHECK (true);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON contact_messages FOR SELECT
USING (
  auth.email() IN (
    SELECT email FROM admin_users WHERE is_admin = true
  )
);

-- ========================================
-- 10. SECURITY FUNCTIONS
-- ========================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.email() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's own ID
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 11. AUDIT LOGGING
-- ========================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON audit_log FOR SELECT
USING (is_admin());

-- ========================================
-- 12. INDEXES FOR PERFORMANCE
-- ========================================

-- Index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check if RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- NOTES
-- ========================================

-- 1. Run these policies in your Supabase SQL Editor
-- 2. Test each policy after creation
-- 3. Adjust table names if yours are different
-- 4. Create admin_users table if it doesn't exist
-- 5. Grant appropriate permissions to service role
-- 6. Monitor audit_log table regularly
-- 7. Review and update policies as needed
