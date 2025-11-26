-- ============================================
-- COMPLETE KURDISH TRANSLATIONS - ALL TEXTS
-- Every single Kurdish text from the website
-- ============================================

-- Insert all remaining translations (additions to existing 70+ base translations)

-- ALERTS & CONFIRMATIONS
INSERT INTO kurdish_translations (key_id, kurdish_text, context, category, page) VALUES
('alert_bookmark_delete_confirm', 'ئایا دڵنیای ژ سڕینەڤەیا ڤێ نیشانەیێ؟', 'Confirmation dialog', 'messages', 'bookmarks.html'),
('alert_feature_delete_confirm', 'دلنیایی کو دڤێی ئەڤ تایبەتمەندی بژێی؟', 'Confirmation dialog', 'messages', 'admin.html'),
('alert_schedule_delete_confirm', 'دلنیایی کو دڤێی ئەڤ خشتە بژێی؟', 'Confirmation dialog', 'messages', 'admin.html'),
('alert_signout_confirm', 'ئایا دڵنیایت لە دەرکەفتن؟', 'Confirmation dialog', 'messages', 'profile.html'),
('alert_delete_account_confirm', '⚠️ ئاگاداربوونەوە: ئەم کردارە هەمیشەییە!\n\nهەموو زانیاریەکانت بە تەواوی دەسڕێتەوە و ناتوانیت بیگەڕێنیتەوە.\n\nئایا دڵنیایت لە سڕینەڤا هەژمارێ؟', 'Confirmation dialog', 'messages', 'profile.html'),
('alert_delete_account_confirm2', 'دڵنیایت؟ ئەم کارە ناگەڕێتەوە!', 'Confirmation dialog', 'messages', 'profile.html'),
('alert_reset_progress_confirm', 'دڵنیای دەتەوێت هەموو پێشکەفتنەکەت بسڕیتەوە و لە سەرەتاوە دەست پێ بکەیتەوە؟\n\nئەمە هەموو شتێک دەسڕێتەوە:\n• پۆزیشنی خواندن\n• ئامارەکان (ڕۆژی چالاک، سوورەت تەمام، ئایەتا هاتیە خواندن)\n• ئایەتە خوێندراوەکان\n• هەموو داتا\n\nئایا دڵنیایت؟', 'Confirmation dialog', 'messages', 'Quran.html'),
('alert_reset_settings_confirm', 'ئایا دڵنیایت لە گەڕیاندنەڤەیا هەموو رێکخستنان بۆ بنەڕەت؟', 'Confirmation dialog', 'messages', 'settings.html'),
('alert_delete_goals_confirm', 'ئایا دڵنیایت لە سڕینەڤەیا هەمی زانیاریان و دەستپێکرنەوە؟', 'Confirmation dialog', 'messages', 'goals.html'),
('alert_manual_entry_empty', 'تکایە هەردوو خانە پڕ بکە', 'Alert message', 'messages', 'goals.html'),
('alert_goal_select', 'تکایە ئارمانجەکێ هەلبژێرە', 'Alert message', 'messages', 'reading-goal.html'),
('alert_goal_custom_required', 'تکایە هەلبژێرەکا خۆ بکە', 'Alert message', 'messages', 'reading-goal.html'),
('alert_goal_valid_number', 'تکایە ژمارەیەکا دروست بنڤیسە', 'Alert message', 'messages', 'reading-goal.html'),
('alert_goal_saved', 'ئارمانجا تە هاتە تۆمارکرن! رێڤیا خۆ دەستپێبکە 🎉', 'Alert message', 'messages', 'reading-goal.html')
ON CONFLICT (key_id) DO UPDATE SET
    kurdish_text = EXCLUDED.kurdish_text,
    context = EXCLUDED.context,
    category = EXCLUDED.category,
    page = EXCLUDED.page;

-- NOTIFICATIONS (Success messages)
INSERT INTO kurdish_translations (key_id, kurdish_text, context, category, page) VALUES
('notif_bookmark_removed', 'نیشانە هاتە سڕینەڤە', 'Success notification', 'messages', 'bookmarks.html'),
('notif_note_saved', 'تێبینییا پاشکەفتکری', 'Success notification', 'messages', 'bookmarks.html'),
('notif_bookmark_deleted', 'نیشانە هاتە ژێبرن', 'Success notification', 'messages', 'Quran.html'),
('notif_bookmarked', 'نیشانەکرن', 'Success notification', 'messages', 'Quran.html'),
('notif_copied_with_tafsir', 'دگەل تەفسیرێ هاتە کۆپیکرن', 'Success notification', 'messages', 'Quran.html'),
('notif_copied_without_tafsir', 'بێ تەفسیر هاتە کۆپیکرن', 'Success notification', 'messages', 'Quran.html'),
('notif_tafsir_copied', 'تەفسیر هاتە کۆپیکرن', 'Success notification', 'messages', 'Quran.html'),
('notif_signed_out', 'ب سەرکەفتی دەرکەفتی - هەموو پێشکەفتنێن تە هاتنە پاشکەفتکرن', 'Success notification', 'messages', 'Quran.html'),
('notif_account_deleted', 'هەژمارا تە ب سەرکەفتی هاتە سڕینەڤە', 'Success notification', 'messages', 'profile.html'),
('notif_manual_entry_added', 'زانیاریەک هاتە زێدەکرن', 'Success notification', 'messages', 'goals.html'),
('notif_all_data_deleted', 'هەمی زانیاری هاتنە سڕینەڤە', 'Success notification', 'messages', 'goals.html'),
('notif_progress_reset', 'هەمی پێشکەفتن هاتنە سڕینەڤە! ژ دەستپێکێ دەست پێ بکە', 'Success notification', 'messages', 'Quran.html'),
('notif_darkmode_enabled', 'رەوشا تاریک چالاککر', 'Success notification', 'messages', 'Quran.html,settings.html,complete-signup.html'),
('notif_lightmode_enabled', 'رەوشا رووناهیێ چالاککر', 'Success notification', 'messages', 'Quran.html,settings.html,complete-signup.html'),
('notif_darkmode_enabled_alt', 'رەوشا تاری هاتە چالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_lightmode_enabled_alt', 'رەوشا ڕووناهیێ هاتە چالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_arabic_font_changed', 'فۆنتا عەرەبی هاتە گوهۆڕین', 'Success notification', 'messages', 'Quran.html,settings.html'),
('notif_tafsir_font_changed', 'فۆنتا تەفسیرێ هاتە گوهۆڕین', 'Success notification', 'messages', 'Quran.html,settings.html'),
('notif_tafsir_shown', 'تەفسیر هاتە نیشاندان', 'Success notification', 'messages', 'Quran.html,settings.html'),
('notif_tafsir_hidden', 'تەفسیر شارای', 'Success notification', 'messages', 'Quran.html'),
('notif_tafsir_hidden_alt', 'تەفسیر هاتە ڤەشارتن', 'Success notification', 'messages', 'settings.html'),
('notif_autoscroll_enabled', 'زڤراندنا خۆکار چالاککر - تکایە بچە بۆ خواندنا سوورەتێ', 'Success notification', 'messages', 'Quran.html'),
('notif_autoscroll_disabled', 'زڤراندنا خۆکار نەچالاککر', 'Success notification', 'messages', 'Quran.html'),
('notif_autoscroll_enabled_alt', 'زڤڕاندنا خۆکار هاتە چالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_autoscroll_disabled_alt', 'زڤڕاندنا خۆکار هاتە نەچالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_settings_reset', 'رێکخستن گەڕیانڤە بۆ بنەڕەت', 'Success notification', 'messages', 'Quran.html'),
('notif_settings_reset_alt', 'ڕێکخستن ڤەگەڕیان سەر ڕەوشا بنەڕەت', 'Success notification', 'messages', 'settings.html'),
('notif_email_reminders_enabled', 'بیرهاتنێن ئیمەیلی هاتنە چالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_email_reminders_disabled', 'بیرهاتنێن ئیمەیلی هاتنە نەچالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_browser_notif_enabled', 'بیرهاتنێن گەڕۆکی هاتنە چالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_browser_notif_disabled', 'بیرهاتنێن گەڕۆکی هاتنە نەچالاککرن', 'Success notification', 'messages', 'settings.html'),
('notif_reached_end', 'گەهشتیە دوماهیێ', 'Info notification', 'messages', 'Quran.html'),
('notif_juz_info', 'جوزئی ${juzNum} - ${juzSurahs.length} سوورەت', 'Info notification', 'messages', 'Quran.html')
ON CONFLICT (key_id) DO UPDATE SET
    kurdish_text = EXCLUDED.kurdish_text,
    context = EXCLUDED.context,
    category = EXCLUDED.category,
    page = EXCLUDED.page;

-- ERROR MESSAGES
INSERT INTO kurdish_translations (key_id, kurdish_text, context, category, page) VALUES
('error_signin_failed', 'خەلەتییەک چێبوو، تکایە دووبارە هەول بدە', 'Error message', 'messages', 'login.html'),
('error_signin_unsuccessful', 'چوونە ژوورڤە سەرکەفتی نەبوو', 'Error message', 'messages', 'login.html'),
('error_loading_data', 'هەلە د بارکرنا زانیاریان دا', 'Error message', 'messages', 'Quran.html'),
('error_please_signin', 'تکایە چوونە ژوورڤە بکە', 'Error message', 'messages', 'Quran.html'),
('error_autoscroll_need_surah', 'تکایە سوورەتەکێ ڤەکەرە بۆ زڤراندنا خۆکار', 'Error message', 'messages', 'Quran.html'),
('error_wait_for_quran', 'تکایە چاڤەرێ بە هەتا قورئان بار ببت', 'Error message', 'messages', 'Quran.html'),
('error_browser_notif_permission', 'مافێ بیرهاتنێن گەڕۆکی نەهاتە دان', 'Error message', 'messages', 'settings.html'),
('error_generic', 'خەلەتییەک چێبوو', 'Error message', 'messages', 'settings.html'),
('msg_already_signed_in', 'هەوە پێشتر چوو بوونە ژوورڤە', 'Info message', 'messages', 'login.html')
ON CONFLICT (key_id) DO UPDATE SET
    kurdish_text = EXCLUDED.kurdish_text,
    context = EXCLUDED.context,
    category = EXCLUDED.category,
    page = EXCLUDED.page;

-- LOADING & EMPTY STATES
INSERT INTO kurdish_translations (key_id, kurdish_text, context, category, page) VALUES
('loading_starting', 'دەستپێدکەت...', 'Loading message', 'messages', 'Quran.html'),
('loading_juz', 'بارکردنی جوزئی ${juzNum}...', 'Loading message', 'messages', 'Quran.html'),
('loading_ayahs', 'بارکرنا ئایەتان...', 'Loading message', 'messages', 'Quran.html'),
('loading_saving', '⏳ تۆمار دبیت...', 'Loading message', 'messages', 'admin.html'),
('loading_submitting', 'هنارتن...', 'Loading message', 'messages', 'index.html'),
('empty_no_data', 'زانیاری بەردەست نینە', 'Empty state', 'messages', 'Quran.html'),
('empty_no_activity', 'هێشتا چالاکیا تە نینە', 'Empty state', 'messages', 'profile.html'),
('empty_ayah_not_available', 'تێکستێ ئایەتێ بەردەست نینە', 'Empty state', 'messages', 'bookmarks.html'),
('search_no_results', 'چ ژ ئەنجامان نەهاتە دیتن', 'Search message', 'messages', 'Quran.html')
ON CONFLICT (key_id) DO UPDATE SET
    kurdish_text = EXCLUDED.kurdish_text,
    context = EXCLUDED.context,
    category = EXCLUDED.category,
    page = EXCLUDED.page;

-- DYNAMIC TEXT LABELS
INSERT INTO kurdish_translations (key_id, kurdish_text, context, category, page) VALUES
('label_welcome_user', 'ب خێر بێی ${name}! 🎉', 'Dynamic label', 'messages', 'onboarding.html'),
('label_goal_title', 'ئارمانجا تە', 'Label', 'goals', 'goals.html'),
('label_previous_surah', 'سوورەتا پێشوو', 'Label', 'navigation', 'Quran.html'),
('label_next_surah', 'سوورەتا دواتر', 'Label', 'navigation', 'Quran.html'),
('label_ayah_info', '${ayahsRead} / ${totalAyahs} ئایەت', 'Label', 'profile', 'Quran.html'),
('label_ayah_count', '${count} ئایەت', 'Label', 'profile', 'Quran.html'),
('label_ayah_number', 'ئایەتا ${number}', 'Label', 'profile', 'Quran.html'),
('label_days_streak', '${streak} رۆژ بەردەوام بە', 'Badge label', 'profile', 'profile.html'),
('label_level', 'ئاستا ${level}', 'Badge label', 'profile', 'profile.html'),
('label_member_since_year', 'ئەندام لە ${year}', 'Badge label', 'profile', 'profile.html'),
('label_minutes', 'خولەک', 'Unit label', 'goals', 'reading-goal.html'),
('label_pages', 'لاپەڕ', 'Unit label', 'goals', 'reading-goal.html'),
('label_ayah_surah_juz', 'ئایەت / سوورەت / جوز', 'Unit label', 'goals', 'reading-goal.html')
ON CONFLICT (key_id) DO UPDATE SET
    kurdish_text = EXCLUDED.kurdish_text,
    context = EXCLUDED.context,
    category = EXCLUDED.category,
    page = EXCLUDED.page;

-- ADDITIONAL BUTTONS & ACTIONS
INSERT INTO kurdish_translations (key_id, kurdish_text, context, category, page) VALUES
('btn_start', 'دەستپێکرن', 'Button text', 'buttons', 'onboarding.html,complete-signup.html'),
('btn_save_changes', '💾 تۆمارکرنا گوهەرتنا', 'Button text', 'buttons', 'admin.html'),
('btn_send_message', 'هنارتنا نامەیێ', 'Button text', 'buttons', 'index.html')
ON CONFLICT (key_id) DO UPDATE SET
    kurdish_text = EXCLUDED.kurdish_text,
    context = EXCLUDED.context,
    category = EXCLUDED.category,
    page = EXCLUDED.page;

-- Success message for complete insertions
DO $$
BEGIN
    RAISE NOTICE '✅ Complete Kurdish translations inserted!';
    RAISE NOTICE '📝 Total: 130+ translations covering ALL website text';
    RAISE NOTICE '💬 Includes: alerts, notifications, errors, loading states, labels, buttons';
    RAISE NOTICE '🎯 Ready to manage from admin panel!';
END $$;
