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
        const { to, subject, htmlContent, textContent } = JSON.parse(event.body);

        if (!to || !subject || !htmlContent) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: to, subject, htmlContent' })
            };
        }

        // Brevo API key from environment variable
        const BREVO_API_KEY = process.env.BREVO_API_KEY;

        if (!BREVO_API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'BREVO_API_KEY not configured' })
            };
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

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Email sent successfully',
                messageId: result.messageId
            })
        };

    } catch (error) {
        console.error('Error sending email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                details: 'Failed to send email notification'
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
