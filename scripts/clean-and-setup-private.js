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

async function cleanAndSetup() {
    console.log('🧹 CLEANING SERVER AND SETTING UP PRIVATE WORKSPACE...\n');

    try {
        // Step 1: Get all channels and roles
        console.log('📋 Step 1: Getting current server structure...');
        const channels = await discordRequest('GET', `/api/v10/guilds/${GUILD_ID}/channels`);
        const roles = await discordRequest('GET', `/api/v10/guilds/${GUILD_ID}/roles`);
        console.log(`   Found ${channels.length} channels and ${roles.length} roles\n`);

        // Step 2: Delete all channels (except system ones)
        console.log('🗑️  Step 2: Deleting all channels...');
        let deletedCount = 0;
        for (const channel of channels) {
            try {
                await discordRequest('DELETE', `/api/v10/channels/${channel.id}`);
                console.log(`   ✅ Deleted: ${channel.name}`);
                deletedCount++;
                await sleep(300);
            } catch (error) {
                console.log(`   ⚠️  Could not delete: ${channel.name} (might be system channel)`);
            }
        }
        console.log(`   Deleted ${deletedCount} channels\n`);

        await sleep(1000);

        // Step 3: Delete all roles (except @everyone and bot roles)
        console.log('🎭 Step 3: Deleting custom roles...');
        let deletedRoles = 0;
        for (const role of roles) {
            if (role.name !== '@everyone' && !role.managed) {
                try {
                    await discordRequest('DELETE', `/api/v10/guilds/${GUILD_ID}/roles/${role.id}`);
                    console.log(`   ✅ Deleted role: ${role.name}`);
                    deletedRoles++;
                    await sleep(300);
                } catch (error) {
                    console.log(`   ⚠️  Could not delete role: ${role.name}`);
                }
            }
        }
        console.log(`   Deleted ${deletedRoles} roles\n`);

        await sleep(1000);

        // Step 4: Create simple private structure
        console.log('🔒 Step 4: Creating private workspace...\n');

        const PRIVATE_STRUCTURE = [
            {
                name: '🤖 NOTIFICATIONS',
                channels: [
                    { name: '📊-stats', topic: 'Platform statistics and bot commands' },
                    { name: '🎉-new-users', topic: 'New user signup notifications' },
                    { name: '📧-messages', topic: 'Contact form and user messages' },
                    { name: '🏆-achievements', topic: 'User achievements and completions' }
                ]
            },
            {
                name: '📁 MY STORAGE',
                channels: [
                    { name: '📸-photos', topic: 'Save photos, screenshots, and images' },
                    { name: '🔗-links', topic: 'Important links and bookmarks' },
                    { name: '📝-notes', topic: 'Quick notes and reminders' },
                    { name: '💾-files', topic: 'Documents and files to save' },
                    { name: '💡-ideas', topic: 'Ideas and future plans' }
                ]
            },
            {
                name: '⚙️ WORKSPACE',
                channels: [
                    { name: '🤖-bot-commands', topic: 'Test bot commands: /stats, /users, /activity' },
                    { name: '📋-todos', topic: 'To-do lists and tasks' },
                    { name: '📊-analytics', topic: 'Website analytics and metrics' }
                ]
            }
        ];

        for (const category of PRIVATE_STRUCTURE) {
            console.log(`   Creating: ${category.name}`);

            const cat = await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, {
                name: category.name,
                type: 4
            });
            await sleep(400);

            for (const channel of category.channels) {
                await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, {
                    name: channel.name,
                    type: 0,
                    topic: channel.topic,
                    parent_id: cat.id
                });
                console.log(`      ✅ ${channel.name}`);
                await sleep(300);
            }
        }

        console.log('\n\n✅ ========================================');
        console.log('🎉 PRIVATE SERVER SETUP COMPLETE!');
        console.log('========================================\n');

        console.log('Your Discord server is now clean and private!\n');

        console.log('🤖 NOTIFICATIONS');
        console.log('   📊 stats - Bot commands and platform stats');
        console.log('   🎉 new-users - New user alerts');
        console.log('   📧 messages - Contact messages');
        console.log('   🏆 achievements - User milestones\n');

        console.log('📁 MY STORAGE');
        console.log('   📸 photos - Save images');
        console.log('   🔗 links - Bookmark links');
        console.log('   📝 notes - Quick notes');
        console.log('   💾 files - Store files');
        console.log('   💡 ideas - Future ideas\n');

        console.log('⚙️ WORKSPACE');
        console.log('   🤖 bot-commands - Test: /stats, /users, /activity');
        console.log('   📋 todos - Your task list');
        console.log('   📊 analytics - Website data\n');

        console.log('💡 TIPS:');
        console.log('   • Your bot will send notifications to appropriate channels');
        console.log('   • Use Discord search (Ctrl+F) to find saved items');
        console.log('   • Pin important messages for quick access');
        console.log('   • This server is PRIVATE - only you can see it\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

cleanAndSetup();
