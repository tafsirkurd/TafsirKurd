-- Fix function_search_path_mutable security warnings
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- Issue: Functions without explicit search_path are vulnerable to search_path hijacking attacks
-- Fix: Add SET search_path = '' to all SECURITY DEFINER functions
--
-- Security Impact:
-- ✅ Prevents malicious users from manipulating search_path to execute harmful code
-- ✅ Ensures functions only access intended schemas
-- ✅ Complies with PostgreSQL security best practices

-- ============================================================================
-- 1. Fix cleanup_expired_otps function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- 🔒 Security: Prevent search_path manipulation
AS $$
BEGIN
    DELETE FROM public.otp_codes
    WHERE expires_at < NOW();
END;
$$;

-- ============================================================================
-- 2. Fix handle_updated_at function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- 🔒 Security: Prevent search_path manipulation
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Fix handle_new_user function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- 🔒 Security: Prevent search_path manipulation
AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    user_avatar TEXT;
    reg_source TEXT;
BEGIN
    -- Get email from new user
    user_email := NEW.email;

    -- Get name from user metadata
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(user_email, '@', 1)
    );

    -- Get avatar from user metadata (Google provides this)
    user_avatar := NEW.raw_user_meta_data->>'avatar_url';

    -- Determine registration source
    IF NEW.raw_user_meta_data->>'provider' = 'google' THEN
        reg_source := 'google';
    ELSIF NEW.raw_user_meta_data->>'registration_source' IS NOT NULL THEN
        reg_source := NEW.raw_user_meta_data->>'registration_source';
    ELSE
        reg_source := 'email';
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        display_name,
        avatar_url,
        registration_source,
        has_completed_signup,
        first_login_at
    ) VALUES (
        NEW.id,
        user_email,
        user_name,
        user_name,
        user_avatar,
        reg_source,
        CASE
            WHEN reg_source = 'google' THEN true  -- Google users have complete info
            WHEN reg_source = 'tv' THEN true      -- TV users skip complete-signup
            ELSE false                             -- Email/quran users need complete-signup
        END,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Fix get_default_avatar function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_default_avatar(user_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''  -- 🔒 Security: Prevent search_path manipulation
AS $$
BEGIN
    -- Return a DiceBear avatar URL based on username
    RETURN 'https://api.dicebear.com/7.x/initials/svg?seed=' || COALESCE(user_name, 'User');
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed 4 functions with search_path security issue:';
    RAISE NOTICE '   1. cleanup_expired_otps';
    RAISE NOTICE '   2. handle_updated_at';
    RAISE NOTICE '   3. handle_new_user';
    RAISE NOTICE '   4. get_default_avatar';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Verify in Supabase Dashboard:';
    RAISE NOTICE '   Database → Database Linter';
    RAISE NOTICE '   All function_search_path_mutable warnings should be gone!';
END $$;
