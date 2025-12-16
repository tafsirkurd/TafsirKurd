const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sendDiscordWebhook(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const data = JSON.stringify(payload);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 204 || res.statusCode === 200) {
                    resolve({ success: true });
                } else {
                    reject(new Error(`Discord API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function getHourlyActivity() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Get new users in last hour
    const { data: newUsers, count: newUserCount } = await supabase
        .from('user_profiles')
        .select('full_name, email, created_at', { count: 'exact' })
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

    // Get active users (updated in last hour)
    const { count: activeUserCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active', oneHourAgo.toISOString());

    // Get users who read in last hour (last_read_at updated)
    const { data: readingUsers, count: readingCount } = await supabase
        .from('user_profiles')
        .select('full_name, last_read_at, current_surah, current_ayah', { count: 'exact' })
        .gte('last_read_at', oneHourAgo.toISOString())
        .order('last_read_at', { ascending: false })
        .limit(5);

    // Get recent contact messages
    const { data: contactMessages, count: contactCount } = await supabase
        .from('contact_messages')
        .select('name, subject, created_at', { count: 'exact' })
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

    return {
        newUsers: newUsers || [],
        newUserCount: newUserCount || 0,
        activeUserCount: activeUserCount || 0,
        readingUsers: readingUsers || [],
        readingCount: readingCount || 0,
        contactMessages: contactMessages || [],
        contactCount: contactCount || 0
    };
}

async function sendHourlySummary() {
    console.log('📊 Generating hourly activity summary...\n');

    try {
        const activity = await getHourlyActivity();

        // Don't send if no activity
        if (activity.newUserCount === 0 &&
            activity.activeUserCount === 0 &&
            activity.readingCount === 0 &&
            activity.contactCount === 0) {
            console.log('⚪ No activity in the last hour. Skipping notification.');
            return;
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const embed = {
            title: `⏰ Hourly Activity Report - ${timeStr}`,
            description: `Summary of activity in the last hour`,
            color: 0x5865F2,
            fields: [],
            footer: {
                text: 'Tafsir Kurd Activity Monitor',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            },
            timestamp: new Date().toISOString()
        };

        // Overview field
        const overviewParts = [];
        if (activity.newUserCount > 0) overviewParts.push(`👥 ${activity.newUserCount} new users`);
        if (activity.activeUserCount > 0) overviewParts.push(`✨ ${activity.activeUserCount} active users`);
        if (activity.readingCount > 0) overviewParts.push(`📖 ${activity.readingCount} reading sessions`);
        if (activity.contactCount > 0) overviewParts.push(`📧 ${activity.contactCount} messages`);

        embed.fields.push({
            name: '📊 Overview',
            value: overviewParts.join('\n') || 'No activity',
            inline: false
        });

        // New users
        if (activity.newUsers.length > 0) {
            const userList = activity.newUsers.map(u =>
                `• ${u.full_name || u.email} (${new Date(u.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})`
            ).join('\n');

            embed.fields.push({
                name: `🎉 New Users (${activity.newUserCount})`,
                value: userList.substring(0, 1024),
                inline: false
            });
        }

        // Reading activity
        if (activity.readingUsers.length > 0) {
            const readingList = activity.readingUsers.map(u =>
                `• ${u.full_name || 'User'} - Surah ${u.current_surah || '?'}:${u.current_ayah || '?'}`
            ).join('\n');

            embed.fields.push({
                name: `📖 Reading Activity (${activity.readingCount})`,
                value: readingList.substring(0, 1024),
                inline: false
            });
        }

        // Contact messages
        if (activity.contactMessages.length > 0) {
            const messageList = activity.contactMessages.map(m =>
                `• ${m.name} - ${m.subject}`
            ).join('\n');

            embed.fields.push({
                name: `📧 Contact Messages (${activity.contactCount})`,
                value: messageList.substring(0, 1024),
                inline: false
            });
        }

        // Send to Discord
        await sendDiscordWebhook(DISCORD_WEBHOOK_URL, {
            username: 'Tafsir Kurd Hourly Report',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            embeds: [embed]
        });

        console.log('✅ Hourly summary sent successfully!');
        console.log(`   New users: ${activity.newUserCount}`);
        console.log(`   Active users: ${activity.activeUserCount}`);
        console.log(`   Reading sessions: ${activity.readingCount}`);
        console.log(`   Contact messages: ${activity.contactCount}\n`);

    } catch (error) {
        console.error('❌ Error sending hourly summary:', error.message);
    }
}

sendHourlySummary();
