-- Widget Translation System
-- Run this once against your Supabase project.
-- Safe to rerun: INSERT uses ON CONFLICT DO NOTHING.

-- Step 1: Extend kurdish_translations with platform-override columns
ALTER TABLE kurdish_translations
  ADD COLUMN IF NOT EXISTS ios_text     TEXT,
  ADD COLUMN IF NOT EXISTS android_text TEXT;

-- Step 2: Seed all widget translation keys
-- page='widgets', category=group, kurdish_text=shared default value
INSERT INTO kurdish_translations (key_id, kurdish_text, page, category, context) VALUES

-- ── prayer_widget ──────────────────────────────────────────────────────
('widget.prayer.fajr',        'سپێدە',                         'widgets', 'prayer_widget', 'Fajr prayer name shown in prayer widget rows'),
('widget.prayer.sunrise',     'ڕوژهەلات',                      'widgets', 'prayer_widget', 'Sunrise name in prayer widget rows'),
('widget.prayer.dhuhr',       'نیڤرۆ',                         'widgets', 'prayer_widget', 'Dhuhr name in prayer widget rows'),
('widget.prayer.asr',         'ئێڤار',                         'widgets', 'prayer_widget', 'Asr name in prayer widget rows'),
('widget.prayer.maghrib',     'مەغرەب',                        'widgets', 'prayer_widget', 'Maghrib name in prayer widget rows'),
('widget.prayer.isha',        'عەیشا',                         'widgets', 'prayer_widget', 'Isha name in prayer widget rows'),
('widget.prayer.empty_title', 'کاتا نوێژ',                    'widgets', 'prayer_widget', 'Prayer widget empty-state title (no data loaded yet)'),
('widget.prayer.empty_hint',  'بکوژێنەوە بۆ بارکردن',         'widgets', 'prayer_widget', 'Tap-to-load hint shown under empty-state title'),
('widget.prayer.time_left',   'یێت ماین',                     'widgets', 'prayer_widget', 'Countdown suffix — rendered as "HH:MM یێت ماین"'),
('widget.prayer.widget_name', 'کاتا نوێژ',                    'widgets', 'prayer_widget', 'Prayer widget display name in iOS/Android widget gallery'),
('widget.prayer.widget_desc', 'کاتەکانی نوێژ نیشان بدە',      'widgets', 'prayer_widget', 'Prayer widget description in iOS/Android widget gallery'),
('widget.prayer.lock_name',   'دەمێن نڤێژان',                  'widgets', 'prayer_widget', 'Lock-screen prayer widget name in iOS widget gallery'),
('widget.prayer.lock_desc',   'دیارکرنا دەمێن نڤێژان',         'widgets', 'prayer_widget', 'Lock-screen prayer widget description in gallery'),

-- ── ayah_widget ────────────────────────────────────────────────────────
('widget.ayah.empty_title',   'هیچ ئایەتێک نەبژاردراوە',      'widgets', 'ayah_widget',   'Ayah widget empty-state title (user has not starred an ayah yet)'),
('widget.ayah.empty_hint',    'لە دانەی ئایەتێک بژێرە',        'widgets', 'ayah_widget',   'Ayah empty-state sub-hint telling user to select from the app'),
('widget.ayah.lock_fallback', 'کتێبی پیرۆز',                   'widgets', 'ayah_widget',   'Lock-screen ayah widget fallback when no ayah is set'),
('widget.ayah.widget_name',   'ئایەتا قورئانێ',                'widgets', 'ayah_widget',   'Ayah widget display name in iOS/Android widget gallery'),
('widget.ayah.widget_desc',   'ئایەتا بژاردەی خۆت نیشان بدە', 'widgets', 'ayah_widget',   'Ayah widget description in iOS/Android widget gallery'),

-- ── goal_widget ────────────────────────────────────────────────────────
('widget.goal.empty_title',   'ئامانجا ئیرۆ',                  'widgets', 'goal_widget',   'Goal widget empty-state title'),
('widget.goal.empty_hint',    'بکوژێنەوە بۆ بینین',            'widgets', 'goal_widget',   'Tap-to-see hint in goal widget empty state'),
('widget.goal.lock_fallback', 'ئامانجا ئیرۆ',                  'widgets', 'goal_widget',   'Lock-screen goal widget fallback label'),
('widget.goal.title',         'ئامانجا ئیرۆ',                  'widgets', 'goal_widget',   'Header label in medium/large goal widget'),
('widget.goal.ayah_label',    'ئایەت',                         'widgets', 'goal_widget',   'Label shown next to the ayah count (e.g. "5 ئایەت")'),
('widget.goal.streak_label',  'ڕۆژ',                           'widgets', 'goal_widget',   'Label shown next to streak count (e.g. "🔥3 ڕۆژ")'),
('widget.goal.widget_name',   'ئامانجا ئیرۆ',                  'widgets', 'goal_widget',   'Goal widget display name in iOS/Android widget gallery'),
('widget.goal.widget_desc',   'پێشکەوتنی مانگرتن و ستریک',    'widgets', 'goal_widget',   'Goal widget description in iOS/Android widget gallery'),
('widget.goal.completed',     '🎉 ئامانجت تەواو کر!',          'widgets', 'goal_widget',   'Motivational message shown when daily goal is completed'),
('widget.goal.motivate',      'بەردەوام بە، دەتوانی!',         'widgets', 'goal_widget',   'Motivational message shown while goal is still in progress')

ON CONFLICT (key_id) DO NOTHING;
