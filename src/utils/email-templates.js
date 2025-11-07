// Beautiful HTML Email Templates for TafsirKurd

const EmailTemplates = {
    // Base template wrapper
    getBaseTemplate: (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TafsirKurd - Quran Reminder</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            direction: rtl;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .message {
            font-size: 18px;
            line-height: 1.8;
            color: #333333;
            margin-bottom: 30px;
            text-align: center;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
        }
        .footer {
            background-color: #f8f8f8;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            color: #666666;
        }
        .unsubscribe {
            color: #999999;
            font-size: 12px;
            margin-top: 20px;
        }
        .unsubscribe a {
            color: #667eea;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e0e0e0, transparent);
            margin: 30px 0;
        }
        .emoji {
            font-size: 48px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader}
    </div>
    <div class="email-container">
        <div class="header">
            <h1 class="logo">📖 TafsirKurd</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p style="margin: 0 0 10px 0;">© 2025 TafsirKurd - Your Quran Journey Companion</p>
            <p style="margin: 0;">Continue your journey at <a href="https://tafsirkurd.com" style="color: #667eea;">tafsirkurd.com</a></p>
            <div class="unsubscribe">
                <p>Don't want to receive these reminders? <a href="https://tafsirkurd.com/settings">Manage preferences</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `,

    // Daily Streak Reminder
    dailyStreak: (userName, streak, dayCount) => {
        const messages = [
            `Your streak is glowing — don't let it fade. Read just one ayah today 🌸.`,
            `Reminder: even one verse brings you closer to Allah. Continue your streak now.`,
            `Consistency is worship — open your Qur'an and continue your progress 🌿.`
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];

        const content = `
            <div class="emoji">🌙</div>
            <h2 style="color: #667eea; text-align: center; margin: 0 0 20px 0;">Daily Quran Reminder</h2>
            <p class="message">${message}</p>
            ${streak > 0 ? `<p style="text-align: center; font-size: 16px; color: #666;">You're on day <strong style="color: #667eea; font-size: 24px;">${dayCount}</strong> of your journey</p>` : ''}
            <div class="divider"></div>
            <div style="text-align: center;">
                <a href="https://tafsirkurd.com/quran" class="cta-button">Continue Reading →</a>
            </div>
        `;

        return EmailTemplates.getBaseTemplate(content, message);
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
