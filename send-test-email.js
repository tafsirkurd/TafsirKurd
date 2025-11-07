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
        body { margin: 0; padding: 0; font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif; background: #fafafa; direction: rtl; }
        .email-wrapper { padding: 40px 20px; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 0; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06); border: 1px solid #e8e8e8; }
        .header { background: #000000; padding: 50px 30px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.05; background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, #ffd700 35px, #ffd700 36px), repeating-linear-gradient(-45deg, transparent, transparent 35px, #ffd700 35px, #ffd700 36px); background-size: 50px 50px; pointer-events: none; animation: patternShift 30s linear infinite; }
        @keyframes patternShift { 0% { transform: translate(0, 0); } 100% { transform: translate(50px, 50px); } }
        .logo { font-size: 36px; font-weight: bold; color: #ffffff; margin: 0 0 10px 0; position: relative; z-index: 1; }
        .header-subtitle { color: rgba(255,255,255,0.8); font-size: 16px; margin: 0; position: relative; z-index: 1; font-weight: 300; }
        .content { padding: 50px 40px; background: #ffffff; }
        .message-box { background: #fafafa; border-right: 4px solid #ffd700; padding: 25px; border-radius: 0; margin: 25px 0; position: relative; }
        .message-box::before { content: '✨'; position: absolute; top: 10px; left: 10px; font-size: 24px; opacity: 0.3; }
        .message { font-size: 20px; line-height: 2; color: #000000; margin: 0; text-align: center; font-weight: 400; }
        .quran-verse { font-family: 'Amiri Quran', serif; font-size: 28px; color: #27ae60; text-align: center; margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border-radius: 0; line-height: 2.4; border-top: 2px solid #ffd700; border-bottom: 2px solid #ffd700; position: relative; }
        .quran-verse::before { content: '☪'; position: absolute; top: 5px; right: 15px; font-size: 18px; color: #ffd700; opacity: 0.4; }
        .quran-verse::after { content: '☪'; position: absolute; bottom: 5px; left: 15px; font-size: 18px; color: #ffd700; opacity: 0.4; }
        .cta-container { text-align: center; margin: 40px 0; }
        .cta-button { display: inline-block; background: #27ae60; color: #ffffff; padding: 16px 45px; text-decoration: none; border-radius: 0; font-weight: 600; font-size: 17px; border: 2px solid #27ae60; }
        .footer { background: #000000; padding: 40px 30px; text-align: center; color: rgba(255,255,255,0.8); border-top: 1px solid #333333; }
        .footer-text { margin: 10px 0; font-size: 14px; color: rgba(255,255,255,0.6); }
        .footer-link { color: #ffffff; text-decoration: none; font-weight: 500; }
        .divider { height: 1px; background: #e8e8e8; margin: 35px 0; }
        .moon-icon { font-size: 60px; margin: 20px 0; display: block; filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6)); animation: moonGlow 3s ease-in-out infinite; }
        @keyframes moonGlow { 0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6)); transform: scale(1); } 50% { filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.9)); transform: scale(1.1); } }
        .quran-decoration { text-align: center; font-size: 80px; opacity: 0.08; margin: 20px 0; color: #ffd700; }
        .stats { text-align: center; margin: 30px 0; }
        .stat-number { font-size: 56px; font-weight: 700; color: #ffd700; margin: 5px 0; text-shadow: 2px 2px 0px rgba(0,0,0,0.1); }
        .stat-label { font-size: 16px; color: #666666; margin: 5px 0; }
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
                <h2 style="color: #000000; text-align: center; margin: 0 0 30px 0; font-size: 32px; font-weight: 700;">بیرئینانا رۆژانە</h2>

                <div class="quran-decoration">📖</div>

                <div class="message-box">
                    <p class="message">خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە 🌸</p>
                </div>

                <div class="quran-verse">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>

                <div style="text-align: center; margin: 40px 0; padding: 30px; background: #fafafa;">
                    <p style="font-size: 18px; color: #000000; margin: 5px 0; font-weight: 600;">تۆ د رۆژا</p>
                    <p class="stat-number">٧</p>
                    <p style="font-size: 18px; color: #000000; margin: 5px 0; font-weight: 600;">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
                    <div style="margin-top: 20px;">
                        <span style="font-size: 30px;">⭐</span>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="cta-container">
                    <a href="https://tafsirkurd.com/Quran.html" class="cta-button">هەر نها بخوینە ←</a>
                </div>

                <div style="text-align: center; margin: 30px 0; opacity: 0.3;">
                    <span style="font-size: 24px;">☪️</span>
                    <span style="font-size: 24px; margin: 0 15px;">✨</span>
                    <span style="font-size: 24px;">☪️</span>
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
