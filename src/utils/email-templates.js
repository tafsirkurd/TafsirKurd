// Beautiful Quranic-themed Email Templates for TafsirKurd
// With Islamic geometric patterns and Kurdish Badini text

const EmailTemplates = {
    // Base template with simple, clean design - consistent across all devices
    getBaseTemplate: (content, preheader = '') => `
<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TafsirKurd</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader}
    </div>
    <div style="padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="padding: 24px; text-align: center; border-bottom: 1px solid #e0e0e0;">
                <p style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #000000; margin: 0; text-align: center; letter-spacing: 0.5px;">تەفسیر کورد</p>
            </div>
            ${content}
            <div style="padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="margin: 4px 0; font-size: 12px; color: #5f6368; line-height: 1.5;">© ٢٠٢٥ تەفسیر کورد - هەمی ماف د پاراستینە</p>
                <p style="margin: 8px 0 4px 0; font-size: 12px; color: #5f6368; line-height: 1.5;">
                    <a href="https://tafsirkurd.com" style="color: #1a73e8; text-decoration: none;">tafsirkurd.com</a>
                </p>
                <p style="margin: 12px 0 4px 0; font-size: 12px; color: #5f6368; line-height: 1.5;">
                    <a href="https://tafsirkurd.com/settings" style="color: #1a73e8; text-decoration: none;">ڕێکخستنان</a> ·
                    <a href="https://tafsirkurd.com/privacy-policy" style="color: #1a73e8; text-decoration: none;">پارێزراوی تایبەتمەندی</a>
                </p>
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
                text: `خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە`,
                verse: `وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا`
            },
            {
                text: `بیرئینان: هەتا ئایەتەک بتنێ ژی تە نێزیکێ خودێ دکەت. نها خشتەیا خوە بەردەوام کە.`,
                verse: `وَاذْكُر رَّبَّكَ كَثِيرًا`
            },
            {
                text: `بەردەوامبوون پەرستنە — قورئانا خوە ڤەکە و پێشکەفتنا خوە بەردەوام کە`,
                verse: `إِنَّ اللَّهَ مَعَ الصَّابِرِينَ`
            }
        ];
        const selected = messages[Math.floor(Math.random() * messages.length)];

        const content = `
            <div style="padding: 32px 24px;">
                <h1 style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 20px; font-weight: 500; color: #202124; margin: 0 0 16px 0; text-align: center;">بیرئینانا قورئانێ</h1>

                <p style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #5f6368; margin: 16px 0; text-align: center;">${selected.text}</p>

                <div style="font-family: 'KFGQPC Hafs', 'Scheherazade New', 'Traditional Arabic', serif; font-size: 28px; color: #202124; text-align: center; margin: 24px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; line-height: 2.4; direction: rtl;">${selected.verse}</div>

                ${streak > 0 ? `
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
                    <p style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 14px; color: #5f6368; margin: 0;">تۆ د رۆژا ${dayCount} یێ دا یێ ل سەر رێکا خوە یا قورئانێ</p>
                </div>
                ` : ''}

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://tafsirkurd.com/Quran.html" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 10px 24px; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 4px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">بخوینە</a>
                </div>
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
