#!/usr/bin/env node
const https = require('https');

const testEmail = process.argv[2] || 'saman26d@gmail.com';
const BREVO_API_KEY = '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';

console.log(`\n📧 Sending professional email to: ${testEmail}\n`);

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
        .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #ffd700; }
        .logo { font-size: 22px; font-weight: 600; color: #ffffff; margin: 0; letter-spacing: 1px; }
        .content { padding: 40px 30px; background: #ffffff; }
        .message-box { background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%); border-left: 4px solid #27ae60; padding: 25px; margin: 25px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .message { font-size: 16px; line-height: 1.9; color: #000000; margin: 0; text-align: right; }
        .quran-verse { font-family: 'IBM Plex Sans Arabic', sans-serif; font-size: 20px; color: #27ae60; text-align: center; margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #f0f9f4 0%, #ffffff 100%); line-height: 2.2; border-top: 2px solid #ffd700; border-bottom: 2px solid #ffd700; font-weight: 500; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3); }
        .footer { background: #000000; padding: 30px; text-align: center; color: rgba(255,255,255,0.8); }
        .footer-text { margin: 10px 0; font-size: 14px; color: rgba(255,255,255,0.6); }
        .footer-link { color: #ffffff; text-decoration: none; }
        .divider { height: 1px; background: #e8e8e8; margin: 25px 0; }
        .stat-number { font-size: 48px; font-weight: 700; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 10px 0; }
        .stat-box { background: linear-gradient(135deg, #fffbea 0%, #ffffff 100%); border: 2px solid #ffd700; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.15); }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1 class="logo">تەفسیرکورد</h1>
            </div>
            <div class="content">
                <h2 style="color: #000000; margin: 0 0 25px 0; font-size: 20px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #ffd700;">بیرئینانا رۆژانە</h2>

                <div class="message-box">
                    <p class="message">خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە</p>
                </div>

                <div class="quran-verse">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>

                <div class="stat-box">
                    <p style="font-size: 14px; color: #000000; margin: 5px 0; font-weight: 500;">تۆ د رۆژا</p>
                    <p class="stat-number">٧</p>
                    <p style="font-size: 14px; color: #000000; margin: 5px 0; font-weight: 500;">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
                </div>

                <div class="divider"></div>

                <div style="text-align: center; margin: 25px 0;">
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
                console.log('✅ Professional email sent!');
                console.log('📧 Message ID:', response.messageId);
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
