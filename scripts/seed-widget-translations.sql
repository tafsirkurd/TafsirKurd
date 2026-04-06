-- Widget translations seed — run in Supabase SQL Editor
-- Inserts all widget.* keys into kurdish_translations (page = 'widgets')
-- Safe: uses ON CONFLICT DO NOTHING so re-running is idempotent

INSERT INTO kurdish_translations (key_id, kurdish_text, ios_text, android_text, page, category, context)
VALUES
  -- ── Prayer Widget ──────────────────────────────────────────────────────
  ('widget.prayer.fajr',        'سپێدە',                        NULL, NULL, 'widgets', 'prayer', 'Prayer name: Fajr'),
  ('widget.prayer.sunrise',     'ڕوژهەلات',                     NULL, NULL, 'widgets', 'prayer', 'Prayer name: Sunrise'),
  ('widget.prayer.dhuhr',       'نیڤرۆ',                        NULL, NULL, 'widgets', 'prayer', 'Prayer name: Dhuhr'),
  ('widget.prayer.asr',         'ئێڤار',                        NULL, NULL, 'widgets', 'prayer', 'Prayer name: Asr'),
  ('widget.prayer.maghrib',     'مەغرەب',                       NULL, NULL, 'widgets', 'prayer', 'Prayer name: Maghrib'),
  ('widget.prayer.isha',        'عەیشا',                        NULL, NULL, 'widgets', 'prayer', 'Prayer name: Isha'),
  ('widget.prayer.time_left',   'یێت ماین',                     NULL, NULL, 'widgets', 'prayer', 'Countdown label e.g. "02:14 یێت ماین"'),
  ('widget.prayer.empty_title', 'کاتا نوێژ',                    NULL, NULL, 'widgets', 'prayer', 'Placeholder title when no data loaded'),
  ('widget.prayer.empty_hint',  'بکوژێنەوە بۆ بارکردن',        NULL, NULL, 'widgets', 'prayer', 'Placeholder hint when no data loaded'),
  ('widget.prayer.widget_name', 'دەمێ نڤێژێ',                  NULL, NULL, 'widgets', 'prayer', 'Widget gallery display name'),
  ('widget.prayer.widget_desc', 'دەمێن نڤێژێ نیشان بدە',       NULL, NULL, 'widgets', 'prayer', 'Widget gallery description'),
  ('widget.prayer.lock_name',   'دەمێن نڤێژان',                NULL, NULL, 'widgets', 'prayer', 'Lock screen widget name'),
  ('widget.prayer.lock_desc',   'دیارکرنا دەمێن نڤێژان',       NULL, NULL, 'widgets', 'prayer', 'Lock screen widget description'),

  -- ── Ayah Widget ───────────────────────────────────────────────────────
  ('widget.ayah.empty_title',   'هیچ ئایەتێک نەبژاردراوە',     NULL, NULL, 'widgets', 'ayah',   'Placeholder title when no ayah selected'),
  ('widget.ayah.empty_hint',    'لە دانەی ئایەتێک بژێرە',      NULL, NULL, 'widgets', 'ayah',   'Placeholder hint — tap to pick ayah'),
  ('widget.ayah.lock_fallback', 'کتێبی پیرۆز',                  NULL, NULL, 'widgets', 'ayah',   'Lock screen fallback text when no ayah'),
  ('widget.ayah.widget_name',   'ئایەتا قورئانێ',               NULL, NULL, 'widgets', 'ayah',   'Widget gallery display name'),
  ('widget.ayah.widget_desc',   'ئایەتا تە هەلبژارتی نیشان بدە', NULL, NULL, 'widgets', 'ayah', 'Widget gallery description'),

  -- ── Goal Widget ────────────────────────────────────────────────────────
  ('widget.goal.empty_title',   'ئامانجا ئیرۆ',                 NULL, NULL, 'widgets', 'goal',   'Placeholder title when no goal data'),
  ('widget.goal.empty_hint',    'بکوژێنەوە بۆ بینین',          NULL, NULL, 'widgets', 'goal',   'Placeholder hint when no goal data'),
  ('widget.goal.lock_fallback', 'ئامانجا ئیرۆ',                 NULL, NULL, 'widgets', 'goal',   'Lock screen fallback text'),
  ('widget.goal.title',         'ئامانجا ئیرۆ',                 NULL, NULL, 'widgets', 'goal',   'Widget title label'),
  ('widget.goal.ayah_label',    'ئایەت',                         NULL, NULL, 'widgets', 'goal',   'Stat label: ayahs read'),
  ('widget.goal.streak_label',  'ڕۆژ',                          NULL, NULL, 'widgets', 'goal',   'Stat label: streak days'),
  ('widget.goal.completed',     '🎉 ئامانجت تەواو کر!',         NULL, NULL, 'widgets', 'goal',   'Message shown when daily goal is met'),
  ('widget.goal.motivate',      'بەردەوام بە، دەتوانی!',        NULL, NULL, 'widgets', 'goal',   'Motivational message when goal not yet met'),
  ('widget.goal.widget_name',   'ئارمانجا ئەڤرۆ',              NULL, NULL, 'widgets', 'goal',   'Widget gallery display name'),
  ('widget.goal.widget_desc',   'دیارکرنا هویرکارییان',         NULL, NULL, 'widgets', 'goal',   'Widget gallery description')

ON CONFLICT (key_id) DO NOTHING;
