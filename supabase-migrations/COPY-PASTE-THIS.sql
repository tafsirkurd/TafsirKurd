-- 🔥 SIMPLE FIX - Just copy and paste this entire file into Supabase SQL Editor

-- Drop the old view
DROP VIEW IF EXISTS public.profiles_with_avatar;

-- Recreate with SECURITY INVOKER (fixes the security issue)
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

-- Grant permissions
GRANT SELECT ON public.profiles_with_avatar TO authenticated;

-- Done! Check Database Linter - the warning should be gone ✅
