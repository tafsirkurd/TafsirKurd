/**
 * TafsirKurd Centralized Translations
 * All Kurdish text strings in one place
 * Managed via Admin Panel at /admin-translations.html
 */

const TRANSLATIONS = {
    // ==========================================
    // BUTTONS & ACTIONS
    // ==========================================
    buttons: {
        sign_in: 'چوونە ژوورڤە',
        sign_up: 'حسابێ نوی',
        sign_out: 'دەرچوون',
        save: 'پارەبکە',
        cancel: 'پاشگەزبوونەکە',
        close: 'داخستن',
        back: 'گەڕیان ڤە',
        next: 'پێشڤەچوون',
        read: 'بخوێنە',
        read_more: 'زێدەتر بخوێنە',
        edit: 'دەستکاریکرن',
        delete: 'سڕینەوە',
        search: 'گەڕان',
        verify: 'پشتڕاستکردنەوە',
        create_account: 'دروستکرنا حساب',
        create_account_google: 'دروستکرنا حساب ب Google',
        sign_in_google: 'چوونە ژوورڤە ب Google',
        change_picture: 'گۆڕینا وێنێ',
        mark_all_read: 'هەموو بخوێنەوە',
        view_all: 'هەموو ببینە',
        new_goal: 'ئارمانجەکا نوی',
        fill_form: 'فۆرمێ پڕ بکە',
        refresh: 'تازەکرنەوە',
        continue: 'بەردەوام بە',
        confirm: 'دڵنیاکردنەوە',
        retry: 'دووبارە هەوڵدان',
        download: 'داگرتن',
        share: 'هاوبەشکرن',
        copy: 'کۆپیکرن',
        play: 'لێدان',
        pause: 'وەستان',
        stop: 'ڕاگرتن',
    },

    // ==========================================
    // LABELS & HEADINGS
    // ==========================================
    labels: {
        email: 'ئیمەیل',
        password: 'پاسوۆرد',
        name: 'ناڤ',
        first_name: 'ناڤێ یەکەم',
        last_name: 'ناڤێ دووەم',
        address: 'ناڤنیشان',
        country: 'وەلات',
        profile: 'پرۆفایل',
        settings: 'رێکخستن',
        goals: 'ئارمانج',
        bookmarks: 'نیشانەکری',
        help: 'یارمەتی',
        notifications: 'ئاگادارکرنەوە',
        dark_mode: 'رەوشا تاریک',
        arabic_font: 'فۆنتا عەرەبی',
        font_type: 'جۆرێ فۆنتێ',
        font_size: 'قەبارەیا فۆنتێ',
        font_preview: 'پێشبینیا فۆنتێ',
        tafsir_font: 'فۆنتا تەفسیرێ',
        display: 'رۆکار',
        progress: 'پێشکەفتن',
        days: 'رۆژ',
        minutes: 'خولەک',
        verse_of_day: 'ئایەتا رۆژانە',
        popular_searches: 'گەڕیانێن بناڤودەنگ',
        personal_info: 'زانیاریێن شەخسی',
        my_profile: 'پرۆفایلا مە',
        edit_profile: 'دەستکاریکرنا پرۆفایلێ',
        profile_picture: 'وێنا پرۆفایلێ',
        quran_progress: 'پێشکەفتنا قورئانێ',
        this_week_progress: 'پێشکەفتنا ڤێ هەفتییێ',
        today_goal: 'ئارمانجا ئەڤرۆ',
        email_verification: 'پشتڕاستکردنەوەی ئیمەیل',
        forgot_password: 'پاسوۆردا خوە ژبیرکری؟',
        or: 'یان',
        have_account: 'ژبەر حساب هەیە؟',
        kurdistan: 'کوردستان',
        others: 'یێن دی',
        islamic_voice: 'دەنگێ ئیسلامێ',
        change_theme: 'گۆڕینی ڕووناکی',
    },

    // ==========================================
    // PLACEHOLDERS
    // ==========================================
    placeholders: {
        email: 'ئیمەیلا خوە بنڤیسە',
        password: 'پاسوۆردا خوە بنڤیسە',
        password_strong: 'پاسوۆردێ بهێز دروستکە (کەمتر ٦ پیت)',
        name: 'ناڤا خوە بنڤیسە',
        first_name: 'ناڤێ یەکەم',
        last_name: 'ناڤێ دووەم',
        address: 'ناڤنیشان',
        search_quran: 'لێگەریانا قورئانێ…',
        search_bookmarks: 'گەڕیان ل نیشانەکری...',
        search_islamvoice: 'بگەڕێ بۆ بەش، زنجیرە، یان بابەت...',
        add_note: 'تێبینییا خۆ ل ڤێرێ بنڤیسە...',
        select_country: 'وەلاتەکا خوە هەلبژێرە',
        new_password: 'پاسوۆردا نوێ',
        confirm_password: 'پاسوۆرد دوبارە بنڤیسە',
        enter_number: 'ژمارەکێ بنڤیسە',
        minutes_input: 'خولەک (ب خولەک)',
        display_name: 'ناڤێ خوە بنڤیسە',
    },

    // ==========================================
    // PASSWORD REQUIREMENTS
    // ==========================================
    password_requirements: {
        min_chars: '✗ کەمتر ٨ پیت',
        uppercase: '✗ پیتێن گەورە (A-Z)',
        lowercase: '✗ پیتێن بچوک (a-z)',
        numbers: '✗ ژمارە (0-9)',
        special: '✗ پیتێن تایبەت (!@#$%)',
    },

    // ==========================================
    // ALERTS & CONFIRMATIONS
    // ==========================================
    alerts: {
        confirm_delete: 'دڵنیایت لە سڕینەوەی ئەم شیرۆڤەیە؟',
        confirm_delete_video: 'ئایا تو دڵنیای کە دڤێت ئەڤ ڤیدیۆیێ بسڕیتەڤە؟\n\nئەڤ کار ناکرێ پاشتر بگەڕێنەڤە!',
        existing_email_account: '⚠️ تو ژبەر ئەژمارەکا خوە هەیە!\n\nئیمەیلا تە پەیوەستە ب ئەژمارەکا ئیمەیل. تکایە ب ئیمەیل بچۆ ژوورەوە.',
        existing_google_account: '⚠️ تو ژبەر ئەژمارەکا خوە هەیە!\n\nئیمەیلا تە پەیوەستە ب ئەژمارەکا Google. تکایە ب Google بچۆ ژوورەوە.',
        session_violation: '⚠️ گۆڕانکارییەک د سیشنا تە دا هاتە دیتن. تکایە دووبارە بچە ژوورڤە.',
        otp_instructions: 'کۆدی ٦ ژمارەیی کە نێردراوە بۆ ... بنووسە',
    },

    // ==========================================
    // SUCCESS MESSAGES
    // ==========================================
    success: {
        profile_updated: 'پرۆفایل ب سەرکەفتی نوێکرا!',
        progress_saved: 'پێشکەفتنا تە ب سەرکەفتی هاتە پاشکەفتن ✅.',
        settings_updated: 'سێتینگێن ئاگەهدارکرنێ ب سەرکەفتی هاتنە نویکرن 📨.',
        email_subscribed: 'ئیمەیلێ بیرئینانێ هاتە سەبسکرایبکرن — دێ د زووترین دەم دا نویکرنان وەرگری.',
        goal_achieved: 'ئارمانج هاتە ب دەستڤەئینان!',
        bookmark_added: 'بووکمارک زێدەکرا',
        bookmark_removed: 'بووکمارک لابرا',
        copied: 'کۆپی کرا!',
    },

    // ==========================================
    // ERROR MESSAGES
    // ==========================================
    errors: {
        generic: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدە.',
        load_failed: 'مە نەشیایە داتایێن خشتەیا تە بار بکەین. لطفەن پەنجەرێ تازە بکە.',
        network: 'کێشەیەک هەیە لە پەیوەندیدا. تکایە ئینتەرنێتەکەت بپشکنە.',
        auth_required: 'پێویستە بچیتە ژوورەوە.',
        invalid_input: 'زانیاری نادروست. تکایە دووبارە بپشکنە.',
    },

    // ==========================================
    // NOTIFICATIONS (Daily Progress)
    // ==========================================
    notifications: {
        daily_complete: 'ماشاءالله! تە خواندنا ئەڤرۆ ب دووماهی ئینایە — خشتەیا تە هەر بەردەوامە 🌙.',
        streak_day: 'تۆ د رۆژا ${dayCount} ێ دا یێ ل سەر رێکا خوە یا قورئانێ. بلا رۆناهی هەر بمینیت!',
        streak_bright: 'خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە 🌸.',
        reminder_single_verse: 'بیرئینان: هەتا ئایەتەک بتنێ ژی تە نێزیکێ خودێ دکەت. نها خشتەیا خوە بەردەوام کە.',
        consistency_worship: 'بەردەوامبوون پەرستنە — قورئانا خوە ڤەکە و پێشکەفتنا خوە بەردەوام کە 🌿.',
        near_end_day: 'نێزیکی دووماهیا رۆژێ یە! ئایەتەکێ بخوینە دا خشتەیا تە نەشکێت 🌖.',
        streak_stopped: 'خشتەیا تە یا خواندنا قورئانێ راوەستیا — ئەڤرۆ ژ نوی دەستپێبکە بۆ خێر و قازانجێن نوی ✨.',
        missed_day_ok: 'خەم نەبە ئەگەر تە د دیرۆکێ دا ژ دەست دایە. ئەڤرۆ ژ نوی دەستپێبکە — خودێ حەز ژ بەردەوامیێ دکەت ❤️.',
        new_day_opportunity: 'رۆژەک نوی، دەرفەتەک نوی بۆ ڤەگۆهارتن ب قورئانێ 🌅.',
        goal_complete: 'ئارمانج هاتە ب دەستڤەئینان! تە ${goalName} ب دووماهی ئینایە — خودێ خێرا خوە بدەتە تە 🤍.',
        getting_closer: 'تۆ رۆژ ب رۆژ نێزیکتر دبیت ژ ئارمانجا خوە — بارک الله فیک!',
        remaining_levels: 'بتنێ ${remaining} ئاستێن مای بۆ ب دووماهی ئینانا ئارمانجا خوە. هەر بەردەوام بە، تۆ دشێی 💪.',
        progress_saved_continue: 'پێشکەفتن ب سەرکەفتی هاتە پاشکەفتن ✅. هەر دەمێ تۆ ئامادە بی رێکا خوە بەردەوام کە.',
        friday_reminder: 'بیرئینانا ئەینیێ: خواندنا خوە یا قورئانێ زێدە بکە — ئەڤە باشترین زکرە د رۆژا ئەینیێ دا 🌸.',
        little_daily: 'هندەک قورئان رۆژانە باشترە ژ گەلەک بتنێ جاران. دلی خوە گرێدە ب قورئانێ 💫.',
        quran_heals: 'قورئان دلا ساخ دکەت — هەتا ئایەتەک بتنێ ژی هەر تشتەکی دگۆهۆریت 💖.',
        each_verse_light: 'هەر ئایەتەکێ تۆ دخوینی رۆناهیێ ل ژیانا تە زێدە دکەت. هەر بخوینە، ئەی باوەردار 🌙.',
        heavy_heart: 'دەما دلی تە گران هەست پێدکەت، کتێبا خوە ڤەکە یا کو چ جاران بێ هیڤی ناکەت 📖.',
        ramadan_near: 'رەمەزان نێزیکە! نها ئارمانجا خوە یا قورئانێ دیارکە و دلی خوە ئامادە کە 🌙.',
        verse_milestone: 'الحمدلله! تە گەهاندیە ${count} ئایەتان — هەر بەردەوام بە 🌿.',
        new_tafsir: 'پشکەکا نوی یا تەفسیرێ هاتە زێدەکرن! رامانێن دێرینتر ل tafsirkurd.com/quran ڤەکۆلین بکە 📜.',
        special_verse: 'بیرئینانەکا تایبەت: ل سەر ئایەتا ئەڤرۆ راوەستە و رامان لێ بکە — دبیت ئەڤە یاکو رۆژا تە بگۆهۆریت ✨.',
        new_version: 'ڤێرژنەکا نوی یا تەفسیرکورد بەردەستە. تازە بکە بۆ دیتنا نویکرنان 🔁.',
    },

    // ==========================================
    // SETTINGS DESCRIPTIONS
    // ==========================================
    settings_desc: {
        dark_mode: 'گوهۆڕین بۆ رەوشا تاریک بۆ خواندنا ئاسانتر',
        arabic_font: 'دەستکاریکرنا فۆنتا تێکستێ عەرەبی',
        font_size: 'مەزن یان بچووککرنا تێکستێ عەرەبی',
        tafsir_font: 'دەستکاریکرنا فۆنتا تەفسیرێیا کوردی',
        profile_update: 'زانیاریێن خوە نوێبکە و دەستکاری بکە',
    },

    // ==========================================
    // FOOTER
    // ==========================================
    footer: {
        brand: 'تەفسیر کورد',
        tagline: 'پلاتفۆرمەکا ئارام بۆ خواندنێ، گەڕیان و رامان ل سەر قورئانا پیرۆز ب زمانێ کوردی (بادینی). قورئان بگەهیتە دەستێ هەر کەسەکی، هەر جهەکی و هەر دەمەکی.',
        navigate: 'گەڕیان',
        other_pages: 'رۆژپەڕێن دی',
        connect: 'پەیوەندی',
        contact_message: 'ئەگەر تە پرسیارەک یان پێشنیارەک هەبیت، پەیوەندییێ ب مە بکە و ب زووترین دەم دێ بەرسڤا تە هێتە دان!',
        home: 'مالپەڕێ سەرەکی',
        quran: 'قورئانا پیرۆز',
        features: 'تایبەتمەندی',
        about: 'دەربارەی مە',
        privacy: 'پاراستنا تایبەتمەندیێ',
        terms: 'مەرج و رێسایان',
        copyright: 'تەفسیر کورد. هەمی ماف پاراستی نە. خودایێ مەزن بەرەکەتێ بێخیتە هەول و ماندبوونا مە.',
    },

    // ==========================================
    // NAV MENU
    // ==========================================
    nav: {
        home: 'سەرەکی',
        quran: 'قورئان',
        islamvoice: 'ئیسلام ڤۆیس',
    },
};

// Helper function to get translation with fallback
function t(key, replacements = {}) {
    const keys = key.split('.');
    let value = TRANSLATIONS;

    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            console.warn(`Translation missing: ${key}`);
            return key; // Return key as fallback
        }
    }

    // Handle string replacements like ${variable}
    if (typeof value === 'string') {
        for (const [placeholder, replacement] of Object.entries(replacements)) {
            value = value.replace(new RegExp(`\\$\\{${placeholder}\\}`, 'g'), replacement);
        }
    }

    return value;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TRANSLATIONS, t };
}
