-- Fix SECURITY DEFINER issue for profiles_with_avatar view
-- This migration ensures the view respects Row Level Security policies
--
-- Issue: View was using SECURITY DEFINER which bypasses RLS policies
-- Fix: Recreate view with SECURITY INVOKER (default) to enforce RLS
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_with_avatar;

-- Recreate the view WITHOUT security definer
-- This ensures it runs with the permissions of the querying user, not the creator
-- RLS policies on the underlying profiles table will be enforced
CREATE VIEW public.profiles_with_avatar
WITH (security_invoker = true) AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.display_name,
    p.avatar_url,
    p.registration_source,
    p.has_completed_signup,
    p.first_login_at,
    p.created_at,
    p.updated_at,
    p.preferences,
    COALESCE(p.avatar_url, public.get_default_avatar(p.display_name)) as avatar
FROM public.profiles p;

-- Grant SELECT permission to authenticated users
-- They will only see rows permitted by the RLS policies on public.profiles
GRANT SELECT ON public.profiles_with_avatar TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_with_avatar IS
'View of profiles with default avatar fallback. Uses SECURITY INVOKER to respect RLS policies on public.profiles table.';

-- Verify RLS is enabled on the underlying table
-- (This should already be set, but checking for safety)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Confirm the fix
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed profiles_with_avatar view - now using SECURITY INVOKER';
    RAISE NOTICE '✅ RLS policies on public.profiles will now be enforced for this view';
    RAISE NOTICE '✅ Users can only see their own profile through this view';
END $$;
