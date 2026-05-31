// Unauthenticated endpoint — applies versioned hardcoded text corrections to the DB.
// Safe to call from any client: only writes pre-approved key→value pairs.
// Version-gated in site_settings so the DB update runs exactly once.

import { createClient } from '@supabase/supabase-js';

// Bump this string whenever new corrections are added.
const FIXES_VERSION = '20260531o';

// Keys whose DB values drifted from the intended Kurdish text.
const CORRECTIONS = [
    { key_id: 'dl.manage',              kurdish_text: 'دابەزاندن' },
    { key_id: 'dl.nothing_downloaded',  kurdish_text: 'چ دابەزاندن نینن' },
    { key_id: 'dl.nothing_hint',        kurdish_text: 'پەرتووک و دەنگان دابەزینە بۆ خواندنا بێ ئینتەرنێت' },
    { key_id: 'prayer.marked_done',     kurdish_text: 'تەمام بوو ✓' },
    { key_id: 'schedule_thursday_topic', kurdish_text: 'صەڵەوات و سورەتا (الکهف)' },
    { key_id: 'schedule_thursday_desc',  kurdish_text: 'ناڤەڕۆکەکا تایبەت یا صەڵەواتان، ڕیلزێن سورەتا الکهف، کو دبیتە بیرئینان بۆ خواندنا وێ - (سونەت) نەریتێن پیرۆز یێن پێنجشەمبێ.' },
    { key_id: 'adhkar.salawat',          kurdish_text: 'صەڵەوات' },
    { key_id: 'iv.delete',              kurdish_text: 'بەلێ' },
    { key_id: 'iv.cancel',             kurdish_text: 'نەخێر' },
    { key_id: 'iv.add_to_list',        kurdish_text: 'زێدە بکە سەر لیستێ' },
    { key_id: 'iv.add_to_list_btn',    kurdish_text: 'زێدە بکە سەر لیستێ' },
    { key_id: 'iv.added_bookmark',     kurdish_text: 'هاتە نیشانکرن' },
    { key_id: 'iv.added_to_list',      kurdish_text: 'زێدە بوو بۆ لیستا تە!' },
    { key_id: 'iv.apple_unavailable',  kurdish_text: 'چووناژوور ب ئەپڵ بەردەست نینە ⚠️' },
    { key_id: 'iv.audio_mode_on',      kurdish_text: 'حالەتێ دەنگی هاتە چالاكکرن 🎧' },
    { key_id: 'iv.auto',              kurdish_text: 'ئۆتۆماتیکی' },
    { key_id: 'iv.bookmark_save_success', kurdish_text: 'هاتە نیشانکرن ✓' },
    { key_id: 'iv.clear_filter',       kurdish_text: 'لادانا فلتەری' },
    { key_id: 'iv.deleted',           kurdish_text: 'هاتە ژێبرن' },
    { key_id: 'iv.done',              kurdish_text: 'تەمام بوو ✓' },
    { key_id: 'iv.email_unavailable', kurdish_text: 'تۆمارکرن ب ئیمێڵی بەردەست نینە ⚠️' },
    { key_id: 'iv.empty',            kurdish_text: 'چ ڤیدیۆ نەهاتنە دیتن' },
    { key_id: 'iv.mark_watched',      kurdish_text: 'تەمام بوو ✓' },
    { key_id: 'iv_added_msg',         kurdish_text: 'زێدە بوو بۆ لیستا تە!' },
    { key_id: 'iv_quality_auto',      kurdish_text: 'ئۆتۆماتیکی' },
    { key_id: 'islamvoice_button_2',  kurdish_text: 'زێدە بکە سەر لیستێ' },
    { key_id: 'iv.enter_email',      kurdish_text: 'ئیمێڵێ خۆ بنڤێسه ❌' },
    { key_id: 'iv.error_generic',   kurdish_text: 'خەلەتیەک چێبوو' },
    { key_id: 'iv.error_network',   kurdish_text: 'خەلەتی: پەیوەندی دگەل هێڵێ نینە' },
    { key_id: 'iv.error_prefix',    kurdish_text: 'خەلەتی' },
    { key_id: 'iv.error_save',      kurdish_text: 'نەهاتە هەلگرتن' },
    { key_id: 'iv.fb_unavailable',  kurdish_text: 'چوونەژوور ب فەیسبووکی بەردەست نینە ⚠️' },
    { key_id: 'iv.fill_required',        kurdish_text: 'هەمی خانەیێن پێدڤی پڕبکە!' },
    { key_id: 'auth.apple_unavailable', kurdish_text: 'چووناژوور ب ئەپڵوێ ل سەر ڤی ئامێری بەردەست نینە' },
    { key_id: 'auth.code_resent',           kurdish_text: 'کۆد دووبارە هاتە فرێکرن ✓' },
    { key_id: 'auth.email_conflict_email', kurdish_text: 'ئیمێڵێ تە یێ گرێداییە ب هەژمارەکا دی ڤە.' },
    { key_id: 'auth.email_conflict_google',  kurdish_text: 'ئیمێڵێ تە یێ گرێداییە ب Google ڤە، ب گووگڵ هەرە ژوورڤە.' },
    { key_id: 'toast.widget_no_data',        kurdish_text: 'چ داتا نینن' },
    { key_id: 'toast.widget_error',           kurdish_text: 'خەلەتی د ووجێتی دا' },
    { key_id: 'toast.sync_started',           kurdish_text: 'هەلگرتن دەستپێکر…' },
    { key_id: 'toast.rating_thanks',          kurdish_text: 'سوپاس بۆ هەڵسەنگاندنا تە!' },
    // v20260531g — kolilk admin changes
    { key_id: 'dl.redownload_btn',            kurdish_text: 'دووبارە هاتە داخستن' },
    { key_id: 'dl.partial',                   kurdish_text: 'بەشێت دابەزی' },
    { key_id: 'dl.partial_surahs',            kurdish_text: 'پشکەک دابەزی ({n}/114 سوورەت)' },
    { key_id: 'dl.surah_downloaded',          kurdish_text: 'سوورەت هاتە داگرتن ✓' },
    { key_id: 'dl.partial_issues',            kurdish_text: 'پشکەک دابەزین — کێشەیەک یا هەی' },
    { key_id: 'dl.tip_partial',               kurdish_text: 'ب کێماتی هاتە دابەزین — کلیک بکە بۆ ڕێڤەبرنێ' },
    { key_id: 'qs.jump_to',                   kurdish_text: 'دەربازببە بۆ ئایەتێ.' },
    { key_id: 'prayer.loading',               kurdish_text: 'تەماشەکرن...' },
    { key_id: 'qs.jump_audio',                kurdish_text: 'دەربازببە بۆ ئایەتا دەنگی.' },
    { key_id: 'search.exact_mode',            kurdish_text: 'لێگەڕیانا هوویر — تنێ دروستترین ئایەت' },
    // kolilk/tafsirkurd admin changes batch 2
    { key_id: 'iv.link_copied',               kurdish_text: 'لینک هاتە کۆپیکرن!' },
    { key_id: 'gencine.voice_permission',     kurdish_text: 'مۆڵەتدان ب مایکرۆفۆنی.' },
    { key_id: 'iv.in_list',                   kurdish_text: 'د لیستێ دایە' },
    { key_id: 'iv.history_cleared',           kurdish_text: 'تۆمارا گەڕیانێ هاتە پاقژکرن.' },
    { key_id: 'gencine.voice_requesting',     kurdish_text: 'داخوازییا مۆڵەتێ دهێتەکرن...' },
    { key_id: 'gencine.smart.done_today',     kurdish_text: 'ئەڤڕۆ تەمام بوو ✓' },
    { key_id: 'dl.wifi_blocked',              kurdish_text: 'تایبەتمەندیا "تنێ Wi-Fi" یا چالاکە. ب ڕێیا Wi-Fi گرێبدە یان ئەڤی مۆدی نەهێڵە' },
    { key_id: 'dl.wifi_only',                 kurdish_text: 'کارکرن تنێ ب Wi-Fi' },
    { key_id: 'dl.tip_downloaded',            kurdish_text: 'دابەزاندن تەمام بوو — کلیک بکە بۆ ڕێڤەبرنێ' },
    { key_id: 'gencine.dua_empty',            kurdish_text: 'چ دوعا نینن' },
    { key_id: 'gencine.cat_quran',            kurdish_text: 'ژ قورئانا پیرۆز.' },
    { key_id: 'gencine.adhkar_empty',         kurdish_text: 'چ زکر نینن.' },
    { key_id: 'dl.tip_downloaded_s',          kurdish_text: 'دابەزاندن' },
    { key_id: 'gencine.books_error',          kurdish_text: 'خەلەتیەک ڕوویدا' },
    { key_id: 'dl.verifying',                 kurdish_text: 'تاقیکرن...' },
    { key_id: 'dl.tip_offline',               kurdish_text: 'دابەزاندن بۆ گوهدارییکرنێ بێ ئینتەرنێت.' },
    { key_id: 'auth.err_wrong_credentials',   kurdish_text: 'ئیمەیل یان ژمارا نهێنی یا خەلەتە' },
    { key_id: 'auth.err_token_expired',       kurdish_text: 'دەمێ کۆدی ب دوماهی هات. داخوازا کۆدەکێ نوی بکە' },
    { key_id: 'auth.err_rate_limit',          kurdish_text: 'هەوڵدانێن زێدە چێبوون. پشتی چەند خۆلەکان دووبارە هەوڵ بدە.' },
    { key_id: 'auth.err_already_registered',  kurdish_text: 'ئەڤ ئیمەیلە پێشتر هاتییە تۆمارکرن. چوونەژوور بۆ ناڤ ئەکاونتێ خۆ بکە.' },
    { key_id: 'auth.err_email_not_confirmed', kurdish_text: 'ئیمەیلا تە نەهاتییە پشتڕاستکرن، هیڤییە پشکنینا ئیمەیلێ خۆ بکە.' },
    { key_id: 'auth.err_network',             kurdish_text: 'ئاریشەک د تۆڕێ دا چێبوو. پشکنینێ بۆ هێلا ئینتەرنێتا خۆ بکە' },
    { key_id: 'auth.resend_code',             kurdish_text: 'کودی دووبارە ب هنێرە' },
    { key_id: 'profile.session_revoked',      kurdish_text: 'هاتە دەرئێخستن ژ لایێ ئامیرەکێ دی ڤە' },
    { key_id: 'qs.mushaf_settings_title',     kurdish_text: 'ڕێکخستنا مووشەف' },
    { key_id: 'iv.error_occurred',            kurdish_text: 'خەلەتیەک چێبوو' },
    { key_id: 'iv.no_history',               kurdish_text: 'چ مێژوو نینن.' },
    { key_id: 'iv.login_required_for',        kurdish_text: 'کەرەمکە بۆ..' },
    { key_id: 'iv.login_first_suffix',        kurdish_text: 'تۆ پێشتر چوویە د ناڤ ئەپی دا.' },
    { key_id: 'iv.list_cleared',              kurdish_text: 'لیست هاتە پاقژکرن.' },
    { key_id: 'iv.quality_label',             kurdish_text: 'کواڵێتی' },
    { key_id: 'iv.percent_watched',           kurdish_text: '% هاتییە تەماشاکرن' },
    { key_id: 'iv.removed_history',           kurdish_text: 'ژ مێژوویێ هاتە ژێبرن.' },
    { key_id: 'iv.magic_link_sent',           kurdish_text: '✅ لینکەک بۆ ئیمەیلا تە هاتە هنارتن!' },
    { key_id: 'settings.sync_what_syncs',     kurdish_text: 'چ دهێتە هەلگرتن' },
    { key_id: 'settings.sync_status_failed',  kurdish_text: 'هەلگرتن سەرنەکەفت' },
    { key_id: 'settings.sync_status_ok',      kurdish_text: 'هاتیە هەلگرتن' },
    { key_id: 'settings.sync_btn',            kurdish_text: 'هەلگرتن' },
    { key_id: 'settings.sync_status_syncing', kurdish_text: 'هەلگرتن...' },
    // login label → چووناژوور
    { key_id: 'profile.login',               kurdish_text: 'چووناژوور' },
    { key_id: 'profile.login_method',        kurdish_text: 'شێوازێ چووناژوور' },
    { key_id: 'profile.login_first',         kurdish_text: 'هیڤیە ل دەستپێکێ چووناژوور ئەنجام بدە' },
    { key_id: 'profile.login_prompt',        kurdish_text: 'ژبۆ هەلگرتنا داتایان، چووناژوور ئەنجام بده' },
    { key_id: 'auth.login',                  kurdish_text: 'چووناژوور' },
    { key_id: 'auth.google_login',           kurdish_text: 'چووناژوور ب Google' },
    { key_id: 'auth.apple_login',            kurdish_text: 'چووناژوور ب Apple' },
    { key_id: 'auth.apple_failed',           kurdish_text: 'چووناژوور ب Apple سەرنەکەت' },
    { key_id: 'error.apple_failed',          kurdish_text: 'چووناژوور ب Apple شکست خوارد. دووبارە هەوڵ بدە' },
    { key_id: 'error.apple_unavailable',     kurdish_text: 'چووناژوور ب Apple ل ئەڤ ئامێرێ بەردەست نینە' },
    { key_id: 'gencine.books',               kurdish_text: 'پەرتوک' },
    { key_id: 'gencine.books_sub',           kurdish_text: 'پەرتوکێن ئیسلامی' },
    { key_id: 'gencine.books_empty',         kurdish_text: 'پەرتوک نەهاتنە دیتن' },
    { key_id: 'gencine.books_unit',          kurdish_text: 'پەرتوک' },
    { key_id: 'gencine.books_read',          kurdish_text: 'پەرتوک' },
    { key_id: 'gencine.search_books',        kurdish_text: 'لێگەڕیان بە پەرتوکان...' },
    { key_id: 'pdf.offline_sub',             kurdish_text: 'ئەڤ پەرتوک هێشتا نەهاتیە داخستن — ئینتەرنێتێ بخستۆ و دووبارە هەوڵ بدە' },
    { key_id: 'dl.books_section',            kurdish_text: 'پەرتوک' },
    { key_id: 'dl.no_books',                 kurdish_text: 'هیچ پەرتوکێک نەهاتیە داونلود کرن' },
    { key_id: 'notif.new_book_title',        kurdish_text: 'پەرتوکێکی نوێ 📖' },
    { key_id: 'notif.new_book_body',         kurdish_text: 'پەرتوکێکی نوێ زیاد بوو لە پەرتوکخانە' },
    { key_id: 'notif.reminder_msg_6',        kurdish_text: 'ئەو پەرتوکەی خوا لێ ناڕەحەت نابێت — بخوێنە 🌟' },
    { key_id: 'goals.last_session',          kurdish_text: 'دوماهیک خواندن' },
    { key_id: 'gencine.today',               kurdish_text: 'ئەڤڕۆ' },
    { key_id: 'gencine.weeks_ago',           kurdish_text: 'حەفتی' },
    { key_id: 'gencine.smart.friday_hint',   kurdish_text: 'ئەڤڕۆ ڕۆژا ئینیێ یە' },
    { key_id: 'iv.delete',                   kurdish_text: 'ژێبرن' },
    { key_id: 'iv.read_title',               kurdish_text: 'هاتییە خویندن' },
    { key_id: 'toast.logged_in',             kurdish_text: 'چووناژوور سەرکەفتیبوو' },
    { key_id: 'profile.view_profile',        kurdish_text: 'پرۆفایلی ببینە' },
];

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST')    return json({ error: 'POST only' }, 405);

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
        return json({ error: 'config error' }, 500);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Skip if this version was already applied
    const { data: setting } = await supabase
        .from('site_settings').select('value')
        .eq('key', 'text_fixes_applied_v').maybeSingle();

    if (setting?.value === FIXES_VERSION)
        return json({ success: true, skipped: 'already_applied', version: FIXES_VERSION });

    // Apply each correction (only touches rows that exist)
    const results = await Promise.all(
        CORRECTIONS.map(fix =>
            supabase.from('kurdish_translations')
                .update({ kurdish_text: fix.kurdish_text })
                .eq('key_id', fix.key_id)
        )
    );

    const errors = results.filter(r => r.error).length;

    // Mark version as applied so subsequent calls are instant no-ops
    await supabase.from('site_settings')
        .upsert({ key: 'text_fixes_applied_v', value: FIXES_VERSION }, { onConflict: 'key' });

    return json({ success: true, applied: CORRECTIONS.length - errors, errors, version: FIXES_VERSION });
}
