-- Create Unified Profiles Table for All Users
-- This table stores profile data for both email and Google authenticated users
-- Run this in Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    registration_source TEXT DEFAULT 'quran' CHECK (registration_source IN ('quran', 'tv', 'google', 'email')),
    has_completed_signup BOOLEAN DEFAULT FALSE,
    first_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- User preferences
    preferences JSONB DEFAULT '{
        "darkMode": false,
        "fontSize": "medium",
        "arabicFont": "uthmanic",
        "notifications": true
    }'::jsonb
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_registration_source ON public.profiles(registration_source);
CREATE INDEX IF NOT EXISTS idx_profiles_has_completed_signup ON public.profiles(has_completed_signup);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Service role can do anything
CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Security: Prevent search_path manipulation
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Trigger to update updated_at on profile changes
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- Security: Prevent search_path manipulation
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
        -- Default to 'quran' for backward compatibility
        reg_source := 'quran';
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
        false,  -- ALL users must complete signup (Google, TV, Email, Quran)
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

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to get default avatar based on name
CREATE OR REPLACE FUNCTION public.get_default_avatar(user_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''  -- Security: Prevent search_path manipulation
AS $$
BEGIN
    -- Return a DiceBear avatar URL based on username
    RETURN 'https://api.dicebear.com/7.x/initials/svg?seed=' || COALESCE(user_name, 'User');
END;
$$;

-- View to get user profile with default avatar
-- IMPORTANT: Using security_invoker to enforce RLS policies
-- This prevents SECURITY DEFINER issue (Supabase linter 0010)
CREATE OR REPLACE VIEW public.profiles_with_avatar
WITH (security_invoker = true) AS
SELECT
    p.*,
    COALESCE(p.avatar_url, public.get_default_avatar(p.display_name)) as avatar
FROM public.profiles p;

-- Grant permissions
GRANT SELECT ON public.profiles_with_avatar TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

COMMENT ON TABLE public.profiles IS 'Unified user profiles for email and Google authentication';
COMMENT ON COLUMN public.profiles.registration_source IS 'Where user registered: quran, tv, google, or email';
COMMENT ON COLUMN public.profiles.has_completed_signup IS 'Whether user has completed the signup flow (complete-signup.html)';
COMMENT ON COLUMN public.profiles.first_login_at IS 'When user first logged in';
