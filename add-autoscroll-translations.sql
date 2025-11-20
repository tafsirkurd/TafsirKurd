-- Add new auto-scroll related translations to kurdish_translations table
-- Run this in Supabase SQL Editor

-- Settings page auto-scroll speed translations
INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
-- Auto-scroll speed control
('auto_scroll_speed_label', 'settings.html', 'Speed control label', 'settings', 'خێرایا زڤراندنێ', true),
('auto_scroll_speed_desc', 'settings.html', 'Speed control description', 'settings', 'دیارکرنا خێرایا زڤراندنا خۆکار', true),

-- Speed level names
('speed_very_slow', 'settings.html', 'Speed level 1', 'settings', 'زۆر هێواش', true),
('speed_slow', 'settings.html', 'Speed level 2', 'settings', 'هێواش', true),
('speed_medium', 'settings.html', 'Speed level 3', 'settings', 'ناڤەند', true),
('speed_fast', 'settings.html', 'Speed level 4', 'settings', 'خێرا', true),
('speed_very_fast', 'settings.html', 'Speed level 5', 'settings', 'زۆر خێرا', true),

-- Quran page auto-scroll notifications
('autoscroll_enabled_notification', 'Quran.html', 'Auto-scroll enabled notification', 'notifications', 'زڤراندنا خۆکار چالاککر - تکایە بچە بۆ خواندنا سوورەتێ', true),
('autoscroll_disabled_notification', 'Quran.html', 'Auto-scroll disabled notification', 'notifications', 'زڤراندنا خۆکار نەچالاککر', true),
('autoscroll_need_surah', 'Quran.html', 'Need to open surah first', 'notifications', 'تکایە سوورەتەکێ ڤەکەرە بۆ زڤراندنا خۆکار', true),
('autoscroll_reached_end', 'Quran.html', 'Reached end of page', 'notifications', 'گەهشتیە دوماهیێ', true),
('autoscroll_stopped_scroll_up', 'Quran.html', 'Stopped due to scroll up', 'notifications', 'زڤراندنا خۆکار ڕاگیرا - تو ب دەستێ گەریایت بۆ ژور', true),
('autoscroll_stopped_mobile', 'Quran.html', 'Stopped on mobile', 'notifications', 'زڤراندنا خۆکار ڕاگیرا', true)

ON CONFLICT (key_id) DO UPDATE SET
    kurdish_text = EXCLUDED.kurdish_text,
    updated_at = NOW();
