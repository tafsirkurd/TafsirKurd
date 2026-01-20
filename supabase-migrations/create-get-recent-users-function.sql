-- Create get_recent_users function for admin dashboard
-- This function returns the most recent users with their profile information
-- Run this in Supabase SQL Editor

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_recent_users(INTEGER);

CREATE OR REPLACE FUNCTION public.get_recent_users(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    email_confirmed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email::TEXT,
        p.full_name::TEXT,
        p.avatar_url::TEXT,
        u.created_at,
        u.email_confirmed_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    ORDER BY u.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Grant execute permission to service_role (admin)
GRANT EXECUTE ON FUNCTION public.get_recent_users(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recent_users(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_recent_users IS 'Returns the most recent users for admin dashboard with avatar URLs';
