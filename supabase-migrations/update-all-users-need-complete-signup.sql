-- Update profile creation to require complete-signup for ALL users
-- This includes Google OAuth, TV, Email, and Quran registrations
--
-- Change: ALL new users will now go through complete-signup.html
-- After completion, they'll be redirected back to their origin page (quran or tv)

-- Update the handle_new_user function
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

    -- Determine registration source
    IF NEW.raw_user_meta_data->>'provider' = 'google' THEN
        reg_source := 'google';
    ELSIF NEW.raw_user_meta_data->>'registration_source' IS NOT NULL THEN
        reg_source := NEW.raw_user_meta_data->>'registration_source';
    ELSE
        reg_source := 'quran';  -- Default to quran for backward compatibility
    END IF;

    INSERT INTO public.profiles (
        id, email, full_name, display_name, avatar_url,
        registration_source, has_completed_signup, first_login_at
    ) VALUES (
        NEW.id, user_email, user_name, user_name, user_avatar, reg_source,
        false,  -- ALL users must complete signup now (Google, TV, Email, Quran)
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

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Updated handle_new_user function';
    RAISE NOTICE '✅ ALL new users will now go to complete-signup.html';
    RAISE NOTICE '✅ After completion, users redirect to their origin page';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Flow:';
    RAISE NOTICE '   1. User signs up from quran.html or tv.html';
    RAISE NOTICE '   2. Redirected to complete-signup.html';
    RAISE NOTICE '   3. Complete profile (or skip)';
    RAISE NOTICE '   4. Redirected back to origin (quran.html or tv.html)';
END $$;
