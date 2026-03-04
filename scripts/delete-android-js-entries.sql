-- Delete auto-generated android_js_* entries (surah names + reciter names)
-- These are extracted from the JS bundle and are not needed as editable translations.
-- Run this in the Supabase SQL editor.

DELETE FROM kurdish_translations
WHERE page = 'android'
  AND key_id LIKE 'android_js_%';
