-- 🔥 COPY-PASTE THIS - Fix all function search_path security warnings

-- 1. Fix cleanup_expired_otps
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.otp_codes
    WHERE expires_at < NOW();
END;
$$;

-- 2. Fix handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 3. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    user_avatar TEXT;
    reg_source TEXT;
BEGIN
    user_email := NEW.email;
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(user_email, '@', 1)
    );
    user_avatar := NEW.raw_user_meta_data->>'avatar_url';
    IF NEW.raw_user_meta_data->>'provider' = 'google' THEN
        reg_source := 'google';
    ELSIF NEW.raw_user_meta_data->>'registration_source' IS NOT NULL THEN
        reg_source := NEW.raw_user_meta_data->>'registration_source';
    ELSE
        reg_source := 'email';
    END IF;
    INSERT INTO public.profiles (
        id, email, full_name, display_name, avatar_url,
        registration_source, has_completed_signup, first_login_at
    ) VALUES (
        NEW.id, user_email, user_name, user_name, user_avatar, reg_source,
        CASE WHEN reg_source = 'google' THEN true WHEN reg_source = 'tv' THEN true ELSE false END,
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

-- 4. Fix get_default_avatar
CREATE OR REPLACE FUNCTION public.get_default_avatar(user_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
    RETURN 'https://api.dicebear.com/7.x/initials/svg?seed=' || COALESCE(user_name, 'User');
END;
$$;

-- ✅ Done! Check Database Linter - all 4 warnings should be gone
