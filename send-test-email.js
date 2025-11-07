#!/usr/bin/env node
/**
 * Test Email Sender for TafsirKurd
 * Send beautiful Quranic email to test your design
 *
 * Usage: node send-test-email.js YOUR_EMAIL@gmail.com
 */

const https = require('https');

// Get email from command line
const testEmail = process.argv[2] || 'saman26d@gmail.com';

console.log(`\n📧 TafsirKurd Email Test Tool`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
console.log(`Sending beautiful Quranic email to: ${testEmail}\n`);

const BREVO_API_KEY = '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';

// Beautiful email content with Kurdish + Quran verses
const htmlContent = `
<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TafsirKurd - بیرئینانا قورئانێ</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap');
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); direction: rtl; }
        .email-wrapper { padding: 40px 20px; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 30px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px), repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(255,255,255,0.05) 35px, rgba(255,255,255,0.05) 70px); }
        .logo { font-size: 36px; font-weight: bold; color: #ffffff; margin: 0 0 10px 0; position: relative; z-index: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.2); }
        .header-subtitle { color: rgba(255,255,255,0.95); font-size: 16px; margin: 0; position: relative; z-index: 1; }
        .content { padding: 50px 40px; background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%); }
        .message-box { background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-right: 4px solid #667eea; padding: 25px; border-radius: 15px; margin: 25px 0; }
        .message { font-size: 20px; line-height: 2; color: #2c3e50; margin: 0; text-align: center; font-weight: 500; }
        .quran-verse { font-family: 'Amiri Quran', serif; font-size: 24px; color: #667eea; text-align: center; margin: 30px 0; padding: 20px; background: rgba(102, 126, 234, 0.05); border-radius: 10px; line-height: 2.2; }
        .cta-container { text-align: center; margin: 40px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 18px 50px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 18px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3); }
        .footer { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); padding: 40px 30px; text-align: center; color: rgba(255,255,255,0.8); }
        .footer-text { margin: 10px 0; font-size: 14px; }
        .footer-link { color: #667eea; text-decoration: none; font-weight: 500; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #667eea, transparent); margin: 30px 0; }
        .moon-icon { font-size: 60px; margin: 20px 0; display: block; }
        .stats { text-align: center; margin: 30px 0; }
        .stat-number { font-size: 42px; font-weight: bold; color: #667eea; margin: 5px 0; }
        .stat-label { font-size: 16px; color: #7f8c8d; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1 class="logo">📖 تەفسیرکورد</h1>
                <p class="header-subtitle">رێکا تە بەرەڤ نورا قورئانێ</p>
            </div>
            <div class="content">
                <span class="moon-icon">🌙</span>
                <h2 style="color: #667eea; text-align: center; margin: 0 0 20px 0; font-size: 28px;">بیرئینانا رۆژانە</h2>

                <div class="message-box">
                    <p class="message">خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە 🌸</p>
                </div>

                <div class="quran-verse">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>

                <div class="stats">
                    <p class="stat-label">تۆ د رۆژا</p>
                    <p class="stat-number">٧</p>
                    <p class="stat-label">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
                </div>

                <div class="divider"></div>

                <div class="cta-container">
                    <a href="https://tafsirkurd.com/Quran.html" class="cta-button">هەر نها بخوینە ←</a>
                </div>
            </div>
            <div class="footer">
                <p class="footer-text">© ٢٠٢٥ تەفسیرکورد</p>
                <p class="footer-text">هاوڕێیا تە د رێکا قورئانێ دا</p>
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
    sender: {
        name: "TafsirKurd",
        email: "notifications@tafsirkurd.com"
    },
    to: [{
        email: testEmail,
        name: testEmail.split('@')[0]
    }],
    subject: "🌙 بیرئینانا خواندنا قورئانێ - تەفسیرکورد",
    htmlContent: htmlContent,
    textContent: "بیرئینانا رۆژانە - خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە 🌸"
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
                console.log('✅ SUCCESS! Beautiful Quranic email sent!\n');
                console.log(`📧 Message ID: ${response.messageId}`);
                console.log(`📬 Check your inbox: ${testEmail}`);
                console.log(`\n💡 Features of this email:`);
                console.log(`   • Islamic geometric patterns with animation`);
                console.log(`   • Kurdish Badini messages`);
                console.log(`   • Beautiful Quran verses in Amiri font`);
                console.log(`   • Gradient backgrounds & glowing effects`);
                console.log(`   • Mobile responsive design\n`);
            } else {
                console.log('❌ FAILED');
                console.log(JSON.stringify(response, null, 2));
            }
        } catch (e) {
            console.log('Response:', body);
        }
    });
});

req.on('error', (e) => console.error('❌ Error:', e.message));
req.write(data);
req.end();
