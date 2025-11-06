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

        // Check if there's a photo to send (use high quality version)
        let photoUrl = data?.picture || data?.profilePicture;

        // For Google profile pictures, request high quality version
        if (photoUrl && photoUrl.includes('googleusercontent.com')) {
            // Replace size parameters for high quality
            photoUrl = photoUrl.replace(/=s\d+-c/, '=s400-c'); // 400x400 high quality
        }

        let result;
        if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
            // Send photo with caption for better visual presentation
            result = await sendTelegramPhoto(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, photoUrl, telegramMessage);
        } else {
            // Send text message only if no photo available
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
        'new_user': '🎉',
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

    // Create a clean, readable message format
    let formattedMessage = `${emoji} *${escapeMarkdown(title)}*\n`;
    formattedMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Main message
    if (message) {
        formattedMessage += `${escapeMarkdown(message)}\n\n`;
    }

    // Add structured data if available
    if (data) {
        // User Information Section
        if (data.userName || data.email) {
            formattedMessage += `👤 *User Information:*\n`;
            if (data.userName) formattedMessage += `• Name: ${escapeMarkdown(data.userName)}\n`;
            if (data.email) formattedMessage += `• Email: ${escapeMarkdown(data.email)}\n`;
            formattedMessage += '\n';
        }

        // Location Section
        if (data.city || data.region || data.country || data.location) {
            formattedMessage += `📍 *Location:*\n`;
            if (data.city && data.city !== 'Unknown') formattedMessage += `• City: ${escapeMarkdown(data.city)}\n`;
            if (data.region && data.region !== 'Unknown') formattedMessage += `• Region: ${escapeMarkdown(data.region)}\n`;
            if (data.country && data.country !== 'Unknown') formattedMessage += `• Country: ${escapeMarkdown(data.country)}\n`;
            if (data.location && !data.city) formattedMessage += `• ${escapeMarkdown(data.location)}\n`;
            formattedMessage += '\n';
        }

        // Reading Progress Section
        if (data.currentSurah || data.currentAyah || data.totalRead !== undefined || data.dailyGoal) {
            formattedMessage += `📖 *Reading Progress:*\n`;
            if (data.currentSurah && data.currentSurah !== 'Not started') {
                formattedMessage += `• Current: ${escapeMarkdown(String(data.currentSurah))}`;
                if (data.currentAyah && data.currentAyah !== '-') {
                    formattedMessage += `:${escapeMarkdown(String(data.currentAyah))}`;
                }
                formattedMessage += '\n';
            }
            if (data.totalRead !== undefined && data.totalRead > 0) {
                formattedMessage += `• Ayahs Read: ${data.totalRead}\n`;
            }
            if (data.completion !== undefined && data.completion > 0) {
                formattedMessage += `• Completion: ${data.completion}%\n`;
            }
            if (data.dailyGoal && data.dailyGoal !== 'Not set') {
                formattedMessage += `• Daily Goal: ${escapeMarkdown(String(data.dailyGoal))}\n`;
            }
            formattedMessage += '\n';
        }

        // Additional data for other notification types
        if (data.ayahsRead) formattedMessage += `📚 Ayahs Read: ${data.ayahsRead}\n`;
        if (data.surah) formattedMessage += `📖 Position: Surah ${data.surah}, Ayah ${data.ayah}\n`;
        if (data.messageContent) formattedMessage += `💬 Message: "${escapeMarkdown(data.messageContent.substring(0, 150))}${data.messageContent.length > 150 ? '...' : ''}"\n`;
        if (data.videoUrl) formattedMessage += `🎥 Video: ${escapeMarkdown(data.videoUrl)}\n`;
    }

    // Details section
    if (details) {
        formattedMessage += `\n_${escapeMarkdown(details)}_\n`;
    }

    // Add timestamp
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Baghdad',
        dateStyle: 'short',
        timeStyle: 'short'
    });
    formattedMessage += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    formattedMessage += `🕐 ${timestamp} \\(Iraq Time\\)`;

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
