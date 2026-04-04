-- Insert ALL update-system translation keys into kurdish_translations (page = 'updates')
-- Covers every visible text in:
--   1. Force-update (hard) overlay — blocks app until updated
--   2. Soft-update sliding banner
--   3. 24-hour local notification reminder (ID 50)
--
-- Dead key (NOT inserted): update.soft_message — only a secondary fallback in code,
-- never shown if update.notice_message is present. Omitted to keep Updates tab clean.
--
-- Run this in your Supabase SQL editor.

INSERT INTO kurdish_translations (key_id, kurdish_text, page, category, context)
VALUES
  -- ── Force-update (hard) overlay ────────────────────────────────────────────
  -- Shown as a full-screen blocking screen when mode = 'hard'
  ('update.title',
   'نوێکردنەوەی پێویستە',
   'updates', 'hard',
   'Force-update overlay — main title (blocks app until updated)'),

  ('update.message',
   'وەشانێکی نوێیی بەردەستە. تکایە بۆ بەردەوامبوون بەرنامە نوێبکەرەوە.',
   'updates', 'hard',
   'Force-update overlay — body message explaining the update is required'),

  ('update.btn',
   'نوێبکەرەوە',
   'updates', 'hard',
   'Force-update overlay — single action button (opens store, cannot be dismissed)'),

  -- ── Soft-update sliding banner ─────────────────────────────────────────────
  -- Slides up from bottom 6s after launch when mode = 'soft'
  ('update.notice_title',
   'نوێکردنەوەیەکی نوێ بەردەستە',
   'updates', 'soft',
   'Soft update banner — title at top of the sliding banner'),

  ('update.notice_message',
   'وەشانێکی نوێیی دابەزاوە. بۆ بەهترین ئەزموون نوێیت بکەرەوە.',
   'updates', 'soft',
   'Soft update banner — body message (overridden by admin-set release notes if provided)'),

  ('update.notice_btn',
   'نوێبکەرەوە',
   'updates', 'soft',
   'Soft update banner — primary button (opens store, permanently snoozes banner)'),

  ('update.notice_later',
   'دواتر',
   'updates', 'soft',
   'Soft update banner — dismiss button (snoozes for cooldown period, default 7 days)'),

  -- ── Update reminder local notification ────────────────────────────────────
  -- Scheduled once per version, fires 24h after soft update is first detected
  ('update.notice_notification_title',
   'نوێکردنەوەیەکی نوێ بەردەستە',
   'updates', 'notification',
   'Update reminder notification — title shown in the OS notification shade'),

  ('update.notice_notification_body',
   'ئەپی تافسیر کوردی نوێبکەرەوە — وەشانێکی نوێیی دابەزاوە.',
   'updates', 'notification',
   'Update reminder notification — body text. Tapping opens the store.')

ON CONFLICT (key_id) DO UPDATE
  SET kurdish_text = EXCLUDED.kurdish_text,
      page         = EXCLUDED.page,
      category     = EXCLUDED.category,
      context      = EXCLUDED.context;
