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
        body {
            margin: 0;
            padding: 0;
            font-family: 'IBM Plex Sans Arabic', -apple-system, sans-serif;
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
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            border-bottom: 3px solid #ffd700;
        }
        .logo {
            font-size: 22px;
            font-weight: 600;
            color: #ffffff;
            margin: 0;
            letter-spacing: 1px;
        }
        .islamic-pattern {
            text-align: center;
            font-size: 60px;
            margin: 30px 0;
            opacity: 0.1;
            line-height: 1;
        }
        .content {
            padding: 40px 30px;
            background: #ffffff;
        }
        .message-box {
            background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%);
            border-left: 4px solid #27ae60;
            padding: 25px;
            margin: 25px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .message {
            font-size: 16px;
            line-height: 1.9;
            color: #000000;
            margin: 0;
            text-align: right;
            font-weight: 400;
        }
        .quran-verse {
            font-family: 'IBM Plex Sans Arabic', sans-serif;
            font-size: 20px;
            color: #27ae60;
            text-align: center;
            margin: 30px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f0f9f4 0%, #ffffff 100%);
            line-height: 2.2;
            border-top: 2px solid #ffd700;
            border-bottom: 2px solid #ffd700;
            font-weight: 500;
        }
        .cta-container {
            text-align: center;
            margin: 40px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            color: #ffffff;
            padding: 14px 35px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            border: none;
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
            transform: translateY(-2px);
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
            font-size: 48px;
            font-weight: 700;
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 10px 0;
        }
        .stat-label {
            font-size: 14px;
            color: #000000;
            margin: 5px 0;
            font-weight: 500;
        }
        .stat-box {
            background: linear-gradient(135deg, #fffbea 0%, #ffffff 100%);
            border: 2px solid #ffd700;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.15);
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
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader}
    </div>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <h1 class="logo">تەفسیرکورد</h1>
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
            <h2 style="color: #000000; margin: 0 0 25px 0; font-size: 20px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #ffd700;">بیرئینانا رۆژانە</h2>

            <div class="message-box">
                <p class="message">${selected.text}</p>
            </div>

            <div class="quran-verse">${selected.verse}</div>

            ${streak > 0 ? `
            <div class="stat-box">
                <p style="font-size: 14px; color: #000000; margin: 5px 0; font-weight: 500;">تۆ د رۆژا</p>
                <p class="stat-number">${dayCount}</p>
                <p style="font-size: 14px; color: #000000; margin: 5px 0; font-weight: 500;">یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
            </div>
            ` : ''}

            <div class="divider"></div>

            <div class="cta-container">
                <a href="https://tafsirkurd.com/Quran.html" class="cta-button">بخوینە</a>
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
