#!/usr/bin/env node
/**
 * Test Email Sender for TafsirKurd
 * Clean black & white design with smooth animations
 *
 * Usage: node send-test-email.js YOUR_EMAIL@gmail.com
 */

const https = require('https');

const testEmail = process.argv[2] || 'saman26d@gmail.com';

console.log(`\n📧 TafsirKurd Email Test Tool`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
console.log(`Sending minimalist black & white email to: ${testEmail}\n`);

const BREVO_API_KEY = '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';

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
        .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06); border: 1px solid #e8e8e8; }
        .header { background: #000000; padding: 50px 30px; text-align: center; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.03; background-image: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 36px), repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 36px); background-size: 50px 50px; pointer-events: none; animation: patternShift 40s linear infinite; }
        @keyframes patternShift { 0% { transform: translate(0, 0); } 100% { transform: translate(50px, 50px); } }
        .logo { font-size: 36px; font-weight: bold; color: #ffffff; margin: 0 0 10px 0; position: relative; z-index: 1; }
        .header-subtitle { color: rgba(255,255,255,0.8); font-size: 16px; margin: 0; position: relative; z-index: 1; font-weight: 300; }
        .content { padding: 50px 40px; background: #ffffff; }
        .message-box { background: #ffffff; border: 2px solid #000000; padding: 30px; margin: 30px 0; animation: fadeInUp 0.8s ease; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .message { font-size: 20px; line-height: 2; color: #000000; margin: 0; text-align: center; font-weight: 400; }
        .quran-verse { font-family: 'Amiri Quran', serif; font-size: 32px; text-align: center; margin: 40px 0; padding: 40px; background: #000000; color: #ffffff; line-height: 2.5; position: relative; animation: fadeIn 1s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .quran-verse::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 3px; background: #ffffff; }
        .quran-verse::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 3px; background: #ffffff; }
        .cta-button { display: inline-block; background: #000000; color: #ffffff; padding: 18px 50px; text-decoration: none; font-weight: 700; font-size: 18px; border: 3px solid #000000; animation: pulse 2s ease infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7); } 50% { transform: scale(1.02); box-shadow: 0 0 20px 10px rgba(0, 0, 0, 0); } }
        .footer { background: #000000; padding: 40px 30px; text-align: center; color: rgba(255,255,255,0.8); border-top: 1px solid #333333; }
        .footer-text { margin: 10px 0; font-size: 14px; color: rgba(255,255,255,0.6); }
        .footer-link { color: #ffffff; text-decoration: none; font-weight: 500; }
        .divider { height: 1px; background: #e8e8e8; margin: 35px 0; }
        .moon-icon { font-size: 70px; margin: 20px 0; display: block; animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
        .icon-decoration { font-size: 40px; opacity: 0.15; display: inline-block; animation: rotate 20s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .stat-number { font-size: 72px; font-weight: 900; color: #000000; margin: 10px 0; animation: scaleIn 0.6s ease; }
        @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
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
                <div style="text-align: center;">
                    <span class="icon-decoration">📖</span>
                </div>

                <span class="moon-icon">🌙</span>

                <h2 style="color: #000000; text-align: center; margin: 0 0 40px 0; font-size: 36px; font-weight: 900; letter-spacing: 1px;">بیرئینانا رۆژانە</h2>

                <div class="message-box">
                    <p class="message">خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە 🌸</p>
                </div>

                <div class="quran-verse">وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</div>

                <div style="text-align: center; margin: 50px 0; padding: 40px 20px; border: 3px solid #000000; background: #ffffff;">
                    <p style="font-size: 16px; color: #000000; margin: 5px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">تۆ د رۆژا</p>
                    <p class="stat-number">٧</p>
                    <p style="font-size: 16px; color: #000000; margin: 5px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
                </div>

                <div class="divider"></div>

                <div style="text-align: center; margin: 40px 0;">
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
                console.log('✅ SUCCESS! Clean black & white email sent!\n');
                console.log(`📧 Message ID: ${response.messageId}`);
                console.log(`📬 Check your inbox: ${testEmail}`);
                console.log(`\n💡 Features:`);
                console.log(`   • Pure black & white design`);
                console.log(`   • Smooth animations (fade, float, pulse, rotate)`);
                console.log(`   • Minimalist Islamic patterns`);
                console.log(`   • Clean typography`);
                console.log(`   • Mobile responsive\n`);
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
