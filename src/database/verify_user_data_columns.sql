-- Verify that location columns exist in user_data table
-- Run this in Supabase SQL Editor to see the table structure

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_data'
ORDER BY ordinal_position;
