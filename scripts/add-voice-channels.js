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

async function addVoiceChannels() {
    console.log('🎤 Adding missing voice channels...\n');

    try {
        // Get all channels to find the voice category
        const channels = await discordRequest('GET', `/api/v10/guilds/${GUILD_ID}/channels`);
        const voiceCategory = channels.find(ch => ch.name === '🎤 VOICE CHANNELS' && ch.type === 4);

        if (!voiceCategory) {
            console.error('❌ Could not find "🎤 VOICE CHANNELS" category');
            process.exit(1);
        }

        console.log(`✅ Found category: ${voiceCategory.name} (ID: ${voiceCategory.id})\n`);

        const voiceChannels = [
            { name: '🎙️ Quran Recitation' },
            { name: '💬 General Voice' },
            { name: '📖 Study Group' },
            { name: '🔇 AFK Room' }
        ];

        for (const channel of voiceChannels) {
            try {
                console.log(`   Creating: ${channel.name}`);
                await discordRequest('POST', `/api/v10/guilds/${GUILD_ID}/channels`, {
                    name: channel.name,
                    type: 2, // Voice channel
                    parent_id: voiceCategory.id
                });
                console.log(`   ✅ Created: ${channel.name}`);
                await sleep(500);
            } catch (error) {
                console.error(`   ❌ Failed: ${channel.name}`);
            }
        }

        console.log('\n✅ All voice channels created!\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

addVoiceChannels();
