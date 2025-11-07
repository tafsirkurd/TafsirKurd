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
        const BREVO_API_KEY = process.env.BREVO_API_KEY || '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';

        const emailData = {
            sender: {
                name: "TafsirKurd",
                email: "notifications@tafsirkurd.com" // Will use your verified sender
            },
            to: [
                {
                    email: to,
                    name: to.split('@')[0]
                }
            ],
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent || htmlContent.replace(/<[^>]*>/g, '')
        };

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
        const data = JSON.stringify(emailData);

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
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
