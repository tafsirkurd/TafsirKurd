-- Migration: ensure_admin_permissions_all_pages
-- Ensures every non-super_admin, non-editor user has a row in admin_permissions
-- for every known admin page slug. Missing rows cause silent redirects for custom-role users.
--
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING
-- Default: can_view=false, can_edit=false — admin must explicitly grant access.
--
-- Run this whenever a new admin page is added to src/admin-*.html

DO $$
DECLARE
  page_slugs TEXT[] := ARRAY[
    'account-management',
    'analytics',
    'app-versions',
    'audit',
    'auth-monitor',
    'bot-protection',
    'codemagic',
    'dashboard',
    'database',
    'db-health',
    'email-templates',
    'errors',
    'features',
    'gencine',
    'header-animation',
    'images',
    'islamvoice-management',
    'jobs',
    'links',
    'messages',
    'notification-analytics',
    'notifications',
    'reading-stats',
    'release-history',
    'schedule',
    'search-console',
    'social-stats',
    'system-health',
    'tasks',
    'translations',
    'updates',
    'users',
    'videos',
    'website',
    'widget-health'
  ];
  slug TEXT;
  u RECORD;
BEGIN
  -- For each custom-role user, ensure a permission row exists for every page
  FOR u IN
    SELECT id FROM admin_users
    WHERE role = 'custom' AND is_active = true
  LOOP
    FOREACH slug IN ARRAY page_slugs LOOP
      INSERT INTO admin_permissions (user_id, page_slug, can_view, can_edit)
      VALUES (u.id, slug, false, false)
      ON CONFLICT (user_id, page_slug) DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'admin_permissions backfill complete for all custom-role users';
END $$;

-- Show current coverage: which pages have NO permission row for any custom-role user
SELECT
  p.slug,
  COUNT(ap.user_id) AS users_with_row,
  COUNT(au.id) AS total_custom_users
FROM
  (SELECT unnest(ARRAY[
    'account-management','analytics','app-versions','audit','auth-monitor',
    'bot-protection','codemagic','dashboard','database','db-health',
    'email-templates','errors','features','gencine','header-animation',
    'images','islamvoice-management','jobs','links','messages',
    'notification-analytics','notifications','reading-stats','release-history','schedule',
    'search-console','social-stats','system-health','tasks','translations','updates',
    'users','videos','website','widget-health'
  ]) AS slug) p
  CROSS JOIN (SELECT COUNT(*) AS id FROM admin_users WHERE role = 'custom' AND is_active = true) au
  LEFT JOIN admin_permissions ap ON ap.page_slug = p.slug
    AND ap.user_id IN (SELECT id FROM admin_users WHERE role = 'custom' AND is_active = true)
GROUP BY p.slug, au.id
ORDER BY p.slug;
