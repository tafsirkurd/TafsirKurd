-- ========================================
-- Fix Admin Dashboard - Allow ANON role access
-- ========================================
-- Problem: Dashboard uses ANON key (not authenticated sessions)
-- Solution: Add policies allowing ANON role to read these tables

-- ========================================
-- Add ANON access policies
-- ========================================

-- Allow anonymous (ANON key) to read user_data
CREATE POLICY "Allow anon read access to user_data"
ON public.user_data
FOR SELECT
TO anon
USING (true);

-- Verify tv_videos already has anon access
-- (Should already exist: "Anyone can view published videos")

-- Verify contact_messages already has anon access
-- (Should already exist: "Allow anonymous read access to contact messages")

-- ========================================
-- Verify all policies
-- ========================================
SELECT
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('user_data', 'tv_videos', 'contact_messages')
  AND 'anon' = ANY(roles)
ORDER BY tablename, policyname;

-- ========================================
-- Expected Output:
-- ========================================
-- You should see at least 3 policies with 'anon' in roles:
-- 1. user_data: "Allow anon read access to user_data"
-- 2. tv_videos: "Anyone can view published videos"
-- 3. contact_messages: "Allow anonymous read access to contact messages"
-- ========================================

-- ========================================
-- After running this SQL:
-- ========================================
-- 1. Refresh dashboard: Ctrl + Shift + R
-- 2. Total Users should now show real count
-- 3. Total Videos should show real count (if policy has no conditions)
-- 4. Messages should continue working
-- ========================================
