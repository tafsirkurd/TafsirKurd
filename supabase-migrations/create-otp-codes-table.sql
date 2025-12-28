-- Create OTP codes table for email verification
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.otp_codes (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index for faster lookups
    CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage OTP codes"
ON public.otp_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to automatically clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.otp_codes
    WHERE expires_at < NOW();
END;
$$;

-- Create a scheduled job to run cleanup every hour (optional - Supabase pg_cron)
-- Uncomment if you have pg_cron extension enabled
-- SELECT cron.schedule(
--     'cleanup-expired-otps',
--     '0 * * * *', -- Every hour
--     $$SELECT public.cleanup_expired_otps()$$
-- );

COMMENT ON TABLE public.otp_codes IS 'Stores OTP verification codes for email verification during signup';
COMMENT ON COLUMN public.otp_codes.email IS 'User email (lowercase)';
COMMENT ON COLUMN public.otp_codes.otp_code IS '6-digit OTP code';
COMMENT ON COLUMN public.otp_codes.expires_at IS 'OTP expiration timestamp (10 minutes from creation)';
COMMENT ON COLUMN public.otp_codes.attempts IS 'Number of failed verification attempts (max 5)';
