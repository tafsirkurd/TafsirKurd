-- ============================================================
-- Migration: Add title column to gencine_hadiths
-- Also re-ensures the public read RLS policy exists
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add title column (safe — does nothing if column already exists)
ALTER TABLE gencine_hadiths ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. Re-ensure public read policy exists (drop + recreate is safe for idempotency)
DROP POLICY IF EXISTS "gencine_hadiths_public_read" ON gencine_hadiths;
CREATE POLICY "gencine_hadiths_public_read"
  ON gencine_hadiths FOR SELECT TO anon, authenticated USING (active = TRUE);

-- 3. Re-ensure admin write policy exists
DROP POLICY IF EXISTS "gencine_hadiths_admin_all" ON gencine_hadiths;
CREATE POLICY "gencine_hadiths_admin_all"
  ON gencine_hadiths FOR ALL TO authenticated
  USING (TRUE) WITH CHECK (TRUE);
