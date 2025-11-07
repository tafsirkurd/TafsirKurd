const https = require('https');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { type, title, message, details, data } = JSON.parse(event.body);

        // Get Telegram bot token and chat ID from environment variables
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.error('Missing Telegram credentials');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Telegram not configured' })
            };
        }

        // Build message step by step
        const parts = [];
        parts.push(`🔔 ${title || 'Notification'}`);
        parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        parts.push('');

        if (message) {
            parts.push(message);
            parts.push('');
        }

        if (data) {
            if (data.userName) parts.push(`👤 Name: ${data.userName}`);
            if (data.email) parts.push(`✉️ Email: ${data.email}`);
            if (data.city) parts.push(`📍 City: ${data.city}`);
            if (data.region) parts.push(`🗺️ Region: ${data.region}`);
            if (data.country) parts.push(`🌍 Country: ${data.country}`);
            if (data.location) parts.push(`📌 Location: ${data.location}`);
            if (data.currentSurah) {
                let reading = `📖 Reading: Surah ${data.currentSurah}`;
                if (data.currentAyah) reading += `:${data.currentAyah}`;
                parts.push(reading);
            }
            if (data.totalRead) parts.push(`📚 Ayahs Read: ${data.totalRead}`);
            if (data.completion) parts.push(`📊 Completion: ${data.completion}%`);
            if (data.dailyGoal) parts.push(`🎯 Daily Goal: ${data.dailyGoal}`);
            if (data.ayahsRead && !data.totalRead) parts.push(`📖 Ayahs: ${data.ayahsRead}`);
            if (data.surah && data.ayah && !data.currentSurah) parts.push(`📍 Position: Surah ${data.surah}, Ayah ${data.ayah}`);
        }

        if (details) {
            parts.push('');
            parts.push(details);
        }

        const telegramMessage = parts.join('\n');

        console.log('✉️ Sending message, length:', telegramMessage.length);

        // Check if there's a photo
        let photoUrl = data?.picture || data?.profilePicture;
        if (photoUrl && photoUrl.includes('googleusercontent.com')) {
            photoUrl = photoUrl.replace(/=s\d+-c/, '=s400-c');
        }

        // Send photo if available
        if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
            try {
                await sendPhoto(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, photoUrl);
                console.log('✅ Photo sent');
            } catch (photoError) {
                console.error('❌ Photo failed:', photoError.message);
            }
        }

        // Always send text message
        const result = await sendMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, telegramMessage);
        console.log('✅ Message sent, ID:', result.message_id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Notification sent successfully',
                messageId: result.message_id
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function sendMessage(botToken, chatId, text) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            chat_id: chatId,
            text: text
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.ok) {
                        resolve(response.result);
                    } else {
                        reject(new Error(`Telegram API: ${response.description}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function sendPhoto(botToken, chatId, photoUrl) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            chat_id: chatId,
            photo: photoUrl
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendPhoto`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.ok) {
                        resolve(response.result);
                    } else {
                        reject(new Error(`Photo API: ${response.description}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}
