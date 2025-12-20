// Scheduled function to send random Islamic zceer/dhikr to Discord
// Runs 3 times daily: 8 AM, 2 PM, 8 PM Iraq time (5 AM, 11 AM, 5 PM UTC)
// Environment variable DISCORD_WEBHOOK_ZCEER configured in Netlify

const https = require('https');
const path = require('path');
const fs = require('fs');

// Large Zceer Collection (266 Arabic dhikr and duas)
// Loaded from external JSON file to reduce function size
const zceerPath = path.join(__dirname, 'zceer-collection.json');
const ZCEER_COLLECTION = JSON.parse(fs.readFileSync(zceerPath, 'utf8'));

// Send to Discord webhook using https module
function sendDiscordWebhook(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const url = new URL(webhookUrl);
        const data = JSON.stringify(payload);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode === 204 || res.statusCode === 200) {
                    resolve({ success: true, statusCode: res.statusCode });
                } else {
                    reject(new Error(`Discord API error: ${res.statusCode} - ${responseData}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Main scheduled function handler
exports.handler = async (event, context) => {
    console.log('🕐 Running scheduled zceer job...');

    const DISCORD_WEBHOOK_ZCEER = process.env.DISCORD_WEBHOOK_ZCEER;

    if (!DISCORD_WEBHOOK_ZCEER) {
        console.error('❌ DISCORD_WEBHOOK_ZCEER environment variable not set');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Discord webhook not configured' })
        };
    }

    try {
        // Pick one random zceer from collection
        const randomIndex = Math.floor(Math.random() * ZCEER_COLLECTION.length);
        const zceer = ZCEER_COLLECTION[randomIndex];

        const payload = {
            username: 'Zceer',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            content: zceer
        };

        console.log(`📿 Sending zceer #${randomIndex + 1} of ${ZCEER_COLLECTION.length}...`);

        await sendDiscordWebhook(DISCORD_WEBHOOK_ZCEER, payload);

        console.log('✅ Zceer sent successfully');

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                zceer: zceer,
                index: randomIndex + 1,
                total: ZCEER_COLLECTION.length
            })
        };
    } catch (error) {
        console.error('❌ Error sending zceer:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
