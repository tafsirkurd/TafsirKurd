#!/usr/bin/env node
const https = require('https');

const testEmail = process.argv[2] || 'saman26d@gmail.com';
const BREVO_API_KEY = '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';

console.log(`\n📧 Sending simple email to: ${testEmail}\n`);

const htmlContent = `
<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; font-family: 'IBM Plex Sans Arabic', -apple-system, sans-serif; background: #fafafa; direction: rtl; }
        .email-wrapper { padding: 40px 20px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #e8e8e8; }
        .header { background: #000000; padding: 30px; text-align: center; }
        .logo { font-size: 20px; font-weight: 600; color: #ffffff; margin: 0; }
        .content { padding: 30px; background: #ffffff; }
        .message-box { background: #ffffff; border: 1px solid #e8e8e8; padding: 20px; margin: 20px 0; }
        .message { font-size: 16px; line-height: 1.8; color: #000000; margin: 0; text-align: right; }
        .quran-verse { font-family: 'IBM Plex Sans Arabic', sans-serif; font-size: 18px; color: #000000; text-align: center; margin: 20px 0; padding: 20px; background: #fafafa; line-height: 2; border-top: 1px solid #e8e8e8; border-bottom: 1px solid #e8e8e8; }
        .cta-button { display: inline-block; background: #000000; color: #ffffff; padding: 12px 30px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #000000; }
        .footer { background: #000000; padding: 30px; text-align: center; color: rgba(255,255,255,0.8); }
        .footer-text { margin: 10px 0; font-size: 14px; color: rgba(255,255,255,0.6); }
        .footer-link { color: #ffffff; text-decoration: none; }
        .divider { height: 1px; background: #e8e8e8; margin: 20px 0; }
        .stat-number { font-size: 32px; font-weight: 600; color: #000000; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1 class="logo">تەفسیرکورد</h1>
            </div>
            <div class="content">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">بیرئینانا رۆژانە</h2>

                <div class="message-box">
                    <p class="message">خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە</p>
                </div>

                <div class="quran-verse">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>

                <div style="margin: 20px 0; padding: 20px; border: 1px solid #e8e8e8; background: #fafafa;">
                    <p style="font-size: 14px; color: #000000; margin: 5px 0;">تۆ د رۆژا</p>
                    <p class="stat-number">٧</p>
                    <p style="font-size: 14px; color: #000000; margin: 5px 0;">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
                </div>

                <div class="divider"></div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="https://tafsirkurd.com/Quran.html" class="cta-button">بخوینە</a>
                </div>
            </div>
            <div class="footer">
                <p class="footer-text">© ٢٠٢٥ تەفسیرکورد</p>
                <p class="footer-text">
                    <a href="https://tafsirkurd.com" class="footer-link">tafsirkurd.com</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`;

const emailData = {
    sender: { name: "TafsirKurd", email: "notifications@tafsirkurd.com" },
    to: [{ email: testEmail, name: testEmail.split('@')[0] }],
    subject: "بیرئینانا خواندنا قورئانێ - تەفسیرکورد",
    htmlContent: htmlContent,
    textContent: "بیرئینانا رۆژانە - خشتەیا تە گەش و پر رۆناهی یە"
};

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
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const response = JSON.parse(body);
            if (res.statusCode === 201) {
                console.log('✅ Email sent!\n📧 Message ID:', response.messageId);
                console.log('📬 Check inbox:', testEmail, '\n');
            } else {
                console.log('❌ Failed:', JSON.stringify(response, null, 2));
            }
        } catch (e) {
            console.log('Response:', body);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
