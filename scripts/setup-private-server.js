const https = require('https');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN || !GUILD_ID) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

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
        if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(body || '{}')); }
                    catch (e) { resolve({}); }
                } else {
                    reject(new Error(`Discord API error: ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupServer() {
    console.log('🧹 Cleaning up server for private use...\n');

    try {
        // Get all channels
        const channels = await discordRequest('GET', `/api/v10/guilds/${GUILD_ID}/channels`);

        console.log('🗑️  Deleting old channels...');
        for (const channel of channels) {
            if (!channel.name.includes('general') && !channel.name.includes('text')) {
                try {
                    await discordRequest('DELETE', `/api/v10/channels/${channel.id}`);
                    console.log(`   ✅ Deleted: ${channel.name}`);
                    await sleep(300);
                } catch (error) {
                    console.log(`   ⚠️  Could not delete: ${channel.name}`);
                }
            }
        }

        console.log('\n✅ Cleanup complete!\n');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function setupPrivateServer() {
    console.log('🔒 Setting up PRIVATE Personal Server...\n');

    try {
        // Simple private structure
        const PRIVATE_STRUCTURE = [
            {
                name: '🤖 BOT NOTIFICATIONS',
                channels: [
                    { name: '📊-platform-stats', topic: 'Platform statistics and analytics' },
                    { name: '🎉-new-users', topic: 'New user signup notifications' },
                    { name: '📧-contact-messages', topic: 'Contact form submissions' },
                    { name: '🏆-user-achievements', topic: 'User completions and milestones' }
                ]
            },
            {
                name: '📁 PERSONAL STORAGE',
                channels: [
                    { name: '📸-photos', topic: 'Save photos and images' },
                    { name: '🔗-links', topic: 'Save important links and URLs' },
                    { name: '📝-notes', topic: 'Personal notes and reminders' },
                    { name: '💾-files', topic: 'Documents and files' },
                    { name: '💡-ideas', topic: 'Ideas and future plans' }
                ]
            },
            {
                name: '⚙️ ADMIN WORKSPACE',
                channels: [
                    { name: '🤖-bot-testing', topic: 'Test bot commands' },
                    { name: '📋-todo-list', topic: 'Tasks and to-do items' },
                    { name: '📊-analytics', topic: 'Website analytics and data' }
                ]
            }
        ];

        // Create categories and channels
        for (const category of PRIVATE_STRUCTURE) {
            console.log(`\n📁 Creating: ${category.name}`);

            const cat = await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, {
                name: category.name,
                type: 4
            });
            console.log(`   ✅ Category created`);
            await sleep(500);

            for (const channel of category.channels) {
                await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, {
                    name: channel.name,
                    type: 0,
                    topic: channel.topic,
                    parent_id: cat.id
                });
                console.log(`   ✅ ${channel.name}`);
                await sleep(400);
            }
        }

        console.log('\n\n✅ ========================================');
        console.log('🎉 PRIVATE SERVER READY!');
        console.log('========================================\n');

        console.log('📁 Your server now has:\n');
        console.log('🤖 BOT NOTIFICATIONS');
        console.log('   • New user alerts');
        console.log('   • Contact messages');
        console.log('   • User achievements');
        console.log('   • Platform stats\n');

        console.log('📁 PERSONAL STORAGE');
        console.log('   • Photos & images');
        console.log('   • Links & URLs');
        console.log('   • Notes & reminders');
        console.log('   • Files & documents');
        console.log('   • Ideas for future\n');

        console.log('⚙️ ADMIN WORKSPACE');
        console.log('   • Bot command testing');
        console.log('   • To-do lists');
        console.log('   • Analytics\n');

        console.log('💡 TIP: Use Discord search to find saved items quickly!\n');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

setupPrivateServer();
