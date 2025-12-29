// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/test-brevo-email.js

/**
 * Test Brevo Email Function
 * Simple test to verify Brevo configuration
 */

const https = require('https');

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const BREVO_API_KEY = env.BREVO_API_KEY;

        if (!BREVO_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'BREVO_API_KEY not configured in environment variables'
                })
            };
        }

        // Simple test email
        const emailData = {
            sender: {
                name: "TafsirKurd",
                email: "noreply@tafsirkurd.com"
            },
            to: [
                {
                    email: "tefsirkurd@gmail.com",
                    name: "Admin"
                }
            ],
            subject: "Test Email from TafsirKurd Admin",
            htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h1>Test Email</h1>
<p>This is a simple test email to verify Brevo is working correctly.</p>
<p>If you received this, the email system is functioning properly!</p>
</body>
</html>`,
            textContent: "Test Email - This is a simple test email to verify Brevo is working correctly."
        };

        console.log('📧 Attempting to send test email...');
        console.log('API Key present:', !!BREVO_API_KEY);
        console.log('API Key first 10 chars:', BREVO_API_KEY.substring(0, 10) + '...');

        const result = await sendBrevoEmail(BREVO_API_KEY, emailData);

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Test email sent successfully',
                messageId: result.messageId,
                sentTo: 'tefsirkurd@gmail.com'
            })
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

function sendBrevoEmail(apiKey, emailData) {
    return new Promise((resolve, reject) => {
        let data;
        try {
            data = JSON.stringify(emailData);
        } catch (error) {
            return reject(new Error(`JSON stringify failed: ${error.message}`));
        }

        console.log('📤 Request data length:', Buffer.byteLength(data), 'bytes');

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
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
                console.log('📥 Response status:', res.statusCode);
                console.log('📥 Response body:', body);

                try {
                    const response = JSON.parse(body);

                    if (res.statusCode === 201) {
                        resolve(response);
                    } else {
                        reject(new Error(`Brevo API error (${res.statusCode}): ${JSON.stringify(response)}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}
