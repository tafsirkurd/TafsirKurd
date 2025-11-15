// Manual test function for daily reminders
// Access via: https://tafsirkurd.com/.netlify/functions/test-daily-reminders?email=YOUR_EMAIL

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://gijupzejtbpifjzwadee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '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';

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    console.log('🧪 Running test daily reminder job...');

    try {
        // Get test email from query parameter
        const testEmail = event.queryStringParameters?.email;

        if (testEmail) {
            // Send to specific email
            console.log(`📧 Sending test email to: ${testEmail}`);
            await sendDailyReminderEmail(testEmail, 'Test User', 5, 10);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: `Test email sent to ${testEmail}`,
                    note: 'Check your inbox!'
                })
            };
        }

        // If no email specified, run the full job
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        const results = [];

        for (const user of users) {
            try {
                const userData = user.data || {};
                const email = userData.email || userData.userEmail;
                const userName = userData.full_name || userData.userName || 'Reader';
                const stats = userData.stats || {};
                const lastReadDate = userData.lastReadDate;

                if (!email || !email.includes('@')) {
                    skippedCount++;
                    results.push({ email: 'N/A', status: 'skipped', reason: 'No email' });
                    continue;
                }

                const notificationSettings = userData.notificationSettings || {};
                if (notificationSettings.enabled === false) {
                    console.log(`⏭️  Skipping ${email} - notifications disabled`);
                    skippedCount++;
                    results.push({ email, status: 'skipped', reason: 'Notifications disabled' });
                    continue;
                }

                const lastRead = lastReadDate ? new Date(lastReadDate).toDateString() : null;
                if (lastRead === today) {
                    console.log(`✅ Skipping ${email} - already read today`);
                    skippedCount++;
                    results.push({ email, status: 'skipped', reason: 'Already read today' });
                    continue;
                }

                const streak = stats.streak || 0;
                const dayCount = stats.daysActive || 1;

                await sendDailyReminderEmail(email, userName, streak, dayCount);
                sentCount++;
                results.push({ email, status: 'sent', userName, streak, dayCount });
                console.log(`📧 Sent reminder to ${email}`);

                await sleep(100);

            } catch (userError) {
                console.error(`Error processing user ${user.user_id}:`, userError);
                results.push({ email: 'error', status: 'failed', error: userError.message });
            }
        }

        console.log(`✅ Job complete: ${sentCount} emails sent, ${skippedCount} skipped`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sent: sentCount,
                skipped: skippedCount,
                total: users.length,
                results: results
            }, null, 2)
        };

    } catch (error) {
        console.error('❌ Job failed:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                stack: error.stack
            })
        };
    }
};

async function sendDailyReminderEmail(email, userName, streak, dayCount) {
    const messages = [
        `خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە`,
        `بیرئینانە: تەنانەت ئایەتەکێ تە نزیک دکەت ژ خودێ. ئێستا بەردەوام بە`,
        `بەردەوامیی عیبادەتە — قورئانا خوە ڤەکە و پێشڤەچوونا خوە بەردەوام بکە`
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];

    const htmlContent = getEmailTemplate(message, userName, streak, dayCount);

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
        subject: "بیرئینانا خواندنا قورئانێ 🌙",
        htmlContent: htmlContent
    };

    return sendBrevoEmail(emailData);
}

function getEmailTemplate(message, userName, streak, dayCount) {
    const streakSection = streak > 0
        ? `<p style="text-align:center;font-size:16px;color:#666;font-family:'IBM Plex Sans Arabic',-apple-system,sans-serif;margin:20px 0;">تو د رۆژا <strong style="color:#000000;font-size:24px;font-family:'IBM Plex Sans Arabic',-apple-system,sans-serif;">${dayCount}</strong> یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>`
        : '';

    return `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>بیرئینانا رۆژانە</title>
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
<div style="font-size:42px;margin:15px 0">🌙</div>
<h2 style="margin:10px 0 20px;font-size:20px;font-weight:600;color:#333;font-family:'IBM Plex Sans Arabic',sans-serif">بیرئینانا رۆژانە</h2>
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
        // Log what we're sending for debugging
        console.log('📤 Sending email data:', {
            to: emailData.to[0].email,
            subject: emailData.subject,
            htmlLength: emailData.htmlContent.length
        });

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
                        reject(new Error(`Brevo API error (${res.statusCode}): ${response.message || body}`));
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
