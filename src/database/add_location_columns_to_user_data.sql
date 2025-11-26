-- Add location tracking columns to user_data table
-- Run this in the Supabase SQL Editor

-- Add location columns if they don't exist
ALTER TABLE public.user_data
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_data_country ON public.user_data(country);
CREATE INDEX IF NOT EXISTS idx_user_data_city ON public.user_data(city);
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at ON public.user_data(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data(user_id);

-- Make sure RLS is disabled for user_data table (if you want admins to see all data)
ALTER TABLE public.user_data DISABLE ROW LEVEL SECURITY;

-- Optional: Add a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_data_updated_at
BEFORE UPDATE ON public.user_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
