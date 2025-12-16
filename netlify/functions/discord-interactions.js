const { createClient } = require('@supabase/supabase-js');
const nacl = require('tweetnacl');

// Discord interaction types
const InteractionType = {
    PING: 1,
    APPLICATION_COMMAND: 2
};

// Discord interaction response types
const InteractionResponseType = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5
};

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

        if (!PUBLIC_KEY) {
            console.error('Missing DISCORD_PUBLIC_KEY');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Discord not configured' })
            };
        }

        // Verify Discord signature
        const signature = event.headers['x-signature-ed25519'];
        const timestamp = event.headers['x-signature-timestamp'];
        const body = event.body;

        const isValid = verifyDiscordSignature(PUBLIC_KEY, signature, timestamp, body);

        if (!isValid) {
            console.error('Invalid Discord signature');
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid signature' })
            };
        }

        const interaction = JSON.parse(body);

        // Handle PING (Discord verification)
        if (interaction.type === InteractionType.PING) {
            return {
                statusCode: 200,
                body: JSON.stringify({ type: InteractionResponseType.PONG })
            };
        }

        // Handle slash commands
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const commandName = interaction.data.name;

            switch (commandName) {
                case 'stats':
                    return await handleStatsCommand(interaction);
                case 'users':
                    return await handleUsersCommand(interaction);
                case 'activity':
                    return await handleActivityCommand(interaction);
                default:
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: '❌ Unknown command'
                            }
                        })
                    };
            }
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Unknown interaction type' })
        };

    } catch (error) {
        console.error('Error handling interaction:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Verify Discord request signature using Ed25519
function verifyDiscordSignature(publicKey, signature, timestamp, body) {
    try {
        const message = Buffer.from(timestamp + body);
        const sig = Buffer.from(signature, 'hex');
        const pub = Buffer.from(publicKey, 'hex');

        return nacl.sign.detached.verify(message, sig, pub);
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

// Handle /stats command
async function handleStatsCommand(interaction) {
    try {
        // Get total users
        const { count: totalUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });

        // Get active users (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: activeUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_active', sevenDaysAgo.toISOString());

        // Get new users (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: newUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Get total ayahs read
        const { data: readData } = await supabase
            .from('user_profiles')
            .select('ayahs_read');

        const totalAyahsRead = readData?.reduce((sum, user) => sum + (user.ayahs_read || 0), 0) || 0;

        // Get users who completed Quran
        const { count: completedUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('ayahs_read', 6236);

        const embed = {
            title: '📊 Tafsir Kurd Platform Statistics',
            color: 0x5865F2,
            fields: [
                {
                    name: '👥 Total Users',
                    value: String(totalUsers || 0),
                    inline: true
                },
                {
                    name: '✨ Active Users (7d)',
                    value: String(activeUsers || 0),
                    inline: true
                },
                {
                    name: '🆕 New Users (30d)',
                    value: String(newUsers || 0),
                    inline: true
                },
                {
                    name: '📖 Total Ayahs Read',
                    value: String(totalAyahsRead),
                    inline: true
                },
                {
                    name: '🏆 Completed Quran',
                    value: String(completedUsers || 0),
                    inline: true
                },
                {
                    name: '📈 Completion Rate',
                    value: totalUsers > 0 ? `${((completedUsers / totalUsers) * 100).toFixed(1)}%` : '0%',
                    inline: true
                }
            ],
            footer: {
                text: 'Tafsir Kurd Admin Bot',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            },
            timestamp: new Date().toISOString()
        };

        return {
            statusCode: 200,
            body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    embeds: [embed]
                }
            })
        };

    } catch (error) {
        console.error('Error in /stats:', error);
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `❌ Error fetching stats: ${error.message}`
                }
            })
        };
    }
}

// Handle /users command
async function handleUsersCommand(interaction) {
    try {
        // Get last 10 users
        const { data: users, error } = await supabase
            .from('user_profiles')
            .select('full_name, email, city, country, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!users || users.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: '📭 No users found'
                    }
                })
            };
        }

        const fields = users.map((user, index) => {
            const location = [user.city, user.country].filter(Boolean).join(', ') || 'Unknown';
            const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            return {
                name: `${index + 1}. ${user.full_name || user.email || 'Unknown'}`,
                value: `📍 ${location}\n📅 Joined: ${joinDate}`,
                inline: false
            };
        });

        const embed = {
            title: '👥 Recent Users (Last 10)',
            color: 0x00FF00,
            fields: fields,
            footer: {
                text: 'Tafsir Kurd Admin Bot',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            },
            timestamp: new Date().toISOString()
        };

        return {
            statusCode: 200,
            body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    embeds: [embed]
                }
            })
        };

    } catch (error) {
        console.error('Error in /users:', error);
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `❌ Error fetching users: ${error.message}`
                }
            })
        };
    }
}

// Handle /activity command
async function handleActivityCommand(interaction) {
    try {
        // Get today's activity
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: todaySignups } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        // Get yesterday's activity
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const { count: yesterdaySignups } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', yesterday.toISOString())
            .lt('created_at', today.toISOString());

        // Get this week's activity
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const { count: weekSignups } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString());

        // Get this month's activity
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const { count: monthSignups } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', monthStart.toISOString());

        // Get most active region
        const { data: regionData } = await supabase
            .from('user_profiles')
            .select('country')
            .not('country', 'is', null);

        const regionCounts = {};
        regionData?.forEach(user => {
            regionCounts[user.country] = (regionCounts[user.country] || 0) + 1;
        });

        const topRegion = Object.entries(regionCounts)
            .sort((a, b) => b[1] - a[1])[0];

        const embed = {
            title: '📈 Platform Activity Report',
            color: 0xFF9900,
            fields: [
                {
                    name: '📅 Today',
                    value: `${todaySignups || 0} new users`,
                    inline: true
                },
                {
                    name: '📅 Yesterday',
                    value: `${yesterdaySignups || 0} new users`,
                    inline: true
                },
                {
                    name: '📅 This Week',
                    value: `${weekSignups || 0} new users`,
                    inline: true
                },
                {
                    name: '📅 This Month',
                    value: `${monthSignups || 0} new users`,
                    inline: true
                },
                {
                    name: '🌍 Most Active Region',
                    value: topRegion ? `${topRegion[0]} (${topRegion[1]} users)` : 'N/A',
                    inline: true
                },
                {
                    name: '📊 Growth Trend',
                    value: todaySignups > yesterdaySignups ? '📈 Increasing' : todaySignups < yesterdaySignups ? '📉 Decreasing' : '➡️ Stable',
                    inline: true
                }
            ],
            footer: {
                text: 'Tafsir Kurd Admin Bot',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            },
            timestamp: new Date().toISOString()
        };

        return {
            statusCode: 200,
            body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    embeds: [embed]
                }
            })
        };

    } catch (error) {
        console.error('Error in /activity:', error);
        return {
            statusCode: 200,
            body: JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `❌ Error fetching activity: ${error.message}`
                }
            })
        };
    }
}
