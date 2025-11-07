// Beautiful Quranic-themed Email Templates for TafsirKurd
// With Islamic geometric patterns and Kurdish Badini text

const EmailTemplates = {
    // Base template with beautiful Quranic design
    getBaseTemplate: (content, preheader = '') => `
<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TafsirKurd - بیرئینانا قورئانێ</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap');

        body {
            margin: 0;
            padding: 0;
            font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
            background: #fafafa;
            direction: rtl;
        }
        .email-wrapper {
            padding: 40px 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 0;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
            border: 1px solid #e8e8e8;
        }
        .header {
            background: #000000;
            padding: 50px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.03;
            background-image:
                repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 36px),
                repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 36px);
            background-size: 50px 50px;
            pointer-events: none;
            animation: patternShift 40s linear infinite;
        }
        @keyframes patternShift {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        .logo {
            font-size: 36px;
            font-weight: bold;
            color: #ffffff;
            margin: 0 0 10px 0;
            position: relative;
            z-index: 1;
        }
        .header-subtitle {
            color: rgba(255,255,255,0.8);
            font-size: 16px;
            margin: 0;
            position: relative;
            z-index: 1;
            font-weight: 300;
        }
        .islamic-pattern {
            text-align: center;
            font-size: 60px;
            margin: 30px 0;
            opacity: 0.1;
            line-height: 1;
        }
        .content {
            padding: 50px 40px;
            background: #ffffff;
        }
        .message-box {
            background: #ffffff;
            border: 2px solid #000000;
            padding: 30px;
            margin: 30px 0;
            position: relative;
            animation: fadeInUp 0.8s ease;
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .message {
            font-size: 20px;
            line-height: 2;
            color: #000000;
            margin: 0;
            text-align: center;
            font-weight: 400;
        }
        .quran-verse {
            font-family: 'Amiri Quran', serif;
            font-size: 32px;
            color: #000000;
            text-align: center;
            margin: 40px 0;
            padding: 40px;
            background: #000000;
            color: #ffffff;
            line-height: 2.5;
            position: relative;
            animation: fadeIn 1s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .quran-verse::before {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 3px;
            background: #ffffff;
        }
        .quran-verse::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 3px;
            background: #ffffff;
        }
        .cta-container {
            text-align: center;
            margin: 40px 0;
        }
        .cta-button {
            display: inline-block;
            background: #000000;
            color: #ffffff;
            padding: 18px 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 18px;
            border: 3px solid #000000;
            position: relative;
            overflow: hidden;
            animation: pulse 2s ease infinite;
        }
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 0 20px 10px rgba(0, 0, 0, 0);
            }
        }
        .stats-row {
            display: table;
            width: 100%;
            margin: 30px 0;
        }
        .stat-box {
            display: table-cell;
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 12px;
            margin: 0 10px;
        }
        .stat-number {
            font-size: 72px;
            font-weight: 900;
            color: #000000;
            margin: 10px 0;
            animation: scaleIn 0.6s ease;
        }
        @keyframes scaleIn {
            from {
                transform: scale(0);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }
        .stat-label {
            font-size: 14px;
            color: #666666;
            margin: 5px 0 0 0;
        }
        .footer {
            background: #000000;
            padding: 40px 30px;
            text-align: center;
            color: rgba(255,255,255,0.8);
            border-top: 1px solid #333333;
        }
        .footer-text {
            margin: 10px 0;
            font-size: 14px;
            color: rgba(255,255,255,0.6);
        }
        .footer-link {
            color: #ffffff;
            text-decoration: none;
            font-weight: 500;
        }
        .unsubscribe {
            color: rgba(255,255,255,0.4);
            font-size: 12px;
            margin-top: 25px;
        }
        .unsubscribe a {
            color: rgba(255,255,255,0.6);
            text-decoration: underline;
        }
        .divider {
            height: 1px;
            background: #e8e8e8;
            margin: 35px 0;
        }
        .moon-icon {
            font-size: 70px;
            margin: 20px 0;
            display: block;
            animation: float 4s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% {
                transform: translateY(0px) rotate(0deg);
            }
            50% {
                transform: translateY(-15px) rotate(5deg);
            }
        }
        .icon-decoration {
            font-size: 40px;
            opacity: 0.15;
            display: inline-block;
            animation: rotate 20s linear infinite;
        }
        @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader}
    </div>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1 class="logo">📖 تەفسیرکورد</h1>
                <p class="header-subtitle">رێکا تە بەرەڤ نورا قورئانێ</p>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p class="footer-text">© ٢٠٢٥ تەفسیرکورد</p>
                <p class="footer-text">هاوڕێیا تە د رێکا قورئانێ دا</p>
                <p class="footer-text">
                    <a href="https://tafsirkurd.com" class="footer-link">tafsirkurd.com</a>
                </p>
                <div class="unsubscribe">
                    <p>ئەگەر نەخوازی ئەڤ بیرئینانێن وەربگری،
                    <a href="https://tafsirkurd.com/settings">ڕێکخستنان بگۆهۆرە</a></p>
                </div>
        </div>
    </div>
</body>
</html>
    `,

    // Daily Streak Reminder - Kurdish Badini
    dailyStreak: (userName, streak, dayCount) => {
        const messages = [
            {
                text: `خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە 🌸`,
                verse: `وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا`
            },
            {
                text: `بیرئینان: هەتا ئایەتەک بتنێ ژی تە نێزیکێ خودێ دکەت. نها خشتەیا خوە بەردەوام کە.`,
                verse: `وَاذْكُر رَّبَّكَ كَثِيرًا`
            },
            {
                text: `بەردەوامبوون پەرستنە — قورئانا خوە ڤەکە و پێشکەفتنا خوە بەردەوام کە 🌿`,
                verse: `إِنَّ اللَّهَ مَعَ الصَّابِرِينَ`
            }
        ];
        const selected = messages[Math.floor(Math.random() * messages.length)];

        const content = `
            <div style="text-align: center;">
                <span class="icon-decoration">📖</span>
            </div>

            <span class="moon-icon">🌙</span>

            <h2 style="color: #000000; text-align: center; margin: 0 0 40px 0; font-size: 36px; font-weight: 900; letter-spacing: 1px;">بیرئینانا رۆژانە</h2>

            <div class="message-box">
                <p class="message">${selected.text}</p>
            </div>

            <div class="quran-verse">${selected.verse}</div>

            ${streak > 0 ? `
            <div style="text-align: center; margin: 50px 0; padding: 40px 20px; border: 3px solid #000000; background: #ffffff;">
                <p style="font-size: 16px; color: #000000; margin: 5px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">تۆ د رۆژا</p>
                <p class="stat-number">${dayCount}</p>
                <p style="font-size: 16px; color: #000000; margin: 5px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
            </div>
            ` : ''}

            <div class="divider"></div>

            <div class="cta-container">
                <a href="https://tafsirkurd.com/Quran.html" class="cta-button">هەر نها بخوینە ←</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, selected.text);
    },

    // Late Reminder (End of Day)
    lateReminder: (userName, streak) => {
        const message = "It's almost the end of the day! Read one ayah to keep your streak unbroken 🌖.";

        const content = `
            <div class="emoji">⏰</div>
            <h2 style="color: #f59e0b; text-align: center; margin: 0 0 20px 0;">Late Reminder</h2>
            <p class="message">${message}</p>
            ${streak > 0 ? `<p style="text-align: center; font-size: 16px; color: #666;">Your <strong style="color: #f59e0b;">${streak} day streak</strong> is waiting!</p>` : ''}
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/quran" class="cta-button" style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);">Read Now →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
    },

    // Streak Broken / Restart
    streakBroken: (userName) => {
        const message = "Don't worry if you missed yesterday. Restart today — Allah loves consistency ❤️.";

        const content = `
            <div class="emoji">✨</div>
            <h2 style="color: #667eea; text-align: center; margin: 0 0 20px 0;">A New Chance</h2>
            <p class="message">${message}</p>
            <p style="text-align: center; font-size: 16px; color: #666;">A new day, a new chance to reconnect with the Qur'an 🌅.</p>
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/quran" class="cta-button">Start Fresh →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
    },

    // Friday (Jumu'ah) Reminder
    friday: (userName) => {
        const message = "Friday reminder: increase your Qur'an recitation — it's the best dhikr on Jumu'ah 🌸.";

        const content = `
            <div class="emoji">🕌</div>
            <h2 style="color: #10b981; text-align: center; margin: 0 0 20px 0;">Jumu'ah Mubarak</h2>
            <p class="message">${message}</p>
            <p style="text-align: center; font-size: 16px; color: #666;">May this blessed day bring you peace and barakah.</p>
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/quran" class="cta-button" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">Read Quran →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
    },

    // Goal Reached
    goalReached: (userName, goalName) => {
        const message = `Goal reached! You completed ${goalName} — may Allah reward your effort 🤍.`;

        const content = `
            <div class="emoji">🏆</div>
            <h2 style="color: #f59e0b; text-align: center; margin: 0 0 20px 0;">Goal Achieved!</h2>
            <p class="message">${message}</p>
            <p style="text-align: center; font-size: 16px; color: #666;">Alhamdulillah! Keep going — you're doing amazing!</p>
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/goals" class="cta-button" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">Set New Goal →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
    },

    // Milestone Celebration
    milestone: (userName, verseCount) => {
        const message = `Alhamdulillah! You've reached ${verseCount} verses — keep it going 🌿.`;

        const content = `
            <div class="emoji">🌟</div>
            <h2 style="color: #8b5cf6; text-align: center; margin: 0 0 20px 0;">Milestone Reached!</h2>
            <p class="message">${message}</p>
            <p style="text-align: center; font-size: 16px; color: #666;">Every ayah you read adds light to your life. Keep reading, believer 🌙.</p>
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/quran" class="cta-button" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">Continue Journey →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
    },

    // Inspirational Weekly
    inspirational: (userName) => {
        const messages = [
            "A little Qur'an daily is better than much rarely. Keep your heart connected 💫.",
            "The Qur'an heals hearts — even one verse changes everything 💖.",
            "Every ayah you read adds light to your life. Keep reading, believer 🌙.",
            "When your heart feels heavy, open the Book that never disappoints 📖."
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];

        const content = `
            <div class="emoji">💌</div>
            <h2 style="color: #ec4899; text-align: center; margin: 0 0 20px 0;">Words of Inspiration</h2>
            <p class="message">${message}</p>
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/quran" class="cta-button" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">Open Quran →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
    },

    // Ramadan Preparation
    ramadan: (userName) => {
        const message = "Ramadan is near! Set your Qur'an goal now and prepare your heart 🌙.";

        const content = `
            <div class="emoji">🌙</div>
            <h2 style="color: #667eea; text-align: center; margin: 0 0 20px 0;">Ramadan is Coming</h2>
            <p class="message">${message}</p>
            <p style="text-align: center; font-size: 16px; color: #666;">Start building your habit now — consistency today = success in Ramadan.</p>
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/goals" class="cta-button">Set Ramadan Goal →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.EmailTemplates = EmailTemplates;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailTemplates;
}
