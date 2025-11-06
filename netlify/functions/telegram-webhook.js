const https = require('https');

exports.handler = async (event, context) => {
    // Handle webhook from Telegram
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 200,
            body: 'OK'
        };
    }

    try {
        const update = JSON.parse(event.body);

        // Get bot token from environment
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

        if (!TELEGRAM_BOT_TOKEN) {
            console.error('Missing TELEGRAM_BOT_TOKEN');
            return { statusCode: 200, body: 'OK' };
        }

        // Check if this is a message with text
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.toLowerCase().trim();

            let replyMessage = '';

            // Handle commands
            if (text === '/start' || text === '/start/') {
                replyMessage = `🤖 *Welcome to Tafsir Kurd Admin Bot\\!*

I'm your personal notification assistant\\.

You'll receive instant alerts about:
✅ New users joining the platform
📍 Readers from Duhok and Kurdish regions
📧 New contact messages
🏆 Quran completion achievements
📊 Daily activity summaries

🔐 *Secure & Private*
Only you receive these notifications\\.

📱 *Commands:*
/status \\- Check notification status
/help \\- Show this help message

🌐 Visit: [tafsirkurd\\.com](https://tafsirkurd.com)`;
            }
            else if (text === '/help') {
                replyMessage = `📖 *Tafsir Kurd Admin Bot Help*

*Available Commands:*
/start \\- Welcome message
/status \\- Check notification status
/help \\- Show this help

*What you'll receive:*
🎉 New user registrations
📍 Users from Duhok/Kurdish regions
📧 New contact messages
🏆 Quran completions
📊 Platform activity

*Setup:*
Enable notifications in the admin panel:
https://tafsirkurd\\.com/admin

*Support:*
Contact: @Saman26D`;
            }
            else if (text === '/status') {
                replyMessage = `📊 *Bot Status*

✅ *Active* \\- Bot is running
🔔 *Notifications* \\- Enabled
🔐 *Connection* \\- Secure

Your admin bot is ready to send notifications\\.

Make sure notifications are enabled in the admin panel:
https://tafsirkurd\\.com/admin

Last checked: ${new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Baghdad',
    dateStyle: 'short',
    timeStyle: 'short'
})} \\(Iraq Time\\)`;
            }
            else {
                // Unknown command
                replyMessage = `ℹ️ *Unknown command*

Available commands:
/start \\- Get started
/status \\- Check status
/help \\- Show help

Type /help for more information\\.`;
            }

            // Send reply
            await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, replyMessage);
        }

        return {
            statusCode: 200,
            body: 'OK'
        };

    } catch (error) {
        console.error('Webhook error:', error);
        return {
            statusCode: 200,
            body: 'OK'
        };
    }
};

function sendTelegramMessage(botToken, chatId, message) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'MarkdownV2',
            disable_web_page_preview: true
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
                    reject(new Error(`Failed to parse response: ${error.message}`));
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
