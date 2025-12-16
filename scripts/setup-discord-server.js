const https = require('https');

// Configuration
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Your Discord Server ID

if (!BOT_TOKEN || !GUILD_ID) {
    console.error('❌ Missing required environment variables:');
    console.error('   - DISCORD_BOT_TOKEN');
    console.error('   - DISCORD_GUILD_ID');
    console.error('\nUsage:');
    console.error('   set DISCORD_BOT_TOKEN=your_bot_token');
    console.error('   set DISCORD_GUILD_ID=your_server_id');
    console.error('   node scripts/setup-discord-server.js');
    process.exit(1);
}

// Color codes for roles
const COLORS = {
    RED: 0xE74C3C,
    ORANGE: 0xE67E22,
    BLUE: 0x3498DB,
    PURPLE: 0x9B59B6,
    GOLD: 0xF1C40F,
    GREEN: 0x2ECC71,
    TEAL: 0x1ABC9C,
    GRAY: 0x95A5A6,
    BLURPLE: 0x5865F2,
    PINK: 0xE91E63,
    DARK_BLUE: 0x34495E
};

// Server structure
const ROLES = [
    { name: '👑 Owner', color: COLORS.RED, permissions: '8', hoist: true },
    { name: '⚙️ Administrator', color: COLORS.ORANGE, permissions: '8', hoist: true },
    { name: '🛡️ Moderator', color: COLORS.BLUE, permissions: '268445718', hoist: true },
    { name: '🤖 Bot', color: COLORS.PURPLE, permissions: '0', hoist: false },
    { name: '🌟 Hafiz', color: COLORS.GOLD, permissions: '0', hoist: true },
    { name: '🏆 Quran Completed', color: COLORS.GREEN, permissions: '0', hoist: true },
    { name: '📖 Active Reader', color: COLORS.TEAL, permissions: '0', hoist: true },
    { name: '🆕 New Member', color: COLORS.GRAY, permissions: '0', hoist: false },
    { name: '🌍 Kurdish Speaker', color: COLORS.ORANGE, permissions: '0', hoist: false },
    { name: '🌐 English Speaker', color: COLORS.BLURPLE, permissions: '0', hoist: false },
    { name: '💎 Supporter', color: COLORS.PINK, permissions: '0', hoist: true },
    { name: '🎓 Scholar', color: COLORS.DARK_BLUE, permissions: '0', hoist: true }
];

const CATEGORIES = [
    {
        name: '📢 INFORMATION',
        channels: [
            { name: '📖-welcome', type: 0, topic: 'Welcome to Tafsir Kurd! Start here.' },
            { name: '📜-rules', type: 0, topic: 'Server rules and guidelines' },
            { name: '📰-announcements', type: 0, topic: 'Platform updates and announcements' },
            { name: '❓-faq', type: 0, topic: 'Frequently asked questions' }
        ]
    },
    {
        name: '🕌 QURAN & LEARNING',
        channels: [
            { name: '💬-general-chat', type: 0, topic: 'General Islamic discussions and community chat' },
            { name: '📚-quran-discussion', type: 0, topic: 'Discuss Quran verses, meanings, and reflections' },
            { name: '🎓-tafsir-study', type: 0, topic: 'Deep dive into Tafsir and interpretations' },
            { name: '🎯-daily-goals', type: 0, topic: 'Share and track your daily reading goals' },
            { name: '🏆-achievements', type: 0, topic: 'Celebrate Quran completions and milestones' }
        ]
    },
    {
        name: '💻 PLATFORM SUPPORT',
        channels: [
            { name: '🆘-support', type: 0, topic: 'Get help with technical issues and account problems' },
            { name: '💡-feature-requests', type: 0, topic: 'Suggest new features for the platform' },
            { name: '🐛-bug-reports', type: 0, topic: 'Report bugs and issues' },
            { name: '📱-mobile-help', type: 0, topic: 'Mobile app support and help' }
        ]
    },
    {
        name: '🌍 COMMUNITY',
        channels: [
            { name: '🗣️-kurdish-chat', type: 0, topic: 'Chat in Kurdish (Badini/Sorani)' },
            { name: '🌐-english-chat', type: 0, topic: 'English discussions and international community' },
            { name: '📸-media-share', type: 0, topic: 'Share Islamic content, calligraphy, and beautiful recitations' },
            { name: '🤲-dua-requests', type: 0, topic: 'Request prayers and share blessings' }
        ]
    },
    {
        name: '🎤 VOICE CHANNELS',
        channels: [
            { name: '🎙️ Quran Recitation', type: 2, topic: 'Practice and listen to Quran recitation' },
            { name: '💬 General Voice', type: 2, topic: 'Casual voice chat and community hangout' },
            { name: '📖 Study Group', type: 2, topic: 'Group study sessions and Q&A' },
            { name: '🔇 AFK Room', type: 2, topic: 'Away from keyboard' }
        ]
    },
    {
        name: '👨‍💼 ADMIN',
        channels: [
            { name: '🤖-bot-commands', type: 0, topic: 'Test bot commands (Admin only)' },
            { name: '📊-analytics', type: 0, topic: 'Platform statistics and metrics' },
            { name: '⚙️-admin-chat', type: 0, topic: 'Admin team discussions' },
            { name: '📝-admin-logs', type: 0, topic: 'Bot notifications and audit logs' }
        ]
    }
];

// Helper function to make Discord API requests
function discordRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : null;

        const options = {
            hostname: 'discord.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body || '{}'));
                    } catch (e) {
                        resolve({});
                    }
                } else {
                    console.error(`API Error: ${res.statusCode} - ${body}`);
                    reject(new Error(`Discord API error: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// Sleep function for rate limiting
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Create roles
async function createRoles() {
    console.log('\n🎨 Creating roles...');
    const createdRoles = [];

    for (const role of ROLES) {
        try {
            console.log(`   Creating role: ${role.name}`);
            const result = await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/roles`, {
                name: role.name,
                color: role.color,
                permissions: role.permissions,
                hoist: role.hoist,
                mentionable: false
            });
            createdRoles.push(result);
            console.log(`   ✅ Created: ${role.name}`);
            await sleep(500); // Rate limiting
        } catch (error) {
            console.error(`   ❌ Failed to create role ${role.name}:`, error.message);
        }
    }

    return createdRoles;
}

// Create categories and channels
async function createChannels() {
    console.log('\n📁 Creating categories and channels...');

    for (const category of CATEGORIES) {
        try {
            // Create category
            console.log(`\n   Creating category: ${category.name}`);
            const categoryResult = await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, {
                name: category.name,
                type: 4, // Category type
                position: CATEGORIES.indexOf(category)
            });
            console.log(`   ✅ Created category: ${category.name}`);
            await sleep(500);

            // Create channels in category
            for (const channel of category.channels) {
                try {
                    console.log(`      Creating channel: ${channel.name}`);
                    const channelData = {
                        name: channel.name,
                        type: channel.type, // 0 = text, 2 = voice
                        parent_id: categoryResult.id
                    };

                    // Only add topic for text channels (voice channels don't support topic)
                    if (channel.type === 0) {
                        channelData.topic = channel.topic;
                    }

                    await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, channelData);
                    console.log(`      ✅ Created: ${channel.name}`);
                    await sleep(500);
                } catch (error) {
                    console.error(`      ❌ Failed to create channel ${channel.name}:`, error.message);
                }
            }
        } catch (error) {
            console.error(`   ❌ Failed to create category ${category.name}:`, error.message);
        }
    }
}

// Main setup function
async function setupServer() {
    console.log('🚀 Starting Discord Server Setup for Tafsir Kurd...');
    console.log(`   Server ID: ${GUILD_ID}`);

    try {
        // Create roles
        await createRoles();

        // Wait a bit before creating channels
        console.log('\n⏳ Waiting 2 seconds before creating channels...');
        await sleep(2000);

        // Create categories and channels
        await createChannels();

        console.log('\n\n✅ ========================================');
        console.log('🎉 SERVER SETUP COMPLETE!');
        console.log('========================================\n');
        console.log('Your Discord server has been set up with:');
        console.log(`   ✅ ${ROLES.length} roles`);
        console.log(`   ✅ ${CATEGORIES.length} categories`);
        console.log(`   ✅ ${CATEGORIES.reduce((sum, cat) => sum + cat.channels.length, 0)} channels`);
        console.log('\n📝 Next Steps:');
        console.log('   1. Go to your Discord server');
        console.log('   2. Customize channel permissions as needed');
        console.log('   3. Add welcome messages and rules');
        console.log('   4. Set up reaction roles (use a bot like MEE6)');
        console.log('   5. Invite your community!');
        console.log('\n📖 See DISCORD_SERVER_SETUP.md for content templates\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup
setupServer();
