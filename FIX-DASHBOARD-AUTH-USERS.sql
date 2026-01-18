-- ========================================
-- Fix Dashboard to Count Real Users from auth.users
-- ========================================
-- Problem: Dashboard queries public.user_data (empty)
-- Solution: Create a function to count auth.users with SECURITY DEFINER

-- ========================================
-- Create function to get total users from auth.users
-- ========================================
CREATE OR REPLACE FUNCTION public.get_total_users()
RETURNS bigint
SECURITY DEFINER  -- This allows the function to access auth schema
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_total_users() TO anon;
GRANT EXECUTE ON FUNCTION public.get_total_users() TO authenticated;

-- ========================================
-- Test the function
-- ========================================
SELECT get_total_users() as total_users;

-- ========================================
-- Also check what's actually in auth.users
-- ========================================
SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_users,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_users
FROM auth.users;

-- ========================================
-- Expected Output:
-- ========================================
-- The function should return the actual number of users
-- in your Supabase Auth system
-- ========================================
