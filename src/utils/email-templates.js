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
            opacity: 0.05;
            background-image:
                repeating-linear-gradient(45deg, transparent, transparent 35px, #ffd700 35px, #ffd700 36px),
                repeating-linear-gradient(-45deg, transparent, transparent 35px, #ffd700 35px, #ffd700 36px);
            background-size: 50px 50px;
            pointer-events: none;
            animation: patternShift 30s linear infinite;
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
            background: #fafafa;
            border-right: 4px solid #ffd700;
            padding: 25px;
            border-radius: 0;
            margin: 25px 0;
            position: relative;
        }
        .message-box::before {
            content: '✨';
            position: absolute;
            top: 10px;
            left: 10px;
            font-size: 24px;
            opacity: 0.3;
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
            font-size: 28px;
            color: #27ae60;
            text-align: center;
            margin: 30px 0;
            padding: 30px;
            background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
            border-radius: 0;
            line-height: 2.4;
            border-top: 2px solid #ffd700;
            border-bottom: 2px solid #ffd700;
            position: relative;
        }
        .quran-verse::before {
            content: '☪';
            position: absolute;
            top: 5px;
            right: 15px;
            font-size: 18px;
            color: #ffd700;
            opacity: 0.4;
        }
        .quran-verse::after {
            content: '☪';
            position: absolute;
            bottom: 5px;
            left: 15px;
            font-size: 18px;
            color: #ffd700;
            opacity: 0.4;
        }
        .cta-container {
            text-align: center;
            margin: 40px 0;
        }
        .cta-button {
            display: inline-block;
            background: #000000;
            color: #ffffff;
            padding: 16px 45px;
            text-decoration: none;
            border-radius: 0;
            font-weight: 600;
            font-size: 17px;
            border: 2px solid #000000;
            transition: all 0.3s;
        }
        .cta-button:hover {
            background: #ffffff;
            color: #000000;
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
            font-size: 56px;
            font-weight: 700;
            color: #ffd700;
            margin: 0;
            text-shadow: 2px 2px 0px rgba(0,0,0,0.1);
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
            font-size: 60px;
            margin: 20px 0;
            display: block;
            filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
            animation: moonGlow 3s ease-in-out infinite;
        }
        @keyframes moonGlow {
            0%, 100% {
                filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
                transform: scale(1);
            }
            50% {
                filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.9));
                transform: scale(1.1);
            }
        }
        .quran-decoration {
            text-align: center;
            font-size: 80px;
            opacity: 0.08;
            margin: 20px 0;
            color: #ffd700;
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
            <span class="moon-icon">🌙</span>
            <h2 style="color: #000000; text-align: center; margin: 0 0 30px 0; font-size: 32px; font-weight: 700;">بیرئینانا رۆژانە</h2>

            <div class="quran-decoration">📖</div>

            <div class="message-box">
                <p class="message">${selected.text}</p>
            </div>

            <div class="quran-verse">${selected.verse}</div>

            ${streak > 0 ? `
            <div style="text-align: center; margin: 40px 0; padding: 30px; background: #fafafa;">
                <p style="font-size: 18px; color: #000000; margin: 5px 0; font-weight: 600;">تۆ د رۆژا</p>
                <p class="stat-number">${dayCount}</p>
                <p style="font-size: 18px; color: #000000; margin: 5px 0; font-weight: 600;">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
                <div style="margin-top: 20px;">
                    <span style="font-size: 30px;">⭐</span>
                </div>
            </div>
            ` : ''}

            <div class="divider"></div>

            <div class="cta-container">
                <a href="https://tafsirkurd.com/Quran.html" class="cta-button" style="background: #27ae60; border-color: #27ae60; color: #ffffff;">هەر نها بخوینە ←</a>
            </div>

            <div style="text-align: center; margin: 30px 0; opacity: 0.3;">
                <span style="font-size: 24px;">☪️</span>
                <span style="font-size: 24px; margin: 0 15px;">✨</span>
                <span style="font-size: 24px;">☪️</span>
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
