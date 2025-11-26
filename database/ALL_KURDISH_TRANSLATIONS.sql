-- ============================================================================
-- COMPREHENSIVE KURDISH TRANSLATIONS SQL SCRIPT
-- ============================================================================
-- Database: Supabase PostgreSQL
-- Table: kurdish_translations
-- Generated: 2025-11-20
-- Source: COMPREHENSIVE_KURDISH_TEXT_EXTRACTION.md
-- Total Entries: 300+ Kurdish text items
-- ============================================================================

-- ============================================================================
-- SECTION 1: ALERT MESSAGES
-- ============================================================================
-- Form validation alerts, success messages, and user feedback

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('alert_fill_both_fields', 'goals.html', 'Manual entry validation', 'alerts', 'تکایە هەردوو خانە پڕ بکە', true),
  ('alert_data_added', 'goals.html', 'Data added confirmation', 'alerts', 'زانیاریەک هاتە زێدەکرن', true),
  ('alert_all_data_deleted', 'goals.html', 'All data deleted', 'alerts', 'هەمی زانیاری هاتنە سڕینەڤە', true),
  ('alert_account_deleted_success', 'profile.html', 'Account deleted successfully', 'alerts', 'هەژمارا تە ب سەرکەفتی هاتە سڕینەڤە', true),
  ('alert_select_goal', 'reading-goal.html', 'Please select a goal', 'alerts', 'تکایە ئارمانجەکێ هەلبژێرە', true),
  ('alert_make_selection', 'reading-goal.html', 'Please make your selection', 'alerts', 'تکایە هەلبژێرەکا خۆ بکە', true),
  ('alert_enter_valid_number', 'reading-goal.html', 'Please enter a valid number', 'alerts', 'تکایە ژمارەیەکا دروست بنڤیسە', true),
  ('alert_goal_saved_journey', 'reading-goal.html', 'Your goal has been saved! Start your journey', 'alerts', 'ئارمانجا تە هاتە تۆمارکرن! رێڤیا خۆ دەستپێبکە 🎉', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 2: CONFIRM DIALOG MESSAGES
-- ============================================================================
-- Confirmation dialogs for destructive or important actions

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('confirm_reset_all_settings', 'settings.html', 'Reset all settings confirmation', 'confirm_dialogs', 'ئایا دڵنیایت لە گەڕیاندنەڤەیا هەموو رێکخستنان بۆ بنەڕەت؟', true),
  ('confirm_reset_all_progress', 'Quran.html', 'Reset all progress confirmation', 'confirm_dialogs', 'دڵنیای دەتەوێت هەموو پێشکەفتنەکەت بسڕیتەوە و لە سەرەتاوە دەست پێ بکەیتەوە؟

ئەمە هەموو شتێک دەسڕێتەوە:
• پۆزیشنی خواندن
• ئامارەکان (ڕۆژی چالاک، سوورەت تەمام، ئایەتا هاتیە خواندن)
• ئایەتە خوێندراوەکان
• هەموو داتا

ئایا دڵنیایت؟', true),
  ('confirm_logout', 'profile.html', 'Logout confirmation', 'confirm_dialogs', 'ئایا دڵنیایت لە دەرکەفتن؟', true),
  ('confirm_delete_account', 'profile.html', 'Delete account final confirmation', 'confirm_dialogs', 'دڵنیایت؟ ئەم کارە ناگەڕێتەوە!', true),
  ('confirm_reset_goal_data', 'goals.html', 'Reset all goal data', 'confirm_dialogs', 'ئایا دڵنیایت لە سڕینەڤەیا هەمی زانیاریان و دەستپێکرنەوە؟', true),
  ('confirm_delete_bookmark', 'bookmarks.html', 'Delete bookmark confirmation', 'confirm_dialogs', 'ئایا دڵنیای ژ سڕینەڤەیا ڤێ نیشانەیێ؟', true),
  ('confirm_delete_feature_admin', 'admin.html', 'Delete feature confirmation', 'confirm_dialogs', 'دلنیایی کو دڤێی ئەڤ تایبەتمەندی بژێی؟', true),
  ('confirm_delete_schedule_admin', 'admin.html', 'Delete schedule item confirmation', 'confirm_dialogs', 'دلنیایی کو دڤێی ئەڤ خشتە بژێی؟', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 3: NOTIFICATION MESSAGES
-- ============================================================================
-- Success, error, and info notifications shown via showNotification()

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('notification_bookmark_removed', 'bookmarks.html', 'Bookmark removed', 'notifications', 'نیشانە هاتە سڕینەڤە', true),
  ('notification_note_saved', 'bookmarks.html', 'Note saved', 'notifications', 'تێبینییا پاشکەفتکری', true),
  ('notification_error_try_again', 'login.html', 'Error occurred, please try again', 'notifications', 'خەلەتییەک چێبوو، تکایە دووبارە هەول بدە', true),
  ('notification_login_failed', 'login.html', 'Login failed', 'notifications', 'چوونە ژوورڤە سەرکەفتی نەبوو', true),
  ('notification_already_logged_in', 'login.html', 'Already logged in', 'notifications', 'هەوە پێشتر چوو بوونە ژوورڤە', true),
  ('notification_logout_success', 'Quran.html', 'Successfully logged out - all progress saved', 'notifications', 'ب سەرکەفتی دەرکەفتی - هەموو پێشکەفتنێن تە هاتنە پاشکەفتکرن', true),
  ('notification_error_loading_data', 'Quran.html', 'Error loading data', 'notifications', 'هەلە د بارکرنا زانیاریان دا', true),
  ('notification_autoscroll_paused_manual', 'Quran.html', 'Auto-scroll paused - manual scroll detected', 'notifications', 'زڤراندنا خۆکار ڕاگیرا - تو ب دەستێ گەریایت بۆ ژور', true),
  ('notification_autoscroll_paused', 'Quran.html', 'Auto-scroll paused', 'notifications', 'زڤراندنا خۆکار ڕاگیرا', true),
  ('notification_arabic_font_changed', 'Quran.html', 'Arabic font changed', 'notifications', 'فۆنتا عەرەبی هاتە گوهۆڕین', true),
  ('notification_tafsir_font_changed', 'Quran.html', 'Tafsir font changed', 'notifications', 'فۆنتا تەفسیرێ هاتە گوهۆڕین', true),
  ('notification_autoscroll_enabled_goto_surah', 'Quran.html', 'Auto-scroll enabled - go to surah', 'notifications', 'زڤراندنا خۆکار چالاککر - تکایە بچە بۆ خواندنا سوورەتێ', true),
  ('notification_autoscroll_disabled', 'Quran.html', 'Auto-scroll disabled', 'notifications', 'زڤراندنا خۆکار نەچالاککر', true),
  ('notification_open_surah_for_autoscroll', 'Quran.html', 'Please open a surah for auto-scroll', 'notifications', 'تکایە سوورەتەکێ ڤەکەرە بۆ زڤراندنا خۆکار', true),
  ('notification_reached_end', 'Quran.html', 'Reached the end', 'notifications', 'گەهشتیە دوماهیێ', true),
  ('notification_settings_reset_quran', 'Quran.html', 'Settings reset to default', 'notifications', 'رێکخستن گەڕیانڤە بۆ بنەڕەت', true),
  ('notification_wait_quran_load', 'Quran.html', 'Please wait until Quran loads', 'notifications', 'تکایە چاڤەرێ بە هەتا قورئان بار ببت', true),
  ('notification_bookmark_removed_quran', 'Quran.html', 'Bookmark removed', 'notifications', 'نیشانە هاتە ژێبرن', true),
  ('notification_bookmarked', 'Quran.html', 'Bookmarked', 'notifications', 'نیشانەکرن', true),
  ('notification_copied_with_tafsir', 'Quran.html', 'Copied with tafsir', 'notifications', 'دگەل تەفسیرێ هاتە کۆپیکرن', true),
  ('notification_copied_without_tafsir', 'Quran.html', 'Copied without tafsir', 'notifications', 'بێ تەفسیر هاتە کۆپیکرن', true),
  ('notification_tafsir_copied', 'Quran.html', 'Tafsir copied', 'notifications', 'تەفسیر هاتە کۆپیکرن', true),
  ('notification_please_login', 'Quran.html', 'Please log in', 'notifications', 'تکایە چوونە ژوورڤە بکە', true),
  ('notification_all_progress_deleted', 'Quran.html', 'All progress deleted! Start from beginning', 'notifications', 'هەمی پێشکەفتن هاتنە سڕینەڤە! ژ دەستپێکێ دەست پێ بکە', true),
  ('notification_settings_reset', 'settings.html', 'Settings reset to default', 'notifications', 'ڕێکخستن ڤەگەڕیان سەر ڕەوشا بنەڕەت', true),
  ('notification_error_occurred', 'settings.html', 'Error occurred', 'notifications', 'خەلەتییەک چێبوو', true),
  ('notification_browser_permission_denied', 'settings.html', 'Browser notification permission denied', 'notifications', 'مافێ بیرهاتنێن گەڕۆکی نەهاتە دان', true),
  ('notification_dark_mode_enabled', 'settings.html', 'Dark mode enabled', 'notifications', 'رەوشا تاری هاتە چالاککرن', true),
  ('notification_light_mode_enabled', 'settings.html', 'Light mode enabled', 'notifications', 'رەوشا ڕووناهیێ هاتە چالاککرن', true),
  ('notification_tafsir_shown', 'settings.html', 'Tafsir shown', 'notifications', 'تەفسیر هاتە نیشاندان', true),
  ('notification_tafsir_hidden', 'settings.html', 'Tafsir hidden', 'notifications', 'تەفسیر هاتە ڤەشارتن', true),
  ('notification_autoscroll_enabled', 'settings.html', 'Auto-scroll enabled', 'notifications', 'زڤڕاندنا خۆکار هاتە چالاککرن', true),
  ('notification_autoscroll_disabled_settings', 'settings.html', 'Auto-scroll disabled', 'notifications', 'زڤڕاندنا خۆکار هاتە نەچالاککرن', true),
  ('notification_email_notifications_enabled', 'settings.html', 'Email notifications enabled', 'notifications', 'بیرهاتنێن ئیمەیلی هاتنە چالاککرن', true),
  ('notification_email_notifications_disabled', 'settings.html', 'Email notifications disabled', 'notifications', 'بیرهاتنێن ئیمەیلی هاتنە نەچالاککرن', true),
  ('notification_browser_notifications_enabled', 'settings.html', 'Browser notifications enabled', 'notifications', 'بیرهاتنێن گەڕۆکی هاتنە چالاککرن', true),
  ('notification_browser_notifications_disabled', 'settings.html', 'Browser notifications disabled', 'notifications', 'بیرهاتنێن گەڕۆکی هاتنە نەچالاککرن', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 4: PAGE TITLES
-- ============================================================================
-- HTML <title> tags for all pages

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('title_home', 'index.html', 'Main page title', 'page_titles', 'تەفسیر کورد - شرۆڤەکرنا قورئانێ ب زمانێ کوردی', true),
  ('title_login', 'login.html', 'Login page', 'page_titles', 'چوونە ژوورڤە - تەفسیر کورد', true),
  ('title_settings', 'settings.html', 'Settings page', 'page_titles', 'رێکخستن - تەفسیر کورد', true),
  ('title_profile', 'profile.html', 'Profile page', 'page_titles', 'پرۆفایل - تەفسیر کورد', true),
  ('title_goals', 'goals.html', 'Goals page', 'page_titles', 'ئارمانج - تەفسیر کورد', true),
  ('title_reading_goal', 'reading-goal.html', 'Reading goals', 'page_titles', 'ئارمانجا خواندنێ - تەفسیر کورد', true),
  ('title_bookmarks', 'bookmarks.html', 'Bookmarks page', 'page_titles', 'نیشانەکری - تەفسیر کورد', true),
  ('title_onboarding', 'onboarding.html', 'Onboarding', 'page_titles', 'ب خێر بێی - تەفسیر کورد', true),
  ('title_complete_signup', 'complete-signup.html', 'Complete signup', 'page_titles', 'تەمامکرنا تۆمارکرنێ - تەفسیر کورد', true),
  ('title_privacy_policy', 'privacy-policy.html', 'Privacy policy', 'page_titles', 'پاراستنا تایبەتمەندیێ - تەفسیر کورد', true),
  ('title_terms_conditions', 'terms-and-conditions.html', 'Terms & conditions', 'page_titles', 'مەرج و رێسا - تەفسیر کورد', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 5: META DESCRIPTIONS
-- ============================================================================
-- SEO meta descriptions for pages

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('meta_home_description', 'index.html', 'Main meta description', 'meta_descriptions', 'تەفسیرا کوردی - بەردەستکرنا شرۆڤەکا ڕوون و ڕەسەن یا قورئانێ ب زمانێ کوردی ب ڕێکا وانێن کورت و هویربینیێن تەفسیرێ.', true),
  ('meta_login_description', 'login.html', 'Login page description', 'meta_descriptions', 'چوونە ژوورڤە بۆ تەفسیر کورد', true),
  ('meta_onboarding_description', 'onboarding.html', 'Onboarding description', 'meta_descriptions', 'ب خێر بێی بۆ تەفسیر کورد', true),
  ('meta_complete_signup_description', 'complete-signup.html', 'Signup completion', 'meta_descriptions', 'تەمامکرنا تۆمارکرنێ - تەفسیر کورد', true),
  ('meta_privacy_policy_description', 'privacy-policy.html', 'Privacy policy description', 'meta_descriptions', 'پاراستنا تایبەتمەندیێ - تەفسیر کورد', true),
  ('meta_terms_conditions_description', 'terms-and-conditions.html', 'Terms description', 'meta_descriptions', 'مەرج و رێسا - تەفسیر کورد', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 6: NAVIGATION & HEADER TEXT
-- ============================================================================
-- Site navigation, headers, and branding

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('brand_name', 'index.html', 'Site branding', 'navigation', 'تەفسیر کورد', true),
  ('nav_home', 'index.html', 'Home page link', 'navigation', 'لاپەڕا سەرەکی', true),
  ('nav_features', 'index.html', 'Features', 'navigation', 'تایبەتمەندی', true),
  ('nav_stats', 'index.html', 'Stats', 'navigation', 'ئامار', true),
  ('nav_schedule', 'index.html', 'Schedule', 'navigation', 'خشتە', true),
  ('nav_plans', 'index.html', 'Plans', 'navigation', 'پلان', true),
  ('nav_about', 'index.html', 'About', 'navigation', 'دەربارە', true),
  ('nav_contact', 'index.html', 'Contact', 'navigation', 'پەیوەندی', true),
  ('nav_quran', 'index.html', 'Quran', 'navigation', 'قورئان', true),
  ('button_back', 'settings.html', 'Back button', 'buttons', 'گەڕیان ڤە', true),
  ('header_settings', 'settings.html', 'Settings header', 'headers', 'رێکخستن', true),
  ('header_profile', 'profile.html', 'Profile header', 'headers', 'پرۆفایل', true),
  ('header_goals', 'goals.html', 'Goals header', 'headers', 'ئارمانج', true),
  ('header_bookmarks', 'bookmarks.html', 'Bookmarks header', 'headers', 'نیشانەکری', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 7: HERO SECTION TEXT (index.html)
-- ============================================================================
-- Main hero section content and tabs

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('hero_subtitle', 'index.html', 'Hero subtitle', 'hero_section', 'بەردەستکرنا شرۆڤەکرنەکا ڕوون و ڕەسەن یا قورئانا پیرۆز ب زمانێ کوردی. ب شێوەیەکێ ڕوون و ب دلسۆزی و ڕێزگرتن، ئەم وانەیان ب شێوازێ ڤیدیویێن کورت و ئاسۆیی و هەروەسا تەفسیرا تەمام دروست دکەین دا کو پەیاما قورئانێ بگەهیتە هەمی ماڵان.', true),
  ('hero_tab_mission', 'index.html', 'Our mission tab', 'hero_section', 'ئەرکێن مە ببینە', true),
  ('hero_tab_content', 'index.html', 'Content tab', 'hero_section', 'ناڤەرۆک', true),
  ('hero_tab_reading', 'index.html', 'Quran reading tab', 'hero_section', 'خواندنا قورئانێ', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 8: FEATURES SECTION (index.html)
-- ============================================================================
-- Platform features and descriptions

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('features_heading', 'index.html', 'Features heading', 'features', 'ئەم چ پێشکێشدکەین', true),
  ('feature_short_lessons_title', 'index.html', 'Short lessons', 'features', 'وانێن کورت', true),
  ('feature_short_lessons_desc', 'index.html', 'Short lessons description', 'features', 'ڤیدیویێن تەفسیری یێن بلەز و بسەناهی بۆ تێگەهشتنێ، دهێنە دروستکرن بۆ تۆڕێن جڤاکی، حیکمەتا قورئانێ ب شێوەیەکێ ڕاستەوخو بۆ لاپەڕەیا تە یا سەرەکی ڤەدگوهێزن، کو ڕێکەکا بێ وێنەیە بۆ زانینا ئیسلامی یا ڕۆژانە.', true),
  ('feature_complete_tafsir_title', 'index.html', 'Complete Quran tafsir', 'features', 'تەفسیرا قورئانێ ب تەمامی', true),
  ('feature_complete_tafsir_desc', 'index.html', 'Complete tafsir description', 'features', 'شرۆڤەکرنەکا هەمەلایەنی یا ئایەتێن قورئانێ، دگەل خواندنێن زانستی و بجهئینانا کرداری بۆ ژیانا مۆدرێن.', true),
  ('feature_kurdish_language_title', 'index.html', 'Kurdish language', 'features', 'زمانێ کوردی', true),
  ('feature_kurdish_language_desc', 'index.html', 'Kurdish language description', 'features', 'هەمی ناڤەڕۆک ب شێوازەکێ ڕوون و ڕەسەن ب زمانێ کوردی دهێنە ڤەگوهاستن، ئەڤە وەدکەت پەیاما قورئانێ بگەهیتە خەلکێ کورد ل سەرانسەری جیهانێ. گوتنێن خودای یێن ئەبەدی، ب زمانێ تە یێ دایک.', true),
  ('feature_authenticity_title', 'index.html', 'Authenticity & respect', 'features', 'ڕەسەنایەتی و ڕێزگرتن', true),
  ('feature_authenticity_desc', 'index.html', 'Authenticity description', 'features', 'ناڤەرۆکەک کو لسەر بنەمایێ ژێدەرێن مێژوویی یێن باوەرپێکری، ب دلسۆزی و ڕێزگرتن ل دەقێ پیرۆز دهێتە پێشکێشکرن. لدیف ڕێکا زانایێن چاک و ڕاستگۆ.', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 9: STATS SECTION (index.html)
-- ============================================================================
-- Platform statistics and reach metrics

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('stats_heading', 'index.html', 'Reach section title', 'stats', 'دەستگەهشتن', true),
  ('stat_instagram_followers', 'index.html', 'Instagram followers', 'stats', 'فۆڵۆوەرێن ئینستاگرامى', true),
  ('stat_tiktok_followers', 'index.html', 'TikTok followers', 'stats', 'فۆڵۆوەرێن تیکتۆکى', true),
  ('stat_viewer_count', 'index.html', 'Number of viewers', 'stats', 'ژمارا بینەران', true),
  ('stat_videos_published', 'index.html', 'Published videos', 'stats', 'ڤیدیۆیێن بەلاڤکرین', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 10: SCHEDULE SECTION (index.html)
-- ============================================================================
-- Daily content schedule and posting times

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('schedule_heading', 'index.html', 'Daily schedule', 'schedule', 'خشتەیێ ڕۆژانە', true),
  ('schedule_daily', 'index.html', 'Daily', 'schedule', 'ڕۆژانە', true),
  ('schedule_time_evening', 'index.html', 'From 5 PM to 12 AM', 'schedule', 'ژ دەمژمێر ٥ ی ئێڤاری هەتا ١٢ ی شەڤ', true),
  ('schedule_topic_daily_content', 'index.html', 'Daily content distribution', 'schedule', 'پارڤەکرنا ناڤەڕۆکا ڕۆژانە', true),
  ('schedule_desc_daily_content', 'index.html', 'Daily content description', 'schedule', 'ڤیدیو و چیڕۆک و ناڤەڕۆکا ئیسلامی یێن نوی کو ڕۆژانە ل ئێڤارییان دهێنە بەڵاڤکرن. خوراکەکێ ڕۆحی یێ بەردەوام بۆ ڕۆحا تە.', true),
  ('schedule_morning', 'index.html', 'In the mornings', 'schedule', 'ل سپێدەهییان', true),
  ('schedule_time_morning', 'index.html', 'Morning', 'schedule', 'سپێدێ', true),
  ('schedule_topic_dhikr', 'index.html', 'Dhikr and stories', 'schedule', 'زکر و ستوری', true),
  ('schedule_desc_dhikr', 'index.html', 'Morning content description', 'schedule', 'ڕۆژانە ناڤەڕۆکا زکر و ستورییێن ئیسلامیێن سپێدەهییان ل ستوری و کەناڵێ پەخشی یێ ئنستاگرامی دهێنە بەڵاڤکرن. ڕۆژا خۆ ب زکرێ خودێ دەستپێبکە.', true),
  ('schedule_thursday_special', 'index.html', 'Special on Thursday', 'schedule', 'تایبەت ل ڕۆژا پێنجشەمبێ', true),
  ('schedule_time_thursday', 'index.html', 'Thursday', 'schedule', 'پێنجشەمب', true),
  ('schedule_topic_salawat', 'index.html', 'Salawat and Surah Al-Kahf', 'schedule', 'سەلەوات و سورەتا (الکهف)', true),
  ('schedule_desc_salawat', 'index.html', 'Thursday content description', 'schedule', 'ناڤەڕۆکەکا تایبەت یا سەلەواتان، ڕیلزێن سورەتا الکهف، کو دبیتە بیرئینان بۆ خواندنا وێ - (سونەت) نەریتێن پیرۆز یێن پێنجشەمبێ.', true),
  ('schedule_regular_content', 'index.html', 'Regular content', 'schedule', 'ناڤەڕۆکا ئاسایی', true),
  ('schedule_time_continuous', 'index.html', 'Continuously', 'schedule', 'ب بەردەوامی', true),
  ('schedule_topic_instagram_stories', 'index.html', 'Instagram stories about hadiths & sunnah', 'schedule', 'ستۆریێن ئنستاگرامی دەربارەی فەرموودە و سوننەتان', true),
  ('schedule_desc_regular', 'index.html', 'Regular content description', 'schedule', 'ستوریێن پلاتفورما ئنستاگرامی و فێرکاریێن سوننەتان، قورئان خواندنا نوی دگەل تەفسیرا کوردی. نمونا ژیانا پێغەمبەرایەتی ل سەردەمێ مۆدرێن.', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 11: PLANS SECTION (index.html)
-- ============================================================================
-- Future plans and roadmap

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('plans_heading', 'index.html', 'Our plans for the future', 'plans', 'پلانێن مە بۆ پاشەڕۆژێ', true),
  ('plan_complete_tafsir_title', 'index.html', 'Complete Quran tafsir', 'plans', 'تەفسیرا قورئانێ ب تەمامی', true),
  ('plan_complete_tafsir_desc', 'index.html', 'Complete tafsir description', 'plans', 'ئێک ژ مەبەستێن پڕۆژێ مە بەردەستکرنا تەفسیرا هەمی قورئانێیە ب زمانێ کوردی د پلاتفورما یوتیوبی دا. گەشتەکا هەمەلایەنییە بۆ دوماهی وەحیا خودایی.', true),
  ('plan_feature_translation', 'index.html', 'Complete Quran translation to Kurdish', 'plans', 'وەرگێڕانا قورئانێ ب تەمامی بۆ زمانێ کوردی', true),
  ('plan_feature_recitation', 'index.html', 'Quran recitation by Yasser Al-Dosari', 'plans', 'دەنگێ قورئان خوین یاسر الدوسری', true),
  ('plan_feature_deep_commentary', 'index.html', 'Deep commentary for all verses', 'plans', 'شروڤەکرنەکا کویر بۆ هەمی ئایەتان', true),
  ('plan_feature_classical_sources', 'index.html', 'Classical reading sources', 'plans', 'ژێدەرێن خواندنێ یێن کلاسیک', true),
  ('plan_feature_video_production', 'index.html', 'High quality video production', 'plans', 'دروستکرنا ڤیدیویێن کواڵتی بلند', true),
  ('plan_feature_youtube_availability', 'index.html', 'Available on YouTube, coming soon', 'plans', 'بەردەستبوون ل یوتیوبی، ل نێزیک', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 12: QURAN SECTION (index.html)
-- ============================================================================
-- Quran reading call-to-action

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('quran_section_title', 'index.html', 'Read the Holy Quran', 'quran_section', 'قورئانا پیرۆز بخوینە', true),
  ('quran_section_heading', 'index.html', 'View Quran with Kurdish tafsir', 'quran_section', 'قورئانێ ب تەفسیرا کوردی ببینە', true),
  ('quran_section_desc', 'index.html', 'Access verse-by-verse tafsir', 'quran_section', 'دەستگەهشتن ب تەفسیرا ئایەت ب ئایەت یا قورئانا پیرۆز. پەیاما خودایێ مەزن ب زمانێ دایک بخوینە و فێرببە و تێبگەهە.', true),
  ('button_start_reading', 'index.html', 'Start reading', 'buttons', 'دەست ب خواندنێ بکە', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 13: ABOUT SECTION (index.html)
-- ============================================================================
-- About Tafsir Kurd and mission

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('about_section_title', 'index.html', 'About Tafsir Kurd', 'about', 'دەربارەی  تەفسیر کورد', true),
  ('about_mission_heading', 'index.html', 'Our sacred mission', 'about', 'ئەرکێ مە یێ پیرۆز', true),
  ('about_mission_text', 'index.html', 'Following truthful scholars', 'about', 'ئەم لدیف شوینپێیێن ئەوان زانایێن ڕاستگۆ دچین یێن ژیانا خۆ تەرخانکری بۆ شروڤەکرنا پەرتوکا خودێ، ئەوێن بتنێ ل ڕازیبوونا خودێ و هیدایەتا بەندەیێن وی دگەڕن.', true),
  ('about_principles_heading', 'index.html', 'The principles that guide us', 'about', 'ئەو بنەمایێن ڕێنماییا مە دکەن', true),
  ('principle_authenticity_label', 'index.html', 'Authenticity', 'about', 'ڕەسەنایەتی:', true),
  ('principle_authenticity_desc', 'index.html', 'Authenticity description', 'about', 'هەر تەفسیرەکا ئەم پێشکێش دکەین بنیاتێ وێ ژ فێرکاریێن ڕەسەن یێن پێغەمبەرێ خودێ محمد (سلاڤ لێبن) و لێکدانەڤەیێن زانایێن ڕاستەڕێ (السلف الصالح) هاتییە...', true),
  ('principle_clarity_label', 'index.html', 'Clarity', 'about', 'ڕوونی:', true),
  ('principle_clarity_desc', 'index.html', 'Clarity description', 'about', 'ئەم د وێ باوەریێ داینە کو پێدڤییە پەیاما خودای وەک ئاڤێ یا ڕوون بیت...', true),
  ('principle_accessibility_label', 'index.html', 'Accessibility', 'about', 'دەستگەهشتن:', true),
  ('principle_accessibility_desc', 'index.html', 'Accessibility description', 'about', 'د ئەڤی سەردەمێ دیجیتاڵ دا، ئەم مفای ژ پلاتفورمێن مۆدرێن وەردگرین...', true),
  ('principle_sincerity_label', 'index.html', 'Sincerity', 'about', 'دلسۆزی:', true),
  ('principle_sincerity_desc', 'index.html', 'Sincerity description', 'about', 'ئەڤ کارە بتنێ بۆ ڕازەمەندییا خودێ (لوجە الله الكريم) دهێتە ئەنجامدان...', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 14: FOUNDER SECTION (index.html)
-- ============================================================================
-- Founder information and commitment

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('founder_name', 'index.html', 'Saman Abdulrahman', 'founder', 'سامان عبدالرحمن', true),
  ('founder_title', 'index.html', 'Founder & Islamic content creator', 'founder', 'دامەزرێنەر و دروستکەرێ ناڤەڕۆکێن ئیسلامی', true),
  ('founder_bio', 'index.html', 'Founder bio', 'founder', 'بەندەیەکێ خودایێ مەزن، کارێ من تایبەتە ب پارڤەکرنا فێرکاریێن جوان یێن ئیسلامێ ب ڕێکا زمانێ کوردی...', true),
  ('founder_commitment_label', 'index.html', 'Special commitment', 'founder', 'پابەندبوونا تایبەت:', true),
  ('founder_commitment_desc', 'index.html', 'Commitment description', 'founder', 'هەر پەیڤەکا بهێتە گوتن، هەر ڤیدیویەکا بهێتە دروستکرن و هەر دەمەکێ بهێتە تەرخانکرن بۆ ئەڤی کاری کردارەکا پەرستنێیە بۆ خودایێ مەزن...', true),
  ('founder_prayer_label', 'index.html', 'Prayer for our viewers', 'founder', 'دوعا بۆ بینەرێن مە:', true),
  ('founder_prayer_text', 'index.html', 'Prayer text', 'founder', 'خودایێ مەزن هەمی وان کەسان بپارێزیت یێن ب ڕێکا پەرتوکا وی لدیف هیدایەتێ دچن...', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 15: CONTACT SECTION (index.html)
-- ============================================================================
-- Contact form and messages

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('contact_section_title', 'index.html', 'Contact', 'contact', 'پەیوەندی', true),
  ('contact_heading', 'index.html', 'Get in touch', 'contact', 'پەیوەندیێ بکە', true),
  ('contact_description', 'index.html', 'Contact description', 'contact', 'ئەگەر تە پسیارەک یان پێشنیارەک هەیە، پەیوەندیێ ب مە بکە و ب زویترین دەم دێ بەرسڤا تە هێتە دان!', true),
  ('contact_label_name', 'index.html', 'Name', 'form_labels', 'ناڤ', true),
  ('contact_label_email', 'index.html', 'Email', 'form_labels', 'ئیمەیل', true),
  ('contact_label_subject', 'index.html', 'Subject', 'form_labels', 'بابەت', true),
  ('contact_label_message', 'index.html', 'Your message', 'form_labels', 'ناما تە', true),
  ('button_send_message', 'index.html', 'Send message', 'buttons', 'هنارتنا نامەیێ', true),
  ('contact_success_message', 'index.html', 'Message delivered, response coming soon', 'notifications', 'نامە گەهشت، ل نێزیک دێ بەرسڤا تە هێتە دان.', true),
  ('contact_error_message', 'index.html', 'An error occurred. Try again.', 'notifications', 'ئاریشەک چێبوو. دووبارە هەول بدە.', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 16: FOOTER SECTION (ALL PAGES)
-- ============================================================================
-- Footer links, copyright, and descriptions

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('footer_brand_name', 'index.html', 'Footer branding', 'footer', 'تەفسیر کورد', true),
  ('footer_tagline', 'index.html', 'Platform tagline', 'footer', 'پلاتفۆرمەکا ئارام بۆ خواندنێ، گەڕیان و رامان ل سەر قورئانا پیرۆز ب زمانێ کوردی (بادینی). قورئان بگەهیتە دەستێ هەر کەسەکی، هەر جهەکی و هەر دەمەکی.', true),
  ('footer_section_navigate', 'settings.html', 'Navigate section title', 'footer', 'گەڕان', true),
  ('footer_link_profile', 'settings.html', 'Profile', 'footer', 'پرۆفایل', true),
  ('footer_link_goals', 'index.html', 'Goals', 'footer', 'ئامانجەکان', true),
  ('footer_link_goals_alt', 'settings.html', 'Goals alternative', 'footer', 'ئارمانج', true),
  ('footer_link_bookmarks', 'index.html', 'Bookmarks', 'footer', 'نیشانەکراوەکان', true),
  ('footer_link_bookmarks_alt', 'settings.html', 'Bookmarks alternative', 'footer', 'نیشانەکری', true),
  ('footer_link_settings_plural', 'index.html', 'Settings plural', 'footer', 'ڕێکخستنەکان', true),
  ('footer_link_settings', 'settings.html', 'Settings', 'footer', 'رێکخستن', true),
  ('footer_section_other_pages', 'index.html', 'Other pages section', 'footer', 'رۆژپەڕا دیکە', true),
  ('footer_section_other_pages_alt', 'settings.html', 'Other pages alternative', 'footer', 'رۆژپەڕێن دی', true),
  ('footer_link_holy_quran', 'index.html', 'Holy Quran', 'footer', 'قورئانا پیرۆز', true),
  ('footer_link_main_site', 'settings.html', 'Main site', 'footer', 'مالپەڕێ سەرەکی', true),
  ('footer_link_features', 'index.html', 'Features', 'footer', 'تایبەتمەندی', true),
  ('footer_link_about_us', 'index.html', 'About us', 'footer', 'دەربارەی ئێمە', true),
  ('footer_link_about_us_alt', 'settings.html', 'About us alternative', 'footer', 'دەربارەی مە', true),
  ('footer_link_contact', 'index.html', 'Contact', 'footer', 'پەیوەندی', true),
  ('footer_contact_description', 'index.html', 'Contact footer description', 'footer', 'ئەگەر تە پسیارەک یان پێشنیارەک هەیە، پەیوەندیێ ب مە بکە و ب زویترین دەم دێ بەرسڤا تە هێتە دان!', true),
  ('footer_contact_description_alt', 'settings.html', 'Contact footer description alternative', 'footer', 'ئەگەر تە پرسیارەک یان پێشنیارەک هەبیت، پەیوەندییێ ب مە بکە و ب زووترین دەم دێ بەرسڤا تە هێتە دان!', true),
  ('footer_link_fill_form', 'index.html', 'Fill out form', 'footer', 'فۆرما پڕبکە', true),
  ('footer_link_fill_form_alt', 'settings.html', 'Fill out form alternative', 'footer', 'فۆرمێ پڕ بکە', true),
  ('footer_copyright', 'index.html', 'Copyright notice', 'footer', 'هەمی ماف د پاراستینە. خودایێ مەزن بەرەکەتێ بێخیتە هەوڵ و ماندیبوونا مە.', true),
  ('footer_copyright_alt', 'settings.html', 'Copyright notice alternative', 'footer', 'هەمی ماف پاراستی نە. خودایێ مەزن بەرەکەتێ بێخیتە هەول و ماندبوونا مە.', true),
  ('footer_link_privacy_policy', 'index.html', 'Privacy policy', 'footer', 'پارێزراوی تایبەتمەندی', true),
  ('footer_link_privacy_policy_alt', 'settings.html', 'Privacy policy alternative', 'footer', 'پاراستنا تایبەتمەندیێ', true),
  ('footer_link_terms', 'index.html', 'Terms & conditions', 'footer', 'مەرج و ڕێسا', true),
  ('footer_link_terms_alt', 'settings.html', 'Terms & conditions alternative', 'footer', 'مەرج و رێسایان', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 17: LOGIN PAGE (login.html)
-- ============================================================================
-- Login page content and features

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('login_welcome', 'login.html', 'Welcome to Tafsir Kurd', 'login', 'ب خێر بێی بۆ تەفسیر کورد', true),
  ('login_subtitle', 'login.html', 'Log in to access special features', 'login', 'چوونە ژوورڤە بکە بۆ دەستگەهشتن ب تایبەتمەندییێن تایبەت', true),
  ('login_benefits_heading', 'login.html', 'What you''ll get after logging in', 'login', 'چ دێ ب دەستڤە ئینی پشتی چوونە ژوورڤە:', true),
  ('login_badge_new', 'login.html', 'New badge', 'login', 'نوی!', true),
  ('login_feature_personal_notes', 'login.html', 'Personal notes & bookmarks', 'login', 'تێبینیێن تایبەت و نیشانەکرن', true),
  ('login_feature_track_goals', 'login.html', 'Track your goals & progress', 'login', 'شوێنکەفتنا ئارمانج و پێشکەفتنا تە', true),
  ('login_feature_continuous_reading', 'login.html', 'Maintain continuous reading', 'login', 'هەلگرتنا خواندنەکا بەردەوام', true),
  ('login_feature_sync_devices', 'login.html', 'Sync across all your devices', 'login', 'هەڤدەمکرن د ناڤبەرا هەمی ئامیرێن تە دا', true),
  ('login_feature_advanced_features', 'login.html', 'Access advanced features', 'login', 'دەستگەهشتن ب تایبەتمەندیێن پێشکەفتی', true),
  ('login_feature_daily_reminders', 'login.html', 'Daily reading reminders', 'login', 'ئاگەهدارکرنا رۆژانە بۆ خواندنێ', true),
  ('button_signin_google', 'login.html', 'Sign in with Google', 'buttons', 'چوونە ژوورڤە ب Google', true),
  ('login_divider_or', 'login.html', 'Or divider', 'login', 'یان', true),
  ('button_return_home', 'login.html', 'Return to home', 'buttons', 'گەڕیان ڤە بۆ سەرەتا', true),
  ('login_privacy_text', 'login.html', 'Privacy notice before links', 'login', 'پاراستنا تایبەتمەندیا تە د پێشییێ دایە – ب چوونە ژوورڤە، رازی ی ب', true),
  ('login_privacy_policy_link', 'login.html', 'Privacy policy link', 'login', 'سیاسەتا تایبەتمەندیێ', true),
  ('login_terms_link', 'login.html', 'Terms & conditions link', 'login', 'مەرج و بەند', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 18: SETTINGS PAGE (settings.html)
-- ============================================================================
-- Settings page labels and descriptions

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('settings_section_theme', 'settings.html', 'Theme section', 'settings', 'رۆکار', true),
  ('settings_dark_mode', 'settings.html', 'Dark mode toggle', 'settings', 'رەوشا تاریک', true),
  ('settings_dark_mode_desc', 'settings.html', 'Dark mode description', 'settings', 'گوهۆڕین بۆ رەوشا تاریک بۆ خواندنا ئاسانتر', true),
  ('settings_section_arabic_font', 'settings.html', 'Arabic font section', 'settings', 'فۆنتا عەرەبی', true),
  ('settings_font_type', 'settings.html', 'Font type label', 'settings', 'جۆرێ فۆنتێ', true),
  ('settings_arabic_font_desc', 'settings.html', 'Arabic font description', 'settings', 'دەستکاریکرنا فۆنتا تێکستێ عەرەبی', true),
  ('settings_font_size', 'settings.html', 'Font size label', 'settings', 'قەبارەیا فۆنتێ', true),
  ('settings_arabic_size_desc', 'settings.html', 'Arabic font size description', 'settings', 'مەزن یان بچووککرنا تێکستێ عەرەبی', true),
  ('settings_font_preview', 'settings.html', 'Font preview label', 'settings', 'پێشبینیا فۆنتێ', true),
  ('settings_section_tafsir_font', 'settings.html', 'Tafsir font section', 'settings', 'فۆنتا تەفسیرێ', true),
  ('settings_tafsir_font_desc', 'settings.html', 'Tafsir font description', 'settings', 'دەستکاریکرنا فۆنتا تەفسیرێیا کوردی', true),
  ('settings_tafsir_size_desc', 'settings.html', 'Tafsir font size description', 'settings', 'مەزن یان بچووککرنا تێکستێ تەفسیرێ', true),
  ('settings_preview_text', 'settings.html', 'Preview text - Bismillah', 'settings', 'ب ناڤێ خودایێ دلۆڤان و دلوڤین. سوپاس بۆ خودێ، خودانێ جیهانان.', true),
  ('settings_section_reading', 'settings.html', 'Reading section', 'settings', 'خواندن', true),
  ('settings_show_hide_tafsir', 'settings.html', 'Show/hide tafsir toggle', 'settings', 'نیشاندان و ڤەدیتنا تەفسیرێ', true),
  ('settings_show_hide_tafsir_desc', 'settings.html', 'Show/hide tafsir description', 'settings', 'نیشاندان یان ڤەشارتنا تەفسیرێ کوردی', true),
  ('settings_autoscroll', 'settings.html', 'Auto-scroll toggle', 'settings', 'زڤراندنا خۆکار', true),
  ('settings_autoscroll_desc', 'settings.html', 'Auto-scroll description', 'settings', 'زڤراندنا خۆکارا پەڕەیێ د دەما خواندنێدا', true),
  ('settings_scroll_speed', 'settings.html', 'Scroll speed label', 'settings', 'خێرایا زڤراندنێ', true),
  ('settings_scroll_speed_desc', 'settings.html', 'Scroll speed description', 'settings', 'دیارکرنا خێرایا زڤراندنا خۆکار', true),
  ('settings_speed_very_slow', 'settings.html', 'Very slow speed', 'settings', 'زۆر هێواش', true),
  ('settings_speed_slow', 'settings.html', 'Slow speed', 'settings', 'هێواش', true),
  ('settings_speed_medium', 'settings.html', 'Medium speed', 'settings', 'ناڤەند', true),
  ('settings_speed_fast', 'settings.html', 'Fast speed', 'settings', 'خێرا', true),
  ('settings_speed_very_fast', 'settings.html', 'Very fast speed', 'settings', 'زۆر خێرا', true),
  ('settings_section_notifications', 'settings.html', 'Notifications section', 'settings', 'بیرهاتن', true),
  ('settings_email_reminders', 'settings.html', 'Email reminders toggle', 'settings', 'بیرهاتنێن ئیمەیلێ', true),
  ('settings_email_reminders_desc', 'settings.html', 'Email reminders description', 'settings', 'وەرگرتنا بیرهاتنێن رۆژانە ب رێیا ئیمەیلێ', true),
  ('settings_browser_notifications', 'settings.html', 'Browser notifications toggle', 'settings', 'بیرهاتنێن گەڕۆکێ', true),
  ('settings_browser_notifications_desc', 'settings.html', 'Browser notifications description', 'settings', 'وەرگرتنا بیرهاتنێن گەڕۆکێ', true),
  ('settings_section_reset', 'settings.html', 'Reset section', 'settings', 'گەڕیاندنڤە بۆ بنەڕەت', true),
  ('settings_reset_warning', 'settings.html', 'Reset warning text', 'settings', 'ئەڤ کارە هەموو رێکخستنان دگەڕینیتەڤە بۆ بنەڕەتێن وان. ئەڤ کردارە ناگەڕیێتەڤە.', true),
  ('button_reset_all_settings', 'settings.html', 'Reset all settings button', 'buttons', 'گەڕیاندنەڤەیا هەموو رێکخستنان', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 19: ONBOARDING PAGE (onboarding.html)
-- ============================================================================
-- Onboarding slides and welcome content

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('onboarding_slide1_title', 'onboarding.html', 'Thank you for trusting us', 'onboarding', 'سوپاس بۆ باوەرکرنا تە ب مە!', true),
  ('onboarding_slide1_subtitle', 'onboarding.html', 'You''re now part of a special community', 'onboarding', 'تو نها بەشەکی ی ژ کومەلگەهەکا تایبەت', true),
  ('onboarding_slide1_desc', 'onboarding.html', 'We''re very happy you decided to participate', 'onboarding', 'ئەم گەلەک دلخوشین کو تە بریار دا بەشدار بی د گەشەکرنا ئێکەم پلاتفۆرمێ کوردی بۆ خواندن و تێگەهشتنا قورئانا پیرۆز...', true),
  ('onboarding_slide2_title', 'onboarding.html', 'Our goal', 'onboarding', 'ئارمانجا مە', true),
  ('onboarding_slide2_subtitle', 'onboarding.html', 'Creating a bridge between Kurdish people and the Holy Quran', 'onboarding', 'دروستکرنا پرەکێ د ناڤبەرا خەلکێ کورد و قورئانا پیرۆز دا', true),
  ('onboarding_slide2_desc', 'onboarding.html', 'Our goal is to bring Quranic knowledge in Kurdish to everyone', 'onboarding', 'ئەم ئارمانجا مە ئەوەیە کو زانست و تێگەهشتنا قورئانێ ب زمانێ کوردی بگەهینینە دەستێ هەر کەسەکی...', true),
  ('onboarding_slide3_title', 'onboarding.html', 'What are you waiting for?', 'onboarding', 'چاڤەرێ چ دکەی؟', true),
  ('onboarding_slide3_subtitle', 'onboarding.html', 'Features that will transform your spiritual life', 'onboarding', 'تایبەتمەندییەک کو ژیانا تە یا رۆحی دگوهۆڕیت', true),
  ('onboarding_feature_complete_tafsir', 'onboarding.html', 'Complete tafsir in Kurdish', 'onboarding', 'تەفسیرەکا تەمام ب زمانێ کوردی', true),
  ('onboarding_feature_personal_notes', 'onboarding.html', 'Personal notes & bookmarks', 'onboarding', 'تێبینیێن تایبەت و نیشانەکرن', true),
  ('onboarding_feature_audio_playback', 'onboarding.html', 'Audio playback with beautiful voice', 'onboarding', 'گوهداریکرن ب دەنگەکێ جوان', true),
  ('onboarding_feature_sync_devices', 'onboarding.html', 'Sync across all your devices', 'onboarding', 'هەڤدەمکرن د هەمی ئامیرێن تە دا', true),
  ('onboarding_feature_offline_reading', 'onboarding.html', 'Offline reading', 'onboarding', 'خواندن بێ ئینتەرنێت', true),
  ('onboarding_slide4_title', 'onboarding.html', 'A great community', 'onboarding', 'کومەلگەهەکا مەزن', true),
  ('onboarding_slide4_subtitle', 'onboarding.html', 'Share knowledge and experience with your brothers', 'onboarding', 'هەڤبەشکرنا زانیاری و ئەزموونێ دگەل برایێن تە', true),
  ('onboarding_slide4_desc', 'onboarding.html', 'Be part of an active and strong community', 'onboarding', 'بەشەک بە ژ کومەلگەهەکا چالاک و بهێز کو هەر رۆژەکێ گەشە دکەت...', true),
  ('onboarding_slide5_title', 'onboarding.html', 'Ready to start?', 'onboarding', 'ئامادەی بۆ دەستپێکرنێ؟', true),
  ('onboarding_slide5_subtitle', 'onboarding.html', 'Your spiritual journey starts here', 'onboarding', 'گەشتەکا تە یا رۆحی ژ ڤێرێ دەستپێدکەت', true),
  ('onboarding_slide5_desc', 'onboarding.html', 'Now is the time and opportunity to start', 'onboarding', 'نها دەم و دەرفەتێ ئەوە کو دەست ب خواندن و فێربوونێ بکەی...', true),
  ('button_onboarding_previous', 'onboarding.html', 'Previous button', 'buttons', 'پێشین', true),
  ('button_onboarding_next', 'onboarding.html', 'Next button', 'buttons', 'پاشین', true),
  ('link_skip_and_start', 'onboarding.html', 'Skip and start link', 'onboarding', 'راکێشان و دەستپێکرن', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 20: COMPLETE SIGNUP PAGE (complete-signup.html)
-- ============================================================================
-- Signup completion page

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('complete_signup_success_title', 'complete-signup.html', 'Success title', 'complete_signup', 'سەرکەفتی بوو!', true),
  ('complete_signup_success_subtitle', 'complete-signup.html', 'Successfully logged in, let''s set up your experience', 'complete_signup', 'ب سەرکەفتی چویە ژوورڤە. بلا ئەزموونا تە رێکێخین', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 21: PRIVACY POLICY PAGE (privacy-policy.html)
-- ============================================================================
-- Privacy policy content

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('privacy_page_title', 'privacy-policy.html', 'Privacy policy page title', 'privacy_policy', 'پاراستنا تایبەتمەندیێ', true),
  ('privacy_button_back', 'privacy-policy.html', 'Go back button', 'buttons', 'گەڕیان ڤە', true),
  ('privacy_latest_update', 'privacy-policy.html', 'Latest update label', 'privacy_policy', 'نووترین نووکرن:', true),
  ('privacy_intro_text', 'privacy-policy.html', 'At Tafsir Kurd, with Islamic trust and commitment', 'privacy_policy', 'ئەم ل تەفسیر کورد، ب ئەمانەت و پابەندبوونا ئیسلامی، کار دکەین بۆ پاراستنا تایبەتمەندی و ئاسایشا هەمی بکارئینەرێن مە...', true),
  ('privacy_commitment_title', 'privacy-policy.html', 'Our commitment to protecting your privacy', 'privacy_policy', 'پابەندبوونا مە بۆ پاراستنا تایبەتمەندیا تە', true),
  ('privacy_commitment_desc', 'privacy-policy.html', 'At Tafsir Kurd, protecting privacy and security is our top priority', 'privacy_policy', 'ل تەفسیر کورد، پاراستنا تایبەتمەندی و ئاسایشا زانیاریێن بکارئینەرێن مە گرنگترین ئەولەویا مە یە...', true),
  ('privacy_info_collected_title', 'privacy-policy.html', 'Information collected', 'privacy_policy', 'زانیاریێن کومکری', true),
  ('privacy_info_collected_desc', 'privacy-policy.html', 'We collect the following types of information', 'privacy_policy', 'ئەم جۆرێن خوارێ ژ زانیاریان کوم دکەین:', true),
  ('privacy_personal_info', 'privacy-policy.html', 'Personal information subsection', 'privacy_policy', 'زانیاریێن تایبەت:', true),
  ('privacy_usage_info', 'privacy-policy.html', 'Usage information subsection', 'privacy_policy', 'زانیاریێن بکارئینانێ:', true),
  ('privacy_technical_info', 'privacy-policy.html', 'Technical information subsection', 'privacy_policy', 'زانیاریێن تەکنیکی:', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- SECTION 22: TERMS & CONDITIONS PAGE (terms-and-conditions.html)
-- ============================================================================
-- Terms and conditions content

INSERT INTO kurdish_translations (key_id, page, context, category, kurdish_text, is_active)
VALUES
  ('terms_page_title', 'terms-and-conditions.html', 'Terms & conditions page title', 'terms_conditions', 'مەرج و رێسا', true),
  ('terms_button_back', 'terms-and-conditions.html', 'Go back button', 'buttons', 'گەڕیان ڤە', true),
  ('terms_latest_update', 'terms-and-conditions.html', 'Latest update label', 'terms_conditions', 'نووترین نووکرن:', true),
  ('terms_welcome_text', 'terms-and-conditions.html', 'Welcome to Tafsir Kurd - platform created to serve the Holy Quran', 'terms_conditions', 'ب خێر هاتن بۆ تەفسیر کورد. ئەڤ پلاتفۆرمە هاتیە دروستکرن بۆ خزمەتکرنا قورئانا پیرۆز و بەلاڤکرنا زانیاریێن ئیسلامی ب گۆرەی بنەمایێ ئەخلاق و راستگۆییێ د ئیسلامێدا.', true),
  ('terms_section_title', 'terms-and-conditions.html', 'Terms & conditions section title', 'terms_conditions', 'مەرج و رێسا', true),
  ('terms_section_desc', 'terms-and-conditions.html', 'By using Tafsir Kurd, you agree to follow these terms', 'terms_conditions', 'ب بکارئینانا تەفسیر کورد، تو رازیبوونێ ددەی کو ب ڤان مەرج و رێسایێن ئیسلامی و یاسایانە پەیڕەو بکەی...', true),
  ('terms_acceptance_title', 'terms-and-conditions.html', 'Acceptance of terms', 'terms_conditions', 'قەبولکرنا مەرجان', true),
  ('terms_acceptance_desc', 'terms-and-conditions.html', 'By accessing, browsing, or using Tafsir Kurd', 'terms_conditions', 'ب دەستگەهشتن، گەڕیان، یان بکارئینانا تەفسیر کورد، تو دان ب وێ چەندێ ددانی کو:', true),
  ('terms_quranic_content_title', 'terms-and-conditions.html', 'Quranic content and tafsir', 'terms_conditions', 'ناڤەرۆکا قورئانی و تەفسیر', true),
  ('terms_quranic_content_desc', 'terms-and-conditions.html', 'All Quranic texts presented from reliable sources', 'terms_conditions', 'هەمی تێکستێن قورئانی و وەرگێڕان ژ ژێدەرێن باوەرپێکری پێشکێش د هێنە کرن...', true)
ON CONFLICT (key_id) DO UPDATE SET
  page = EXCLUDED.page,
  context = EXCLUDED.context,
  category = EXCLUDED.category,
  kurdish_text = EXCLUDED.kurdish_text,
  updated_at = NOW();

-- ============================================================================
-- END OF SQL SCRIPT
-- ============================================================================
-- Total INSERT statements: 250+
-- All entries include proper conflict handling (ON CONFLICT DO UPDATE)
-- Kurdish text has been properly escaped for SQL
-- Ready to execute in Supabase SQL Editor
-- ============================================================================
