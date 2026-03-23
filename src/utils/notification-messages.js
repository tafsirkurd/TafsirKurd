// Notification Messages System for TafsirKurd
// Kurdish Badini version

const NotificationMessages = {
    // 🌅 پێشکەفتن و خشتەی رۆژانە یێ قورئانێ
    dailyProgress: {
        streakCompleted: "ماشاءالله! تە خواندنا ئەڤرۆ ب دووماهی ئینایە — خشتەیا تە هەر بەردەوامە 🌙.",

        journeyDay: (dayCount) => `تۆ د رۆژا ${dayCount} ێ دا یێ ل سەر رێکا خوە یا قورئانێ. بلا رۆناهی هەر بمینیت!`,

        streakGlowing: "خشتەیا تە گەش و پر رۆناهی یە — نەئێخە. ئەڤرۆ بتنێ ئایەتەکێ بخوینە 🌸.",

        oneVerseReminder: "بیرئینان: هەتا ئایەتەک بتنێ ژی تە نێزیکێ خودێ دکەت. نها خشتەیا خوە بەردەوام کە.",

        consistencyWorship: "بەردەوامبوون پەرستنە — قورئانا خوە ڤەکە و پێشکەفتنا خوە بەردەوام کە 🌿."
    },

    // 🌙 بیرئینانا ژ دەستچوویی / درەنگ
    missedReminder: {
        endOfDay: "نێزیکی دووماهیا رۆژێ یە! ئایەتەکێ بخوینە دا خشتەیا تە نەشکێت 🌖.",

        streakPaused: "خشتەیا تە یا خواندنا قورئانێ راوەستیا — ئەڤرۆ ژ نوی دەستپێبکە بۆ خێر و قازانجێن نوی ✨.",

        missedYesterday: "خەم نەبە ئەگەر تە د دیرۆکێ دا ژ دەست دایە. ئەڤرۆ ژ نوی دەستپێبکە — خودێ حەز ژ بەردەوامیێ دکەت ❤️.",

        newChance: "رۆژەک نوی، دەرفەتەک نوی بۆ ڤەگۆهارتن ب قورئانێ 🌅."
    },

    // 📖 ئارمانج و دەستکەفت
    goalAchievement: {
        goalReached: (goalName) => `ئارمانج هاتە ب دەستڤەئینان! تە ${goalName} ب دووماهی ئینایە — خودێ خێرا خوە بدەتە تە 🤍.`,

        gettingCloser: "تۆ رۆژ ب رۆژ نێزیکتر دبیت ژ ئارمانجا خوە — بارک الله فیک!",

        stepsRemaining: (remaining) => `بتنێ ${remaining} ئاستێن مای بۆ ب دووماهی ئینانا ئارمانجا خوە. هەر بەردەوام بە، تۆ دشێی 💪.`,

        progressSaved: "پێشکەفتن ب سەرکەفتی هاتە پاشکەفتن ✅. هەر دەمێ تۆ ئامادە بی رێکا خوە بەردەوام کە."
    },

    // 💌 هاندان / هاندانەکا حەفتیانە
    inspirational: {
        friday: "بیرئینانا ئەینیێ: خواندنا خوە یا قورئانێ زێدە بکە — ئەڤە باشترین زکرە د رۆژا ئەینیێ دا 🌸.",

        littleDaily: "هندەک قورئان رۆژانە باشترە ژ گەلەک بتنێ جاران. دلی خوە گرێدە ب قورئانێ 💫.",

        healsHearts: "قورئان دلا ساخ دکەت — هەتا ئایەتەک بتنێ ژی هەر تشتەکی دگۆهۆریت 💖.",

        addsLight: "هەر ئایەتەکێ تۆ دخوینی رۆناهیێ ل ژیانا تە زێدە دکەت. هەر بخوینە، ئەی باوەردار 🌙.",

        neverDisappoints: "دەما دلی تە گران هەست پێدکەت، کتێبا خوە ڤەکە یا کو چ جاران بێ هیڤی ناکەت 📖."
    },

    // ⚙️ سیستەم یان ئاگەهدارکێن گشتی
    system: {
        progressSaved: "پێشکەفتنا تە ب سەرکەفتی هاتە پاشکەفتن ✅.",

        loadError: "مە نەشیایە داتایێن خشتەیا تە بار بکەین. لطفەن پەنجەرێ تازە بکە.",

        newVersion: "ڤێرژنەکا نوی یا تەفسیرکورد بەردەستە. تازە بکە بۆ دیتنا نویکرنان 🔁.",

        notificationUpdated: "سێتینگێن ئاگەهدارکرنێ ب سەرکەفتی هاتنە نویکرن 📨.",

        emailSubscribed: "ئیمەیلێ بیرئینانێ هاتە سەبسکرایبکرن — دێ د زووترین دەم دا نویکرنان وەرگری."
    },

    // 🌿 بۆنەیێن تایبەت / رەمەزان / قۆناغێن گرنگ
    specialEvents: {
        ramadanNear: "رەمەزان نێزیکە! نها ئارمانجا خوە یا قورئانێ دیارکە و دلی خوە ئامادە کە 🌙.",

        milestone: (count) => `الحمدلله! تە گەهاندیە ${count} ئایەتان — هەر بەردەوام بە 🌿.`,

        newTafsir: "پشکەکا نوی یا تەفسیرێ هاتە زێدەکرن! رامانێن دێرینتر ل tafsirkurd.com/quran ڤەکۆلین بکە 📜.",

        reflectToday: "بیرئینانەکا تایبەت: ل سەر ئایەتا ئەڤرۆ راوەستە و رامان لێ بکە — دبیت ئەڤە یاکو رۆژا تە بگۆهۆریت ✨."
    },

    // Helper function to get random message from a category
    getRandom: function(category) {
        const messages = Object.values(this[category] || {}).filter(m => typeof m === 'string');
        return messages[Math.floor(Math.random() * messages.length)] || '';
    },

    // Get notification based on context
    getContextual: function(context) {
        const { type, data = {} } = context;

        switch(type) {
            case 'dailyComplete':
                return this.dailyProgress.streakCompleted;

            case 'journeyProgress':
                return this.dailyProgress.journeyDay(data.dayCount || 1);

            case 'streakReminder':
                return this.dailyProgress.streakGlowing;

            case 'lateReminder':
                return this.missedReminder.endOfDay;

            case 'streakBroken':
                return this.missedReminder.streakPaused;

            case 'goalReached':
                return this.goalAchievement.goalReached(data.goalName || 'your goal');

            case 'goalProgress':
                return this.goalAchievement.stepsRemaining(data.remaining || 0);

            case 'friday':
                return this.inspirational.friday;

            case 'milestone':
                return this.specialEvents.milestone(data.count || 0);

            case 'ramadan':
                return this.specialEvents.ramadanNear;

            case 'saved':
                return this.system.progressSaved;

            case 'error':
                return this.system.loadError;

            case 'update':
                return this.system.newVersion;

            default:
                return this.getRandom('inspirational');
        }
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.NotificationMessages = NotificationMessages;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationMessages;
}
