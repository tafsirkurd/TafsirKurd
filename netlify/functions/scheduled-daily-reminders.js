// Scheduled function to send daily Quran reminders via email
// Runs daily at 8 PM Iraq time (17:00 UTC)
// Environment variable BREVO_API_KEY configured in Netlify

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://gijupzejtbpifjzwadee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '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';

exports.handler = async (event, context) => {
    console.log('🕐 Running daily reminder job...');

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
        `Your streak is glowing — don't let it fade. Read just one ayah today 🌸.`,
        `Reminder: even one verse brings you closer to Allah. Continue your streak now.`,
        `Consistency is worship — open your Qur'an and continue your progress 🌿.`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];

    const htmlContent = getEmailTemplate(message, userName, streak, dayCount);

    const emailData = {
        sender: {
            name: "TafsirKurd",
            email: "notifications@tafsirkurd.com"
        },
        to: [
            {
                email: email,
                name: userName
            }
        ],
        subject: "Daily Quran Reminder 🌙",
        htmlContent: htmlContent
    };

    return sendBrevoEmail(emailData);
}

function getEmailTemplate(message, userName, streak, dayCount) {
    return `
<!DOCTYPE html>
<html lang="en" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TafsirKurd - Daily Reminder</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f5f5f5;direction:rtl;">
    <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 20px;text-align:center;">
            <h1 style="font-size:32px;font-weight:bold;color:#ffffff;margin:0;">📖 TafsirKurd</h1>
        </div>
        <div style="padding:40px 30px;">
            <div style="font-size:48px;margin:20px 0;text-align:center;">🌙</div>
            <h2 style="color:#667eea;text-align:center;margin:0 0 20px 0;">Daily Quran Reminder</h2>
            <p style="font-size:18px;line-height:1.8;color:#333333;margin-bottom:30px;text-align:center;">${message}</p>
            ${streak > 0 ? `<p style="text-align:center;font-size:16px;color:#666;">You're on day <strong style="color:#667eea;font-size:24px;">${dayCount}</strong> of your journey</p>` : ''}
            <div style="height:1px;background:linear-gradient(90deg,transparent,#e0e0e0,transparent);margin:30px 0;"></div>
            <div style="text-align:center;">
                <a href="https://tafsirkurd.com/quran" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;padding:16px 40px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px;">Continue Reading →</a>
            </div>
        </div>
        <div style="background-color:#f8f8f8;padding:30px;text-align:center;font-size:14px;color:#666666;">
            <p style="margin:0 0 10px 0;">© 2025 TafsirKurd - Your Quran Journey Companion</p>
            <p style="margin:0;">Continue your journey at <a href="https://tafsirkurd.com" style="color:#667eea;text-decoration:none;">tafsirkurd.com</a></p>
            <div style="color:#999999;font-size:12px;margin-top:20px;">
                <p>Don't want to receive these reminders? <a href="https://tafsirkurd.com/settings" style="color:#667eea;text-decoration:none;">Manage preferences</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

function sendBrevoEmail(emailData) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(emailData);

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
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
