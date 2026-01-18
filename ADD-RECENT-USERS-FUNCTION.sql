-- ========================================
-- Add Function to Get Recent Users
-- ========================================
-- This allows dashboard to display recently registered users

-- Create function to get recent users from auth.users
CREATE OR REPLACE FUNCTION public.get_recent_users(limit_count int DEFAULT 5)
RETURNS TABLE (
    id uuid,
    email text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    email_confirmed_at timestamptz
)
SECURITY DEFINER  -- Allows access to auth schema
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at
  FROM auth.users u
  WHERE u.deleted_at IS NULL
  ORDER BY u.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_recent_users(int) TO anon;
GRANT EXECUTE ON FUNCTION public.get_recent_users(int) TO authenticated;

-- ========================================
-- Test the function
-- ========================================
SELECT * FROM get_recent_users(5);

-- ========================================
-- Expected Output:
-- ========================================
-- Shows the 5 most recently registered users
-- with their email, registration date, and last sign-in
-- ========================================
