// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/send-bulk-email.js

/**
 * Bulk Email Sender
 * Sends custom emails to all users or filtered groups via Brevo
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
const BREVO_API_KEY = env.BREVO_API_KEY;

export async function onRequest(context) {
    const { request, env } = context;
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { subject, htmlContent, textContent, filterType = 'all' } = JSON.parse(await request.text());

        if (!subject || !htmlContent) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: subject, htmlContent' })
            };
        }

        if (!BREVO_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'BREVO_API_KEY not configured' })
            };
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Get all users
        const { data: users, error } = await supabase
            .from('user_data')
            .select('*');

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        console.log(`📊 Found ${users.length} total users`);

        let sentCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const user of users) {
            try {
                const userData = user.data || {};
                const email = userData.email || userData.userEmail;
                const userName = userData.full_name || userData.userName || 'Reader';

                // Check if user has email
                if (!email || !email.includes('@')) {
                    skippedCount++;
                    continue;
                }

                // Apply filters
                if (filterType === 'active') {
                    const lastReadDate = userData.lastReadDate;
                    const lastRead = lastReadDate ? new Date(lastReadDate) : null;
                    const daysSinceLastRead = lastRead ? Math.floor((Date.now() - lastRead) / (1000 * 60 * 60 * 24)) : 999;

                    if (daysSinceLastRead > 7) {
                        skippedCount++;
                        continue;
                    }
                } else if (filterType === 'inactive') {
                    const lastReadDate = userData.lastReadDate;
                    const lastRead = lastReadDate ? new Date(lastReadDate) : null;
                    const daysSinceLastRead = lastRead ? Math.floor((Date.now() - lastRead) / (1000 * 60 * 60 * 24)) : 999;

                    if (daysSinceLastRead <= 7) {
                        skippedCount++;
                        continue;
                    }
                }

                // Personalize content
                const stats = userData.stats || {};
                const personalizedHtml = htmlContent
                    .replace(/\{name\}/g, userName)
                    .replace(/\{streak\}/g, stats.streak || '0')
                    .replace(/\{surahCount\}/g, stats.surahsCompleted || '0')
                    .replace(/\{percentage\}/g, '0');

                const personalizedText = textContent ? textContent
                    .replace(/\{name\}/g, userName)
                    .replace(/\{streak\}/g, stats.streak || '0')
                    .replace(/\{surahCount\}/g, stats.surahsCompleted || '0')
                    .replace(/\{percentage\}/g, '0') : '';

                await sendEmail(email, userName, subject, personalizedHtml, personalizedText);
                sentCount++;
                console.log(`📧 Sent to ${email}`);

                // Small delay to avoid rate limiting (300ms between emails)
                await sleep(300);

            } catch (userError) {
                console.error(`Error processing user ${user.user_id}:`, userError);
                failedCount++;
            }
        }

        console.log(`✅ Bulk email complete: ${sentCount} sent, ${skippedCount} skipped, ${failedCount} failed`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sent: sentCount,
                skipped: skippedCount,
                failed: failedCount,
                total: users.length
            })
        };

    } catch (error) {
        console.error('❌ Bulk email failed:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                details: 'Failed to send bulk email'
            })
        };
    }
};

async function sendEmail(email, userName, subject, htmlContent, textContent) {
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
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent || htmlContent.replace(/<[^>]*>/g, ''),
        headers: {
            "X-Mailin-custom": "tafsirkurd_notification",
            "charset": "utf-8"
        },
        tags: ["transactional", "notification"]
    };

    return sendBrevoEmail(emailData);
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
