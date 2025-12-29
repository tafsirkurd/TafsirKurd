// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/activity-monitor.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
    env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co',
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
);

const DISCORD_WEBHOOK_URL = env.DISCORD_WEBHOOK_URL;

// Helper to send Discord notifications
async function sendDiscord(embed) {
    if (!DISCORD_WEBHOOK_URL) return;

    const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'Tafsir Kurd Activity Monitor',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            embeds: [embed]
        })
    });

    return response.ok;
}

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    try {
        const { type, data } = JSON.parse(await request.text());

        let embed = null;

        switch (type) {
            case 'user_login':
                embed = {
                    title: '👤 User Login',
                    description: `**${data.name}** logged in`,
                    color: 0x0099FF,
                    fields: [
                        { name: 'Email', value: data.email, inline: true },
                        { name: 'Location', value: data.location || 'Unknown', inline: true },
                        { name: 'Time', value: new Date().toLocaleString(), inline: false }
                    ],
                    thumbnail: data.picture ? { url: data.picture } : null,
                    timestamp: new Date().toISOString()
                };
                break;

            case 'reading_session_start':
                embed = {
                    title: '📖 Reading Session Started',
                    description: `**${data.userName}** started reading`,
                    color: 0x00FFFF,
                    fields: [
                        { name: 'Surah', value: `${data.surah}`, inline: true },
                        { name: 'Ayah', value: `${data.ayah}`, inline: true },
                        { name: 'Progress', value: `${data.progress}%`, inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'bookmark_added':
                embed = {
                    title: '🔖 New Bookmark',
                    description: `**${data.userName}** bookmarked an ayah`,
                    color: 0xFFA500,
                    fields: [
                        { name: 'Surah', value: `${data.surah}`, inline: true },
                        { name: 'Ayah', value: `${data.ayah}`, inline: true },
                        { name: 'Total Bookmarks', value: `${data.totalBookmarks}`, inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'goal_achieved':
                embed = {
                    title: '🎯 Daily Goal Achieved!',
                    description: `**${data.userName}** reached their daily goal!`,
                    color: 0xFF1493,
                    fields: [
                        { name: 'Goal', value: `${data.goal} ayahs`, inline: true },
                        { name: 'Read Today', value: `${data.readToday} ayahs`, inline: true },
                        { name: 'Streak', value: `${data.streak} days`, inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'surah_completed':
                embed = {
                    title: '✅ Surah Completed!',
                    description: `**${data.userName}** completed Surah ${data.surahName}!`,
                    color: 0x32CD32,
                    fields: [
                        { name: 'Surah Number', value: `${data.surah}`, inline: true },
                        { name: 'Total Ayahs', value: `${data.ayahs}`, inline: true },
                        { name: 'Overall Progress', value: `${data.overallProgress}%`, inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'juz_completed':
                embed = {
                    title: '📕 Juz Completed!',
                    description: `**${data.userName}** completed Juz ${data.juz}!`,
                    color: 0xFFD700,
                    fields: [
                        { name: 'Juz', value: `${data.juz}/30`, inline: true },
                        { name: 'Days Taken', value: `${data.daysTaken} days`, inline: true },
                        { name: 'Progress', value: `${data.progress}%`, inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'profile_updated':
                embed = {
                    title: '⚙️ Profile Updated',
                    description: `**${data.userName}** updated their profile`,
                    color: 0x9B59B6,
                    fields: [
                        { name: 'Changes', value: data.changes || 'Profile information', inline: false }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'goal_set':
                embed = {
                    title: '🎯 New Goal Set',
                    description: `**${data.userName}** set a new reading goal`,
                    color: 0xFF4500,
                    fields: [
                        { name: 'Daily Goal', value: `${data.dailyGoal} ayahs`, inline: true },
                        { name: 'Type', value: data.goalType || 'Daily', inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'error_occurred':
                embed = {
                    title: '❌ Error Detected',
                    description: `An error occurred on the website`,
                    color: 0xFF0000,
                    fields: [
                        { name: 'Error', value: data.error || 'Unknown error', inline: false },
                        { name: 'Page', value: data.page || 'Unknown', inline: true },
                        { name: 'User', value: data.user || 'Anonymous', inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'search_query':
                embed = {
                    title: '🔍 Search Performed',
                    description: `User searched for content`,
                    color: 0x3498DB,
                    fields: [
                        { name: 'Query', value: data.query || 'N/A', inline: true },
                        { name: 'Results', value: `${data.results || 0} found`, inline: true }
                    ],
                    timestamp: new Date().toISOString()
                };
                break;

            case 'page_view':
                // Only send for important pages
                if (data.page && (data.page.includes('admin') || data.page.includes('settings'))) {
                    embed = {
                        title: '👁️ Page View',
                        description: `Important page accessed`,
                        color: 0x95A5A6,
                        fields: [
                            { name: 'Page', value: data.page, inline: true },
                            { name: 'User', value: data.user || 'Guest', inline: true }
                        ],
                        timestamp: new Date().toISOString()
                    };
                }
                break;

            default:
                console.log('Unknown activity type:', type);
                return { statusCode: 200, body: 'Unknown type' };
        }

        if (embed) {
            await sendDiscord(embed);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error('Activity monitor error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
};
