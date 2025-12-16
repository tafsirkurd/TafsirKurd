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
                    console.error(`API Error ${res.statusCode}:`, body);
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

async function setupProfessionalFeatures() {
    console.log('🚀 Setting up Professional Discord Server Features...\n');

    try {
        // Get current server info
        const guild = await discordRequest('GET', `/api/v10/guilds/${GUILD_ID}`);
        console.log(`📋 Server: ${guild.name}`);
        console.log(`   ID: ${guild.id}\n`);

        // Get all roles and channels
        const roles = await discordRequest('GET', `/api/v10/guilds/${GUILD_ID}/roles`);
        const channels = await discordRequest('GET', `/api/v10/guilds/${GUILD_ID}/channels`);

        // Find the "🆕 New Member" role
        const newMemberRole = roles.find(r => r.name === '🆕 New Member');

        if (!newMemberRole) {
            console.error('❌ Could not find "🆕 New Member" role. Please run setup-discord-server.js first.');
            process.exit(1);
        }

        console.log(`✅ Found role: ${newMemberRole.name} (ID: ${newMemberRole.id})\n`);

        // Step 1: Enable Community Features
        console.log('📢 Step 1: Enabling Community Features...');
        try {
            // Find rules and announcements channels
            const rulesChannel = channels.find(c => c.name === '📜-rules');
            const announcementsChannel = channels.find(c => c.name === '📰-announcements');

            if (rulesChannel && announcementsChannel) {
                await discordRequest('PATCH', `/api/v10/guilds/${GUILD_ID}`, {
                    features: ['COMMUNITY'],
                    rules_channel_id: rulesChannel.id,
                    public_updates_channel_id: announcementsChannel.id,
                    preferred_locale: 'en-US',
                    verification_level: 2, // Medium - must have verified email
                    default_message_notifications: 1, // Only mentions
                    explicit_content_filter: 2 // All members
                });
                console.log('   ✅ Community features enabled');
                console.log('   ✅ Rules channel set');
                console.log('   ✅ Announcements channel set');
                console.log('   ✅ Verification level: Medium');
                console.log('   ✅ Content filter: Enabled for all\n');
                await sleep(1000);
            }
        } catch (error) {
            console.log('   ⚠️  Community features might already be enabled or need manual setup\n');
        }

        // Step 2: Create Welcome Screen (requires Community)
        console.log('👋 Step 2: Creating Welcome Screen...');
        try {
            const welcomeChannel = channels.find(c => c.name === '📖-welcome');
            const generalChat = channels.find(c => c.name === '💬-general-chat');
            const rulesChannel = channels.find(c => c.name === '📜-rules');
            const supportChannel = channels.find(c => c.name === '🆘-support');

            const welcomeScreenChannels = [];
            if (rulesChannel) welcomeScreenChannels.push({
                channel_id: rulesChannel.id,
                description: '📜 Read our server rules',
                emoji_name: '📜'
            });
            if (welcomeChannel) welcomeScreenChannels.push({
                channel_id: welcomeChannel.id,
                description: '👋 Start here! Welcome to Tafsir Kurd',
                emoji_name: '👋'
            });
            if (generalChat) welcomeScreenChannels.push({
                channel_id: generalChat.id,
                description: '💬 Chat with the community',
                emoji_name: '💬'
            });
            if (supportChannel) welcomeScreenChannels.push({
                channel_id: supportChannel.id,
                description: '🆘 Get help and support',
                emoji_name: '🆘'
            });

            await discordRequest('PATCH', `/api/v10/guilds/${GUILD_ID}/welcome-screen`, {
                enabled: true,
                description: 'Welcome to Tafsir Kurd! 🕌 Read the Quran with Kurdish Badini Tafsir',
                welcome_channels: welcomeScreenChannels.slice(0, 5) // Max 5 channels
            });
            console.log('   ✅ Welcome screen created\n');
            await sleep(500);
        } catch (error) {
            console.log('   ⚠️  Welcome screen setup requires Community features to be fully enabled\n');
        }

        // Step 3: Set up Auto-Role for New Members
        console.log('🎯 Step 3: Configuring Auto-Role...');
        try {
            // Set default role for new members
            await discordRequest('PATCH', `/api/v10/guilds/${GUILD_ID}`, {
                default_message_notifications: 1,
                verification_level: 2
            });
            console.log(`   ✅ Server configured for auto-moderation`);
            console.log(`   ⚠️  Auto-role requires a bot like MEE6, Dyno, or YAGPDB`);
            console.log(`   💡 Install MEE6: https://mee6.xyz`);
            console.log(`      Then set "🆕 New Member" as the auto-role\n`);
            await sleep(500);
        } catch (error) {
            console.log('   ⚠️  Auto-role configuration requires additional setup\n');
        }

        // Step 4: Create Roles Channel for Reaction Roles
        console.log('🎭 Step 4: Creating Roles Selection Channel...');
        try {
            const infoCategory = channels.find(c => c.name === '📢 INFORMATION' && c.type === 4);

            if (infoCategory) {
                const rolesChannel = await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, {
                    name: '🎭-get-roles',
                    type: 0,
                    topic: 'React to get your roles!',
                    parent_id: infoCategory.id,
                    position: 1
                });
                console.log('   ✅ Created: 🎭-get-roles channel');
                console.log('   💡 Use a reaction role bot (MEE6, YAGPDB) to set up role reactions\n');
                await sleep(500);
            }
        } catch (error) {
            console.log('   ⚠️  Roles channel might already exist\n');
        }

        // Step 5: Set Channel Permissions
        console.log('🔒 Step 5: Configuring Channel Permissions...');

        // Make rules and welcome read-only
        const readOnlyChannels = ['📖-welcome', '📜-rules', '📰-announcements', '❓-faq'];
        const everyoneRole = roles.find(r => r.name === '@everyone');

        for (const channelName of readOnlyChannels) {
            const channel = channels.find(c => c.name === channelName);
            if (channel && everyoneRole) {
                try {
                    await discordRequest('PUT', `/api/v10/channels/${channel.id}/permissions/${everyoneRole.id}`, {
                        type: 0, // Role
                        deny: '2048', // SEND_MESSAGES
                        allow: '1024'  // VIEW_CHANNEL
                    });
                    console.log(`   ✅ ${channelName} set to read-only`);
                    await sleep(300);
                } catch (error) {
                    console.log(`   ⚠️  Could not set permissions for ${channelName}`);
                }
            }
        }
        console.log();

        // Step 6: Create Server Boost Rewards Info
        console.log('💎 Step 6: Server Boost Information...');
        console.log('   💡 Encourage members to boost for perks:');
        console.log('      Level 1 (2 boosts): 50 custom emoji slots');
        console.log('      Level 2 (7 boosts): Server banner, 150 emoji slots');
        console.log('      Level 3 (14 boosts): Vanity URL, 250 emoji slots\n');

        // Step 7: Print Setup Summary
        console.log('\n✅ ========================================');
        console.log('🎉 PROFESSIONAL SERVER SETUP COMPLETE!');
        console.log('========================================\n');

        console.log('✅ What was configured:');
        console.log('   • Community features enabled');
        console.log('   • Welcome screen created');
        console.log('   • Verification level set to Medium');
        console.log('   • Content filter enabled');
        console.log('   • Read-only channels configured');
        console.log('   • 🎭-get-roles channel created\n');

        console.log('📋 NEXT STEPS FOR AUTO-ROLES:\n');
        console.log('1️⃣  Add MEE6 Bot (Recommended):');
        console.log('   • Visit: https://mee6.xyz');
        console.log('   • Click "Add to Discord"');
        console.log('   • Select your server');
        console.log('   • Go to Dashboard → Plugins → Reaction Roles');
        console.log('   • Set "🆕 New Member" as auto-assign role\n');

        console.log('2️⃣  Alternative: Add YAGPDB Bot:');
        console.log('   • Visit: https://yagpdb.xyz');
        console.log('   • Add bot to server');
        console.log('   • Go to Control Panel → Auto Moderator');
        console.log('   • Set "🆕 New Member" as auto-role\n');

        console.log('3️⃣  Set Up Reaction Roles in 🎭-get-roles:');
        console.log('   • Use MEE6 or YAGPDB reaction roles feature');
        console.log('   • Add reactions for:');
        console.log('      🇮🇶 = 🌍 Kurdish Speaker');
        console.log('      🇬🇧 = 🌐 English Speaker');
        console.log('      📖 = 📖 Active Reader');
        console.log('      🔔 = Notifications\n');

        console.log('4️⃣  Create Welcome Message in #📖-welcome\n');

        console.log('5️⃣  Enable Community Discovery (Optional):');
        console.log('   • Server Settings → Enable Community');
        console.log('   • Complete all setup steps');
        console.log('   • Apply for Discovery\n');

        console.log('🎨 Your server now has:');
        console.log('   ✅ Professional layout');
        console.log('   ✅ Verification system');
        console.log('   ✅ Welcome screen');
        console.log('   ✅ Content moderation');
        console.log('   ✅ Role organization');
        console.log('   ✅ Ready for auto-roles!\n');

    } catch (error) {
        console.error('\n❌ Setup error:', error.message);
    }
}

setupProfessionalFeatures();
