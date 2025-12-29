// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/send-email-notification.js

const https = require('https');

export async function onRequest(context) {
    const { request, env } = context;
    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    try {
        const { to, subject, htmlContent, textContent } = JSON.parse(await request.text());

        if (!to || !subject || !htmlContent) {
            return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, htmlContent' }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // Brevo API key from environment variable
        const BREVO_API_KEY = env.BREVO_API_KEY;

        if (!BREVO_API_KEY) {
            return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured' }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        const emailData = {
            sender: {
                name: "TafsirKurd",
                email: "noreply@tafsirkurd.com"
            },
            to: [
                {
                    email: to,
                    name: to.split('@')[0]
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

        console.log('📧 Sending email to:', to);
        console.log('📝 Subject:', subject);

        const result = await sendBrevoEmail(BREVO_API_KEY, emailData);

        return new Response(JSON.stringify({
                success: true,
                message: 'Email sent successfully',
                messageId: result.messageId
            }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error('Error sending email:', error);
        return new Response(JSON.stringify({
                error: error.message,
                details: 'Failed to send email notification'
            }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
};

function sendBrevoEmail(apiKey, emailData) {
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
                try {
                    const response = JSON.parse(body);

                    if (res.statusCode === 201) {
                        resolve(response);
                    } else {
                        console.error('❌ Brevo API error response:', response);
                        console.error('Status code:', res.statusCode);
                        reject(new Error(`Brevo API error: ${response.message || JSON.stringify(response) || body}`));
                    }
                } catch (error) {
                    console.error('❌ Failed to parse response:', body);
                    reject(new Error(`Failed to parse Brevo response: ${error.message} - Body: ${body}`));
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
