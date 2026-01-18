-- ========================================
-- Fix Messages Not Staying "Read"
-- ========================================
-- Problem: Marking messages as read doesn't persist after refresh
-- Cause: No UPDATE policy exists for contact_messages
-- Solution: Add UPDATE policy for authenticated and anon roles

-- ========================================
-- Add UPDATE policies
-- ========================================

-- Drop existing UPDATE policies if any
DROP POLICY IF EXISTS "Admins can update messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow anon update messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Authenticated can update messages" ON public.contact_messages;

-- Allow anon role to UPDATE messages (for admin dashboard using ANON key)
CREATE POLICY "Allow anon update messages"
ON public.contact_messages
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Also allow authenticated role (if you switch to authenticated sessions later)
CREATE POLICY "Authenticated can update messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ========================================
-- Verify UPDATE policies are created
-- ========================================
SELECT
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'contact_messages'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ========================================
-- Expected Output:
-- ========================================
-- You should see:
-- 1. "Allow anon update messages" - {anon} - UPDATE
-- 2. "Authenticated can update messages" - {authenticated} - UPDATE
-- ========================================

-- ========================================
-- Test marking a message as read
-- ========================================
-- Find an unread message
SELECT id, name, email, status, created_at
FROM contact_messages
WHERE status = 'unread'
LIMIT 1;

-- Update it to read (replace ID with actual message ID from above)
-- UPDATE contact_messages
-- SET status = 'read'
-- WHERE id = 'YOUR_MESSAGE_ID_HERE';

-- ========================================
-- After running this SQL:
-- ========================================
-- 1. Refresh your messages page
-- 2. Mark a message as read
-- 3. Refresh again - it should STAY read!
-- ========================================
