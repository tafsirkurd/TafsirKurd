// Minimal test function with Discord webhook
const https = require('https');

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

const ZCEER_COLLECTION = [
    'سُبْحَانَ اللّٰهِ',
    'الْحَمْدُ لِلّٰهِ',
    'لَا إِلٰهَ إِلَّا اللّٰهُ',
    'اللّٰهُ أَكْبَرُ',
    'أَسْتَغْفِرُ اللّٰهَ'
];

exports.handler = async (event, context) => {
    console.log('Test function called');

    const DISCORD_WEBHOOK_ZCEER = process.env.DISCORD_WEBHOOK_ZCEER;

    if (!DISCORD_WEBHOOK_ZCEER) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook not configured' })
        };
    }

    try {
        const randomIndex = Math.floor(Math.random() * ZCEER_COLLECTION.length);
        const zceer = ZCEER_COLLECTION[randomIndex];

        const payload = {
            username: 'Zceer',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            content: zceer
        };

        await sendDiscordWebhook(DISCORD_WEBHOOK_ZCEER, payload);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Zceer sent successfully',
                zceer: zceer,
                index: randomIndex + 1,
                total: ZCEER_COLLECTION.length
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
