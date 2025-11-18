// Scheduled function to send weekly Quran reminders via email
// Runs every Friday at 8 PM Iraq time (17:00 UTC)
// Environment variable BREVO_API_KEY configured in Netlify

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://gijupzejtbpifjzwadee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

exports.handler = async (event, context) => {
    console.log('🕐 Running weekly reminder job (Friday)...');

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Get all users
        const { data: users, error } = await supabase
            .from('user_data')
            .select('*');

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        console.log(`📊 Found ${users.length} total users`);

        const today = new Date().toDateString();
        let sentCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            try {
                const userData = user.data || {};
                const email = userData.email || userData.userEmail;
                const userName = userData.full_name || userData.userName || 'Reader';
                const stats = userData.stats || {};
                const lastReadDate = userData.lastReadDate;

                // Check if user has email
                if (!email || !email.includes('@')) {
                    skippedCount++;
                    continue;
                }

                // Check if user has notifications enabled
                const notificationSettings = userData.notificationSettings || {};
                if (notificationSettings.enabled === false) {
                    console.log(`⏭️  Skipping ${email} - notifications disabled`);
                    skippedCount++;
                    continue;
                }

                // Check if user already read today
                const lastRead = lastReadDate ? new Date(lastReadDate).toDateString() : null;
                if (lastRead === today) {
                    console.log(`✅ Skipping ${email} - already read today`);
                    skippedCount++;
                    continue;
                }

                // User hasn't read today - send reminder!
                const streak = stats.streak || 0;
                const dayCount = stats.daysActive || 1;

                await sendDailyReminderEmail(email, userName, streak, dayCount);
                sentCount++;
                console.log(`📧 Sent reminder to ${email}`);

                // Small delay to avoid rate limiting
                await sleep(100);

            } catch (userError) {
                console.error(`Error processing user ${user.user_id}:`, userError);
            }
        }

        console.log(`✅ Job complete: ${sentCount} emails sent, ${skippedCount} skipped`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                sent: sentCount,
                skipped: skippedCount,
                total: users.length
            })
        };

    } catch (error) {
        console.error('❌ Job failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};

async function sendDailyReminderEmail(email, userName, streak, dayCount) {
    const messages = [
        `خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە`,
        `بیرئینانە: تەنانەت ئایەتەکێ تە نزیک دکەت ژ خودێ. ئێستا بەردەوام بە`,
        `بەردەوامیی عیبادەتە — قورئانا خوە ڤەکە و پێشڤەچوونا خوە بەردەوام بکە`,
        `هەفتەیەکا نوێ، هەولێکا نوێ — ئایەتەک یان دوو بخوینە و بەرکەتدار بە`,
        `قورئان چارەسەرا دڵ و گیانە — هێشتا نەچوی دەر، دەستپێک و بخوینە`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];

    const emojis = ['🌙', '📖', '✨', '🕌', '💫', '🌟', '🌿', '💚', '☪️', '🤲'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    const htmlContent = getEmailTemplate(message, userName, streak, dayCount, randomEmoji);

    const emailData = {
        sender: {
            name: "TafsirKurd",
            email: "noreply@tafsirkurd.com"
        },
        to: [
            {
                email: email,
                name: userName
            }
        ],
        subject: `بیرئینانا هەفتانە ${randomEmoji}`,
        htmlContent: htmlContent
    };

    return sendBrevoEmail(emailData);
}

function getEmailTemplate(message, userName, streak, dayCount, emoji) {
    const streakSection = streak > 0
        ? `<p style="text-align:center;font-size:16px;color:#666;font-family:'IBM Plex Sans Arabic',-apple-system,sans-serif;margin:20px 0;">تو د رۆژا <strong style="color:#000000;font-size:24px;font-family:'IBM Plex Sans Arabic',-apple-system,sans-serif;">${dayCount}</strong> یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>`
        : '';

    return `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>بیرئینانا هەفتانە</title>
</head>
<body style="margin:0;padding:0;font-family:'IBM Plex Sans Arabic',sans-serif;background:#fafafa">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
<tr><td style="padding:30px 20px;text-align:center">
<h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#000000;font-family:'IBM Plex Sans Arabic',sans-serif">تەفسیرکورد</h1>
<div style="height:2px;background:linear-gradient(90deg,transparent,#000000,transparent);width:100px;margin:0 auto"></div>
</td></tr>
<tr><td style="padding:0 20px;text-align:center">
<div style="font-size:42px;margin:15px 0">${emoji}</div>
<h2 style="margin:10px 0 20px;font-size:20px;font-weight:600;color:#333;font-family:'IBM Plex Sans Arabic',sans-serif">بیرئینانا هەفتانە</h2>
<p style="margin:0 0 20px;font-size:17px;line-height:1.6;color:#555;font-family:'IBM Plex Sans Arabic',sans-serif">${message}</p>
${streakSection}
</td></tr>
<tr><td style="padding:20px;text-align:center">
<a href="https://tafsirkurd.com/quran" style="display:inline-block;background:#000000;color:#fff;padding:14px 35px;text-decoration:none;border-radius:25px;font-weight:600;font-size:15px;font-family:'IBM Plex Sans Arabic',sans-serif">بخوینە</a>
</td></tr>
<tr><td style="padding:20px;text-align:center;border-top:1px solid #eee;font-size:13px;color:#999;font-family:'IBM Plex Sans Arabic',sans-serif">
<p style="margin:0 0 5px;color:#000000;font-weight:600">2025 تەفسیرکورد</p>
<p style="margin:0"><a href="https://tafsirkurd.com/settings" style="color:#999;text-decoration:none">رێکخستنان بگۆڕە</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function sendBrevoEmail(emailData) {
    return new Promise((resolve, reject) => {
        let data;
        try {
            data = JSON.stringify(emailData);
        } catch (error) {
            console.error('❌ Failed to stringify email data:', error);
            return reject(new Error(`JSON stringify failed: ${error.message}`));
        }

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
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

                    if (res.statusCode === 201) {
                        resolve(response);
                    } else {
                        reject(new Error(`Brevo API error: ${response.message || body}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse Brevo response: ${error.message}`));
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
