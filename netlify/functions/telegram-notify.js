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
            console.error('Missing Telegram credentials in environment variables');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Telegram not configured' })
            };
        }

        // Format the notification message
        let telegramMessage = formatNotificationMessage(type, title, message, details, data);

        // Check if there's a photo to send
        const photoUrl = data?.picture || data?.profilePicture;

        let result;
        if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
            // Send photo with caption
            result = await sendTelegramPhoto(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, photoUrl, telegramMessage);
        } else {
            // Send text message only
            result = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, telegramMessage);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Notification sent successfully',
                messageId: result.message_id
            })
        };

    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function formatNotificationMessage(type, title, message, details, data) {
    // Emoji mapping for notification types
    const emojiMap = {
        'new_user': '👤',
        'new_message': '📧',
        'new_video': '🎥',
        'quran_complete': '🏆',
        'duhok_user': '📍',
        'milestone': '⭐',
        'daily_summary': '📊',
        'warning': '⚠️',
        'info': 'ℹ️',
        'success': '✅',
        'error': '❌'
    };

    const emoji = emojiMap[type] || '🔔';

    let formattedMessage = `${emoji} *${escapeMarkdown(title)}*\n\n`;
    formattedMessage += `${escapeMarkdown(message)}\n`;

    if (details) {
        formattedMessage += `\n_${escapeMarkdown(details)}_\n`;
    }

    // Add structured data if available
    if (data) {
        formattedMessage += '\n📋 *Full Details:*\n';

        if (data.userName) formattedMessage += `👤 Name: ${escapeMarkdown(data.userName)}\n`;
        if (data.email) formattedMessage += `✉️ Email: ${escapeMarkdown(data.email)}\n`;
        if (data.city) formattedMessage += `🏙️ City: ${escapeMarkdown(data.city)}\n`;
        if (data.region) formattedMessage += `🗺️ Region: ${escapeMarkdown(data.region)}\n`;
        if (data.country) formattedMessage += `🌍 Country: ${escapeMarkdown(data.country)}\n`;
        if (data.location && !data.city) formattedMessage += `📍 Location: ${escapeMarkdown(data.location)}\n`;
        if (data.dailyGoal) formattedMessage += `🎯 Daily Goal: ${escapeMarkdown(String(data.dailyGoal))}\n`;
        if (data.currentSurah) formattedMessage += `📖 Current Surah: ${escapeMarkdown(String(data.currentSurah))}\n`;
        if (data.currentAyah) formattedMessage += `📝 Current Ayah: ${escapeMarkdown(String(data.currentAyah))}\n`;
        if (data.totalRead !== undefined) formattedMessage += `📊 Total Ayahs Read: ${data.totalRead}\n`;
        if (data.completion !== undefined) formattedMessage += `✅ Completion: ${data.completion}%\n`;
        // Don't show picture URL in text if we're sending it as a photo
        if (data.ayahsRead) formattedMessage += `📖 Ayahs Read: ${data.ayahsRead}\n`;
        if (data.surah) formattedMessage += `📚 Current: Surah ${data.surah}, Ayah ${data.ayah}\n`;
        if (data.messageContent) formattedMessage += `💬 Message: "${escapeMarkdown(data.messageContent.substring(0, 150))}${data.messageContent.length > 150 ? '...' : ''}"\n`;
        if (data.videoUrl) formattedMessage += `🎥 Video URL: ${escapeMarkdown(data.videoUrl)}\n`;
        if (data.position) formattedMessage += `#️⃣ Position: ${data.position}\n`;
    }

    // Add timestamp
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Baghdad',
        dateStyle: 'short',
        timeStyle: 'short'
    });
    formattedMessage += `\n🕐 ${timestamp} (Iraq Time)`;

    return formattedMessage;
}

function escapeMarkdown(text) {
    if (!text) return '';
    return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function sendTelegramMessage(botToken, chatId, message) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'MarkdownV2'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.ok) {
                        resolve(response.result);
                    } else {
                        reject(new Error(`Telegram API error: ${response.description}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Telegram response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

function sendTelegramPhoto(botToken, chatId, photoUrl, caption) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: chatId,
            photo: photoUrl,
            caption: caption,
            parse_mode: 'MarkdownV2'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendPhoto`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.ok) {
                        resolve(response.result);
                    } else {
                        // If photo fails, fallback to text message
                        console.error('Photo send failed, falling back to text:', response.description);
                        sendTelegramMessage(botToken, chatId, caption)
                            .then(resolve)
                            .catch(reject);
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Telegram response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}
