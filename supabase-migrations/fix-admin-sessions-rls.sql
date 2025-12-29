-- Fix RLS policy warning for admin_login_sessions table
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
--
-- Issue: Table has RLS enabled but no policies defined
-- Fix: Add appropriate RLS policies for admin session tracking
--
-- Security Model:
-- - Service role has full access (for admin panel operations)
-- - Authenticated users cannot access this table (admin-only)
-- - Public users cannot access this table

-- Ensure RLS is enabled
ALTER TABLE public.admin_login_sessions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role can do anything (admin operations)
CREATE POLICY "Service role can manage admin sessions"
ON public.admin_login_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Block all authenticated users (this is admin-only data)
-- This policy ensures regular users cannot access admin sessions
CREATE POLICY "Regular users cannot access admin sessions"
ON public.admin_login_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Policy 3: Block anonymous/public access
CREATE POLICY "Public cannot access admin sessions"
ON public.admin_login_sessions
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed admin_login_sessions RLS policies';
    RAISE NOTICE '✅ Service role: Full access';
    RAISE NOTICE '✅ Authenticated users: No access (admin-only)';
    RAISE NOTICE '✅ Public users: No access';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Verify in Database Linter:';
    RAISE NOTICE '   The rls_enabled_no_policy warning should be gone';
END $$;
