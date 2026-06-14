/**
 * TafsirKurd Translations Seed Data
 * Run this in admin console to populate the kurdish_translations table
 *
 * Usage: Copy this array and use in admin panel or Supabase dashboard
 */

const TRANSLATIONS_SEED = [
    // ==========================================
    // BUTTONS & ACTIONS
    // ==========================================
    { key_id: 'btn.sign_in', kurdish_text: 'چوونە ژوورڤە', category: 'buttons', page: 'all', context: 'Sign in button' },
    { key_id: 'btn.sign_up', kurdish_text: 'حسابێ نوی', category: 'buttons', page: 'all', context: 'Sign up tab/button' },
    { key_id: 'btn.sign_out', kurdish_text: 'دەرچوون', category: 'buttons', page: 'all', context: 'Logout button' },
    { key_id: 'btn.save', kurdish_text: 'پارەبکە', category: 'buttons', page: 'all', context: 'Save button' },
    { key_id: 'btn.cancel', kurdish_text: 'پاشگەزبوونەکە', category: 'buttons', page: 'all', context: 'Cancel button' },
    { key_id: 'btn.close', kurdish_text: 'داخستن', category: 'buttons', page: 'all', context: 'Close button' },
    { key_id: 'btn.back', kurdish_text: 'گەڕیان ڤە', category: 'buttons', page: 'all', context: 'Go back button' },
    { key_id: 'btn.read', kurdish_text: 'بخوێنە', category: 'buttons', page: 'all', context: 'Read button' },
    { key_id: 'btn.read_more', kurdish_text: 'زێدەتر بخوێنە', category: 'buttons', page: 'all', context: 'Read more button' },
    { key_id: 'btn.edit', kurdish_text: 'دەستکاریکرن', category: 'buttons', page: 'all', context: 'Edit button' },
    { key_id: 'btn.delete', kurdish_text: 'سڕینەوە', category: 'buttons', page: 'all', context: 'Delete button' },
    { key_id: 'btn.search', kurdish_text: 'گەڕان', category: 'buttons', page: 'all', context: 'Search button' },
    { key_id: 'btn.verify', kurdish_text: 'پشتڕاستکردنەوە', category: 'buttons', page: 'login', context: 'Verify OTP button' },
    { key_id: 'btn.create_account', kurdish_text: 'دروستکرنا حساب', category: 'buttons', page: 'login', context: 'Create account button' },
    { key_id: 'btn.create_account_google', kurdish_text: 'دروستکرنا حساب ب Google', category: 'buttons', page: 'login', context: 'Google signup button' },
    { key_id: 'btn.sign_in_google', kurdish_text: 'چوونە ژوورڤە ب Google', category: 'buttons', page: 'login', context: 'Google signin button' },
    { key_id: 'btn.change_picture', kurdish_text: 'گۆڕینا وێنێ', category: 'buttons', page: 'profile', context: 'Change profile picture' },
    { key_id: 'btn.mark_all_read', kurdish_text: 'هەموو بخوێنەوە', category: 'buttons', page: 'all', context: 'Mark all notifications read' },
    { key_id: 'btn.view_all', kurdish_text: 'هەموو ببینە', category: 'buttons', page: 'all', context: 'View all button' },
    { key_id: 'btn.new_goal', kurdish_text: 'ئارمانجەکا نوی', category: 'buttons', page: 'goals', context: 'New goal button' },
    { key_id: 'btn.fill_form', kurdish_text: 'فۆرمێ پڕ بکە', category: 'buttons', page: 'all', context: 'Contact form button' },

    // ==========================================
    // LABELS & HEADINGS
    // ==========================================
    { key_id: 'label.email', kurdish_text: 'ئیمەیل', category: 'labels', page: 'all', context: 'Email label' },
    { key_id: 'label.password', kurdish_text: 'پاسوۆرد', category: 'labels', page: 'all', context: 'Password label' },
    { key_id: 'label.name', kurdish_text: 'ناڤ', category: 'labels', page: 'all', context: 'Name label' },
    { key_id: 'label.first_name', kurdish_text: 'ناڤێ یەکەم', category: 'labels', page: 'profile', context: 'First name label' },
    { key_id: 'label.last_name', kurdish_text: 'ناڤێ دووەم', category: 'labels', page: 'profile', context: 'Last name label' },
    { key_id: 'label.address', kurdish_text: 'ناڤنیشان', category: 'labels', page: 'profile', context: 'Address label' },
    { key_id: 'label.country', kurdish_text: 'وەلات', category: 'labels', page: 'profile', context: 'Country label' },
    { key_id: 'label.profile', kurdish_text: 'پرۆفایل', category: 'labels', page: 'all', context: 'Profile label' },
    { key_id: 'label.settings', kurdish_text: 'رێکخستن', category: 'labels', page: 'all', context: 'Settings label' },
    { key_id: 'label.goals', kurdish_text: 'ئارمانج', category: 'labels', page: 'all', context: 'Goals label' },
    { key_id: 'label.bookmarks', kurdish_text: 'نیشانەکری', category: 'labels', page: 'all', context: 'Bookmarks label' },
    { key_id: 'label.help', kurdish_text: 'یارمەتی', category: 'labels', page: 'all', context: 'Help label' },
    { key_id: 'label.notifications', kurdish_text: 'ئاگادارکرنەوە', category: 'labels', page: 'all', context: 'Notifications label' },
    { key_id: 'label.dark_mode', kurdish_text: 'رەوشا تاریک', category: 'labels', page: 'settings', context: 'Dark mode toggle' },
    { key_id: 'label.arabic_font', kurdish_text: 'فۆنتا عەرەبی', category: 'labels', page: 'settings', context: 'Arabic font setting' },
    { key_id: 'label.font_type', kurdish_text: 'جۆرێ فۆنتێ', category: 'labels', page: 'settings', context: 'Font type label' },
    { key_id: 'label.font_size', kurdish_text: 'قەبارەیا فۆنتێ', category: 'labels', page: 'settings', context: 'Font size label' },
    { key_id: 'label.font_preview', kurdish_text: 'پێشبینیا فۆنتێ', category: 'labels', page: 'settings', context: 'Font preview' },
    { key_id: 'label.tafsir_font', kurdish_text: 'فۆنتا تەفسیرێ', category: 'labels', page: 'settings', context: 'Tafsir font setting' },
    { key_id: 'label.display', kurdish_text: 'رۆکار', category: 'labels', page: 'settings', context: 'Display section' },
    { key_id: 'label.progress', kurdish_text: 'پێشکەفتن', category: 'labels', page: 'all', context: 'Progress label' },
    { key_id: 'label.days', kurdish_text: 'رۆژ', category: 'labels', page: 'all', context: 'Days label' },
    { key_id: 'label.minutes', kurdish_text: 'خولەک', category: 'labels', page: 'goals', context: 'Minutes label' },
    { key_id: 'label.verse_of_day', kurdish_text: 'ئایەتا رۆژانە', category: 'labels', page: 'quran', context: 'Verse of the day' },
    { key_id: 'label.popular_searches', kurdish_text: 'گەڕیانێن بناڤودەنگ', category: 'labels', page: 'quran', context: 'Popular searches section' },
    { key_id: 'label.personal_info', kurdish_text: 'زانیاریێن شەخسی', category: 'labels', page: 'profile', context: 'Personal info section' },
    { key_id: 'label.my_profile', kurdish_text: 'پرۆفایلا مە', category: 'labels', page: 'profile', context: 'My profile title' },
    { key_id: 'label.edit_profile', kurdish_text: 'دەستکاریکرنا پرۆفایلێ', category: 'labels', page: 'profile', context: 'Edit profile title' },
    { key_id: 'label.profile_picture', kurdish_text: 'وێنا پرۆفایلێ', category: 'labels', page: 'profile', context: 'Profile picture label' },
    { key_id: 'label.quran_progress', kurdish_text: 'پێشکەفتنا قورئانێ', category: 'labels', page: 'profile', context: 'Quran progress' },
    { key_id: 'label.this_week_progress', kurdish_text: 'پێشکەفتنا ڤێ هەفتییێ', category: 'labels', page: 'goals', context: 'This week progress' },
    { key_id: 'label.today_goal', kurdish_text: 'ئارمانجا ئەڤرۆ', category: 'labels', page: 'goals', context: 'Today goal label' },
    { key_id: 'label.email_verification', kurdish_text: 'پشتڕاستکردنەوەی ئیمەیل', category: 'labels', page: 'login', context: 'Email verification title' },
    { key_id: 'label.forgot_password', kurdish_text: 'پاسوۆردا خوە ژبیرکری؟', category: 'labels', page: 'login', context: 'Forgot password link' },
    { key_id: 'label.or', kurdish_text: 'یان', category: 'labels', page: 'login', context: 'Divider text' },
    { key_id: 'label.have_account', kurdish_text: 'ژبەر حساب هەیە؟', category: 'labels', page: 'login', context: 'Have account link' },
    { key_id: 'label.kurdistan', kurdish_text: 'کوردستان', category: 'labels', page: 'profile', context: 'Kurdistan option' },
    { key_id: 'label.others', kurdish_text: 'یێن دی', category: 'labels', page: 'profile', context: 'Others option' },
    { key_id: 'label.islamic_voice', kurdish_text: 'دەنگێ ئیسلامێ', category: 'labels', page: 'islamvoice', context: 'Islamic Voice title' },
    { key_id: 'label.change_theme', kurdish_text: 'گۆڕینی ڕووناکی', category: 'labels', page: 'all', context: 'Theme toggle tooltip' },

    // ==========================================
    // PLACEHOLDERS
    // ==========================================
    { key_id: 'placeholder.email', kurdish_text: 'ئیمەیلا خوە بنڤیسە', category: 'placeholders', page: 'all', context: 'Email input placeholder' },
    { key_id: 'placeholder.password', kurdish_text: 'پاسوۆردا خوە بنڤیسە', category: 'placeholders', page: 'all', context: 'Password input placeholder' },
    { key_id: 'placeholder.password_strong', kurdish_text: 'پاسوۆردێ بهێز دروستکە (کەمتر ٦ پیت)', category: 'placeholders', page: 'login', context: 'Strong password placeholder' },
    { key_id: 'placeholder.name', kurdish_text: 'ناڤا خوە بنڤیسە', category: 'placeholders', page: 'all', context: 'Name input placeholder' },
    { key_id: 'placeholder.first_name', kurdish_text: 'ناڤێ یەکەم', category: 'placeholders', page: 'profile', context: 'First name placeholder' },
    { key_id: 'placeholder.last_name', kurdish_text: 'ناڤێ دووەم', category: 'placeholders', page: 'profile', context: 'Last name placeholder' },
    { key_id: 'placeholder.address', kurdish_text: 'ناڤنیشان', category: 'placeholders', page: 'profile', context: 'Address placeholder' },
    { key_id: 'placeholder.search_quran', kurdish_text: 'لێگەریانا قورئانێ…', category: 'placeholders', page: 'quran', context: 'Quran search placeholder' },
    { key_id: 'placeholder.search_bookmarks', kurdish_text: 'گەڕیان ل نیشانەکری...', category: 'placeholders', page: 'bookmarks', context: 'Bookmarks search placeholder' },
    { key_id: 'placeholder.search_islamvoice', kurdish_text: 'بگەڕێ بۆ بەش، زنجیرە، یان بابەت...', category: 'placeholders', page: 'islamvoice', context: 'Islamic Voice search placeholder' },
    { key_id: 'placeholder.add_note', kurdish_text: 'تێبینییا خۆ ل ڤێرێ بنڤیسە...', category: 'placeholders', page: 'bookmarks', context: 'Add note placeholder' },
    { key_id: 'placeholder.select_country', kurdish_text: 'وەلاتەکا خوە هەلبژێرە', category: 'placeholders', page: 'profile', context: 'Select country placeholder' },
    { key_id: 'placeholder.new_password', kurdish_text: 'پاسوۆردا نوێ', category: 'placeholders', page: 'profile', context: 'New password placeholder' },
    { key_id: 'placeholder.confirm_password', kurdish_text: 'پاسوۆرد دوبارە بنڤیسە', category: 'placeholders', page: 'profile', context: 'Confirm password placeholder' },
    { key_id: 'placeholder.enter_number', kurdish_text: 'ژمارەکێ بنڤیسە', category: 'placeholders', page: 'goals', context: 'Enter number placeholder' },
    { key_id: 'placeholder.minutes_input', kurdish_text: 'خولەک (ب خولەک)', category: 'placeholders', page: 'goals', context: 'Minutes input placeholder' },
    { key_id: 'placeholder.display_name', kurdish_text: 'ناڤێ خوە بنڤیسە', category: 'placeholders', page: 'profile', context: 'Display name placeholder' },

    // ==========================================
    // PASSWORD REQUIREMENTS
    // ==========================================
    { key_id: 'password.min_chars', kurdish_text: '✗ کەمتر ٨ پیت', category: 'password', page: 'login', context: 'Min 8 characters requirement' },
    { key_id: 'password.uppercase', kurdish_text: '✗ پیتێن گەورە (A-Z)', category: 'password', page: 'login', context: 'Uppercase requirement' },
    { key_id: 'password.lowercase', kurdish_text: '✗ پیتێن بچوک (a-z)', category: 'password', page: 'login', context: 'Lowercase requirement' },
    { key_id: 'password.numbers', kurdish_text: '✗ ژمارە (0-9)', category: 'password', page: 'login', context: 'Numbers requirement' },
    { key_id: 'password.special', kurdish_text: '✗ پیتێن تایبەت (!@#$%)', category: 'password', page: 'login', context: 'Special characters requirement' },

    // ==========================================
    // ALERTS & CONFIRMATIONS
    // ==========================================
    { key_id: 'alert.confirm_delete', kurdish_text: 'دڵنیایت لە سڕینەوەی ئەم شیرۆڤەیە؟', category: 'alerts', page: 'all', context: 'Delete confirmation' },
    { key_id: 'alert.confirm_delete_video', kurdish_text: 'ئایا تو دڵنیای کە دڤێت ئەڤ ڤیدیۆیێ بسڕیتەڤە؟\n\nئەڤ کار ناکرێ پاشتر بگەڕێنەڤە!', category: 'alerts', page: 'islamvoice', context: 'Video delete confirmation' },
    { key_id: 'alert.existing_email_account', kurdish_text: '⚠️ تو ژبەر ئەژمارەکا خوە هەیە!\n\nئیمەیلا تە پەیوەستە ب ئەژمارەکا ئیمەیل. تکایە ب ئیمەیل بچۆ ژوورەوە.', category: 'alerts', page: 'login', context: 'Existing email account alert' },
    { key_id: 'alert.existing_google_account', kurdish_text: '⚠️ تو ژبەر ئەژمارەکا خوە هەیە!\n\nئیمەیلا تە پەیوەستە ب ئەژمارەکا Google. تکایە ب Google بچۆ ژوورەوە.', category: 'alerts', page: 'login', context: 'Existing Google account alert' },
    { key_id: 'alert.session_violation', kurdish_text: '⚠️ گۆڕانکارییەک د سیشنا تە دا هاتە دیتن. تکایە دووبارە بچە ژوورڤە.', category: 'alerts', page: 'all', context: 'Session violation alert' },
    { key_id: 'alert.otp_instructions', kurdish_text: 'کۆدی ٦ ژمارەیی کە نێردراوە بۆ ... بنووسە', category: 'alerts', page: 'login', context: 'OTP instructions' },

    // ==========================================
    // SUCCESS MESSAGES
    // ==========================================
    { key_id: 'success.profile_updated', kurdish_text: 'پرۆفایل ب سەرکەفتی نوێکرا!', category: 'success', page: 'profile', context: 'Profile update success' },
    { key_id: 'success.progress_saved', kurdish_text: 'پێشکەفتنا تە ب سەرکەفتی هاتە پاشکەفتن ✅.', category: 'success', page: 'all', context: 'Progress saved success' },
    { key_id: 'success.settings_updated', kurdish_text: 'سێتینگێن ئاگەهدارکرنێ ب سەرکەفتی هاتنە نویکرن 📨.', category: 'success', page: 'settings', context: 'Settings update success' },
    { key_id: 'success.email_subscribed', kurdish_text: 'ئیمەیلێ بیرئینانێ هاتە سەبسکرایبکرن — دێ د زووترین دەم دا نویکرنان وەرگری.', category: 'success', page: 'all', context: 'Email subscribe success' },
    { key_id: 'success.goal_achieved', kurdish_text: 'ئارمانج هاتە ب دەستڤەئینان!', category: 'success', page: 'goals', context: 'Goal achieved success' },
    { key_id: 'success.bookmark_added', kurdish_text: 'بووکمارک زێدەکرا', category: 'success', page: 'quran', context: 'Bookmark added' },
    { key_id: 'success.bookmark_removed', kurdish_text: 'بووکمارک لابرا', category: 'success', page: 'quran', context: 'Bookmark removed' },
    { key_id: 'success.copied', kurdish_text: 'کۆپی کرا!', category: 'success', page: 'all', context: 'Copied to clipboard' },

    // ==========================================
    // ERROR MESSAGES
    // ==========================================
    { key_id: 'error.generic', kurdish_text: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدە.', category: 'errors', page: 'all', context: 'Generic error' },
    { key_id: 'error.load_failed', kurdish_text: 'مە نەشیایە داتایێن خشتەیا تە بار بکەین. لطفەن پەنجەرێ تازە بکە.', category: 'errors', page: 'all', context: 'Data load failed' },
    { key_id: 'error.network', kurdish_text: 'کێشەیەک هەیە لە پەیوەندیدا. تکایە ئینتەرنێتەکەت بپشکنە.', category: 'errors', page: 'all', context: 'Network error' },
    { key_id: 'error.auth_required', kurdish_text: 'پێویستە بچیتە ژوورەوە.', category: 'errors', page: 'all', context: 'Auth required' },
    { key_id: 'error.invalid_input', kurdish_text: 'زانیاری نادروست. تکایە دووبارە بپشکنە.', category: 'errors', page: 'all', context: 'Invalid input' },

    // ==========================================
    // SETTINGS DESCRIPTIONS
    // ==========================================
    { key_id: 'settings_desc.dark_mode', kurdish_text: 'گوهۆڕین بۆ رەوشا تاریک بۆ خواندنا ئاسانتر', category: 'settings_desc', page: 'settings', context: 'Dark mode description' },
    { key_id: 'settings_desc.arabic_font', kurdish_text: 'دەستکاریکرنا فۆنتا تێکستێ عەرەبی', category: 'settings_desc', page: 'settings', context: 'Arabic font description' },
    { key_id: 'settings_desc.font_size', kurdish_text: 'مەزن یان بچووککرنا تێکستێ عەرەبی', category: 'settings_desc', page: 'settings', context: 'Font size description' },
    { key_id: 'settings_desc.tafsir_font', kurdish_text: 'دەستکاریکرنا فۆنتا تەفسیرێیا کوردی', category: 'settings_desc', page: 'settings', context: 'Tafsir font description' },
    { key_id: 'settings_desc.profile_update', kurdish_text: 'زانیاریێن خوە نوێبکە و دەستکاری بکە', category: 'settings_desc', page: 'profile', context: 'Profile update description' },

    // ==========================================
    // FOOTER
    // ==========================================
    { key_id: 'footer.brand', kurdish_text: 'تەفسیر کورد', category: 'footer', page: 'all', context: 'Footer brand name' },
    { key_id: 'footer.tagline', kurdish_text: 'پلاتفۆرمەکا ئارام بۆ خواندنێ، گەڕیان و رامان ل سەر قورئانا پیرۆز ب زمانێ کوردی (بادینی). قورئان بگەهیتە دەستێ هەر کەسەکی، هەر جهەکی و هەر دەمەکی.', category: 'footer', page: 'all', context: 'Footer tagline' },
    { key_id: 'footer.navigate', kurdish_text: 'گەڕیان', category: 'footer', page: 'all', context: 'Navigate section title' },
    { key_id: 'footer.other_pages', kurdish_text: 'رۆژپەڕێن دی', category: 'footer', page: 'all', context: 'Other pages section' },
    { key_id: 'footer.connect', kurdish_text: 'پەیوەندی', category: 'footer', page: 'all', context: 'Connect section' },
    { key_id: 'footer.contact_message', kurdish_text: 'ئەگەر تە پرسیارەک یان پێشنیارەک هەبیت، پەیوەندییێ ب مە بکە و ب زووترین دەم دێ بەرسڤا تە هێتە دان!', category: 'footer', page: 'all', context: 'Contact message' },
    { key_id: 'footer.home', kurdish_text: 'مالپەڕێ سەرەکی', category: 'footer', page: 'all', context: 'Home link' },
    { key_id: 'footer.quran', kurdish_text: 'قورئانا پیرۆز', category: 'footer', page: 'all', context: 'Quran link' },
    { key_id: 'footer.features', kurdish_text: 'تایبەتمەندی', category: 'footer', page: 'all', context: 'Features link' },
    { key_id: 'footer.about', kurdish_text: 'دەربارەی مە', category: 'footer', page: 'all', context: 'About link' },
    { key_id: 'footer.privacy', kurdish_text: 'پاراستنا تایبەتمەندیێ', category: 'footer', page: 'all', context: 'Privacy policy link' },
    { key_id: 'footer.terms', kurdish_text: 'مەرج و رێسایان', category: 'footer', page: 'all', context: 'Terms link' },
    { key_id: 'footer.copyright', kurdish_text: 'تەفسیر کورد. هەمی ماف پاراستی نە. خودایێ مەزن بەرەکەتێ بێخیتە هەول و ماندبوونا مە.', category: 'footer', page: 'all', context: 'Copyright text' },

    // ==========================================
    // NAV MENU
    // ==========================================
    { key_id: 'nav.home', kurdish_text: 'سەرەکی', category: 'nav', page: 'all', context: 'Home nav link' },
    { key_id: 'nav.quran', kurdish_text: 'قورئان', category: 'nav', page: 'all', context: 'Quran nav link' },
    { key_id: 'nav.islamvoice', kurdish_text: 'ئیسلام ڤۆیس', category: 'nav', page: 'all', context: 'Islamic Voice nav link' },

    // ==========================================
    // ISLAMVOICE — COMMENTS & LIKES (2026-04-18)
    // ==========================================
    { key_id: 'iv.comment_added',       kurdish_text: '✅ شیرۆڤە زیادکرا!',                               category: 'islamvoice', page: 'android', context: 'Comment submitted toast' },
    { key_id: 'iv.comment_deleted',     kurdish_text: 'شیرۆڤە سڕایەوە',                                    category: 'islamvoice', page: 'android', context: 'Comment deleted toast' },
    { key_id: 'iv.comment_required',    kurdish_text: 'تکایە شیرۆڤەیەک بنووسە',                            category: 'islamvoice', page: 'android', context: 'Validation: empty comment' },
    { key_id: 'iv.comment_too_long',    kurdish_text: 'شیرۆڤە زۆر درێژە (زۆرینە ٥٠٠ پیت)',                category: 'islamvoice', page: 'android', context: 'Validation: comment over 500 chars' },
    { key_id: 'iv.comments_load_error', kurdish_text: 'هەڵەیەک ڕوویدا لە بارکردنی شیرۆڤەکان',            category: 'islamvoice', page: 'android', context: 'Comments fetch error' },
    { key_id: 'iv.comments_title',      kurdish_text: 'شیرۆڤەکان',                                         category: 'islamvoice', page: 'android', context: 'Comments modal title' },
    { key_id: 'iv.like_btn',            kurdish_text: 'حەزلێبکە',                                           category: 'islamvoice', page: 'android', context: 'Like button (not liked)' },
    { key_id: 'iv.like_success',        kurdish_text: '❤️ حەزکرا!',                                        category: 'islamvoice', page: 'android', context: 'Like toast' },
    { key_id: 'iv.liked_btn',           kurdish_text: 'حەزلێکری',                                           category: 'islamvoice', page: 'android', context: 'Like button (liked state)' },
    { key_id: 'iv.no_comments',         kurdish_text: 'هیچ شیرۆڤەیەک نییە. یەکەم کەس بە کە شیرۆڤە دەکات!', category: 'islamvoice', page: 'android', context: 'Empty comments list' },

    // ==========================================
    // MUSHAF MODE (2026-04-18)
    // ==========================================
    { key_id: 'mushaf.font_offline',      kurdish_text: 'ستایلا پەڕینێ نەکەتە دەست بی ئینتەرنەت.',  category: 'mushaf', page: 'android', context: 'Font not available offline' },
    { key_id: 'mushaf.offline_msg',       kurdish_text: 'دەم یەکەم جار یە پێویستە ئینتەرنەت.',       category: 'mushaf', page: 'android', context: 'Mushaf needs internet on first load' },
    { key_id: 'mushaf.switch_to_reading', kurdish_text: 'بەرەو دیمەنا خوێندنێ',                      category: 'mushaf', page: 'android', context: 'Button: switch to reading mode' },

    // ==========================================
    // PROFILE — TIME DISPLAY & SESSION (2026-04-18)
    // ==========================================
    { key_id: 'profile.session_revoked', kurdish_text: 'چوونا دەرەوە ل ئامێرا دی کرا',  category: 'profile', page: 'android', context: 'Toast: session revoked on another device' },
    { key_id: 'profile.time_day',        kurdish_text: 'ڕۆژ',                              category: 'profile', page: 'android', context: 'Unit: day(s)' },
    { key_id: 'profile.time_hour',       kurdish_text: 'کاتژمێر',                          category: 'profile', page: 'android', context: 'Unit: hour(s)' },
    { key_id: 'profile.time_min',        kurdish_text: 'خولەک',                             category: 'profile', page: 'android', context: 'Unit: minute(s)' },

    // ==========================================
    // SETTINGS — SYNC PANEL (2026-04-18)
    // ==========================================
    { key_id: 'settings.sync_what_syncs',     kurdish_text: 'چ دێتە هاوکارکرن',               category: 'settings', page: 'android', context: 'Section label: what syncs' },
    { key_id: 'settings.sync_item_reading',   kurdish_text: 'پێشکەوتنا خوێندنێ',              category: 'settings', page: 'android', context: 'Sync item: reading progress' },
    { key_id: 'settings.sync_item_bookmarks', kurdish_text: 'نیشانکرن',                       category: 'settings', page: 'android', context: 'Sync item: bookmarks' },
    { key_id: 'settings.sync_item_goals',     kurdish_text: 'ئارمانج',                        category: 'settings', page: 'android', context: 'Sync item: goals' },
    { key_id: 'settings.sync_item_prayer',    kurdish_text: 'کات و ئاگادارکرن نوێژ',          category: 'settings', page: 'android', context: 'Sync item: prayer times & notifs' },
    { key_id: 'settings.sync_item_saved',     kurdish_text: 'ڤیدیۆیێن پاراستی',               category: 'settings', page: 'android', context: 'Sync item: saved videos' },
    { key_id: 'settings.sync_item_settings',  kurdish_text: 'ڕێکخستن',                        category: 'settings', page: 'android', context: 'Sync item: app settings' },
    { key_id: 'settings.sync_device_only',    kurdish_text: 'تەنها ل ئامێرê',                 category: 'settings', page: 'android', context: 'Section label: device-only items' },
    { key_id: 'settings.sync_device_cache',   kurdish_text: 'کاشێکردنا دەنگ',                 category: 'settings', page: 'android', context: 'Device-only: audio cache' },
    { key_id: 'settings.sync_device_notif',   kurdish_text: 'ئاگادارکرنا دینامیکی',            category: 'settings', page: 'android', context: 'Device-only: dynamic notifications' },
    { key_id: 'settings.sync_device_sched',   kurdish_text: 'خشتا نوێژ',                      category: 'settings', page: 'android', context: 'Device-only: prayer schedule' },
    { key_id: 'settings.sync_status_offline', kurdish_text: 'نەگیهاتنا ئینتەرنەت',            category: 'settings', page: 'android', context: 'Sync status: no internet' },
    { key_id: 'settings.sync_status_syncing', kurdish_text: 'هاوکارکرن...',                   category: 'settings', page: 'android', context: 'Sync status: in progress' },
    { key_id: 'settings.sync_status_failed',  kurdish_text: 'هاوکارکرن سەرنەکەوت',            category: 'settings', page: 'android', context: 'Sync status: failed' },
    { key_id: 'settings.sync_retry_btn',      kurdish_text: 'دووبارە هەوڵبدە',                category: 'settings', page: 'android', context: 'Retry sync button label' },
];

// Function to seed the database (run in browser console on admin page)
async function seedTranslations(supabase) {
    console.log('Starting to seed translations...');
    console.log(`Total translations to insert: ${TRANSLATIONS_SEED.length}`);

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < TRANSLATIONS_SEED.length; i += batchSize) {
        const batch = TRANSLATIONS_SEED.slice(i, i + batchSize);

        const { data, error } = await supabase
            .from('kurdish_translations')
            .upsert(batch, { onConflict: 'key_id' });

        if (error) {
            console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
            errors++;
        } else {
            inserted += batch.length;
            console.log(`Inserted batch ${i / batchSize + 1}: ${batch.length} translations`);
        }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Errors: ${errors}`);

    return { inserted, errors };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TRANSLATIONS_SEED, seedTranslations };
}
