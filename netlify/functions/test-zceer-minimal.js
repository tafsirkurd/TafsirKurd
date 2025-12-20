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
        const payload = {
            username: 'Test Zceer',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            content: 'سُبْحَانَ اللّٰهِ - Test from minimal function'
        };

        await sendDiscordWebhook(DISCORD_WEBHOOK_ZCEER, payload);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Test zceer sent successfully' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
