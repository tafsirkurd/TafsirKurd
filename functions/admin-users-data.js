// Admin Users Data API - reads from user_data.app_data (current schema)
import { createClient } from '@supabase/supabase-js';

// Ayah counts per surah (index = surah number, 0 unused)
const SURAH_AYAHS = [
    0,7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,
    128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,
    73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,
    49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,
    28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,
    20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
];

/**
 * Parse user_data.app_data JSON blob into structured fields.
 * app_data keys are localStorage keys serialised by gatherSyncData().
 */
function parseAppData(appData) {
    if (!appData || typeof appData !== 'object') return {};

    // Reading position from lastRead JSON string
    let currentSurah = 0, currentAyah = 0;
    try {
        const lr = JSON.parse(appData.lastRead || 'null');
        if (lr) { currentSurah = lr.surah || 0; currentAyah = lr.ayah || 0; }
    } catch (e) {}

    // Total ayahs read + active-day counts from readLog {"YYYY-MM-DD": n}
    let totalAyahsRead = 0, activeDaysTotal = 0, activeDays30 = 0;
    const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
    try {
        const rl = JSON.parse(appData.readLog || '{}');
        Object.keys(rl).forEach(d => {
            const v = parseInt(rl[d]) || 0;
            totalAyahsRead += v;
            activeDaysTotal++;
            if (d >= thirtyAgo) activeDays30++;
        });
    } catch (e) {}

    // Bookmarks count
    let bookmarksCount = 0;
    try {
        const bms = JSON.parse(appData.app_bookmarks || '[]');
        bookmarksCount = Array.isArray(bms) ? bms.length : 0;
    } catch (e) {}

    // Surahs started / completed via surah_progress_N arrays
    let surahsStarted = 0, surahsCompleted = 0;
    for (let i = 1; i <= 114; i++) {
        const raw = appData['surah_progress_' + i];
        if (raw) {
            try {
                const ayahs = JSON.parse(raw);
                if (Array.isArray(ayahs) && ayahs.length > 0) {
                    surahsStarted++;
                    if (ayahs.length >= (SURAH_AYAHS[i] || 9999)) surahsCompleted++;
                }
            } catch (e) {}
        }
    }

    // Reading goal (daily ayah target)
    let readingGoal = 0;
    try { readingGoal = parseInt(appData.readingGoal) || 0; } catch (e) {}

    return {
        currentSurah,
        currentAyah,
        totalAyahsRead,
        activeDaysTotal,
        activeDays30,
        bookmarksCount,
        surahsStarted,
        surahsCompleted,
        bestStreak:    parseInt(appData.bestStreak) || 0,
        readingGoal,
        reciter:       appData.app_reciter || '',
        dailyReminder: appData.dailyReminder === 'true',
        theme:         appData.theme || 'light',
        showTafsir:    appData.showTafsir !== 'false',
    };
}

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const body = await request.json();
        const { action } = body;

        const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim()
            || (body.token || '').trim();
        if (!token) return jsonResponse({ error: 'No token provided' }, 401, corsHeaders);

        const { data: session } = await supabase
            .from('admin_sessions')
            .select('user_id, admin_users(role, email)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session || !session.admin_users)
            return jsonResponse({ error: 'Unauthorized' }, 403, corsHeaders);

        const role = session.admin_users.role;
        if (role !== 'super_admin' && role !== 'analyst')
            return jsonResponse({ error: 'Insufficient permissions' }, 403, corsHeaders);

        // ===== GET ALL USERS =====
        if (action === 'get_users') {
            const [{ data: profiles, error: pe }, { data: userData, error: ue }] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5000),
                supabase.from('user_data').select('user_id, app_data, updated_at').limit(5000)
            ]);

            if (pe) return jsonResponse({ error: 'Failed to fetch profiles' }, 500, corsHeaders);

            const udMap = {};
            (userData || []).forEach(r => { udMap[r.user_id] = r; });

            const users = (profiles || []).map(profile => {
                const udRow = udMap[profile.id] || {};
                const parsed = parseAppData(udRow.app_data);
                return {
                    id:                  profile.id,
                    name:                profile.full_name || profile.display_name || profile.name || 'Unknown',
                    email:               profile.email || '',
                    avatar:              profile.avatar_url || null,
                    registration_source: profile.registration_source || 'unknown',
                    created_at:          profile.created_at,
                    last_active:         udRow.updated_at || profile.updated_at || profile.created_at,
                    ...parsed
                };
            });

            return jsonResponse({ success: true, users, total: users.length }, 200, corsHeaders);
        }

        // ===== GET READING STATS =====
        if (action === 'get_reading_stats') {
            const [{ data: profiles, error: pe }, { data: userData }] = await Promise.all([
                supabase.from('profiles').select('id, full_name, display_name, email, avatar_url, created_at, registration_source'),
                supabase.from('user_data').select('user_id, app_data, updated_at')
            ]);

            if (pe) return jsonResponse({ error: 'Failed to fetch profiles' }, 500, corsHeaders);

            const udMap = {};
            (userData || []).forEach(r => { udMap[r.user_id] = r; });

            const totalAyahsInQuran = 6236;
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const users = (profiles || []).map(profile => {
                const udRow = udMap[profile.id] || {};
                const parsed = parseAppData(udRow.app_data);
                const lastActive = udRow.updated_at || profile.updated_at || profile.created_at;
                return {
                    id:            profile.id,
                    name:          profile.full_name || profile.display_name || profile.email?.split('@')[0] || 'Unknown',
                    email:         profile.email || '',
                    avatar:        profile.avatar_url,
                    source:        profile.registration_source || 'unknown',
                    created:       profile.created_at,
                    lastActive,
                    ayahsRead:     parsed.totalAyahsRead,
                    currentSurah:  parsed.currentSurah,
                    currentAyah:   parsed.currentAyah,
                    bestStreak:    parsed.bestStreak,
                    readingGoal:   parsed.readingGoal,
                    surahsStarted: parsed.surahsStarted,
                    surahsCompleted: parsed.surahsCompleted,
                    bookmarksCount: parsed.bookmarksCount,
                    activeDays30:  parsed.activeDays30,
                    activeDaysTotal: parsed.activeDaysTotal,
                    reciter:       parsed.reciter,
                    dailyReminder: parsed.dailyReminder,
                };
            });

            const readers        = users.filter(u => (u.ayahsRead || 0) > 0);
            const totalReaders   = readers.length;
            const totalAyahsRead = readers.reduce((s, u) => s + (u.ayahsRead || 0), 0);
            const avgProgress    = totalReaders > 0
                ? (totalAyahsRead / (totalReaders * totalAyahsInQuran) * 100).toFixed(1)
                : 0;
            const completedReaders = readers.filter(u => u.ayahsRead >= totalAyahsInQuran).length;
            const activeReaders    = users.filter(u => u.lastActive > sevenDaysAgo).length;

            const ranges = [0, 10, 25, 50, 75, 90, 100];
            const distribution = ranges.slice(0, -1).map((r, i) => {
                const next = ranges[i + 1];
                return readers.filter(u => {
                    const pct = ((u.ayahsRead || 0) / totalAyahsInQuran) * 100;
                    return pct >= r && pct < next;
                }).length;
            });

            return jsonResponse({
                success: true,
                stats: { totalReaders, avgProgress: parseFloat(avgProgress), completedReaders, activeReaders, distribution },
                users: users.sort((a, b) => b.ayahsRead - a.ayahsRead).slice(0, 50)
            }, 200, corsHeaders);
        }

        // ===== DELETE USER =====
        if (action === 'delete_user') {
            if (role !== 'super_admin')
                return jsonResponse({ error: 'Super Admin access required' }, 403, corsHeaders);

            const { userId } = body;
            if (!userId || typeof userId !== 'string')
                return jsonResponse({ error: 'userId is required' }, 400, corsHeaders);

            await supabase.from('user_data').delete().eq('user_id', userId);
            await supabase.from('profiles').delete().eq('id', userId);

            return jsonResponse({ success: true, message: 'User deleted' }, 200, corsHeaders);
        }

        return jsonResponse({ error: 'Unknown action' }, 400, corsHeaders);

    } catch (error) {
        console.error('Admin users data error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), { status, headers });
}
