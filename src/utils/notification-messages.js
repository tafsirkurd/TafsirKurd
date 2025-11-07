// Notification Messages System for TafsirKurd
// English version - will be replaced with Kurdish later

const NotificationMessages = {
    // 🌅 Daily Qur'an Progress & Streak
    dailyProgress: {
        streakCompleted: "Masha'Allah! You've completed today's reading — your streak lives on 🌙.",

        journeyDay: (dayCount) => `You're on day ${dayCount} of your Qur'an journey. Keep the light alive!`,

        streakGlowing: "Your streak is glowing — don't let it fade. Read just one ayah today 🌸.",

        oneVerseReminder: "Reminder: even one verse brings you closer to Allah. Continue your streak now.",

        consistencyWorship: "Consistency is worship — open your Qur'an and continue your progress 🌿."
    },

    // 🌙 Missed / Late Reminder
    missedReminder: {
        endOfDay: "It's almost the end of the day! Read one ayah to keep your streak unbroken 🌖.",

        streakPaused: "Your Qur'an reading streak paused — start again today for new blessings ✨.",

        missedYesterday: "Don't worry if you missed yesterday. Restart today — Allah loves consistency ❤️.",

        newChance: "A new day, a new chance to reconnect with the Qur'an 🌅."
    },

    // 📖 Goal & Achievement
    goalAchievement: {
        goalReached: (goalName) => `Goal reached! You completed ${goalName} — may Allah reward your effort 🤍.`,

        gettingCloser: "You're getting closer to your goal every day — barakAllahu feek!",

        stepsRemaining: (remaining) => `Only ${remaining} steps left to complete your goal. Keep going, you've got this 💪.`,

        progressSaved: "Progress saved successfully ✅. Continue your journey whenever you're ready."
    },

    // 💌 Inspirational / Weekly Motivation
    inspirational: {
        friday: "Friday reminder: increase your Qur'an recitation — it's the best dhikr on Jumu'ah 🌸.",

        littleDaily: "A little Qur'an daily is better than much rarely. Keep your heart connected 💫.",

        healsHearts: "The Qur'an heals hearts — even one verse changes everything 💖.",

        addsLight: "Every ayah you read adds light to your life. Keep reading, believer 🌙.",

        neverDisappoints: "When your heart feels heavy, open the Book that never disappoints 📖."
    },

    // ⚙️ System or General Alerts
    system: {
        progressSaved: "Your progress was saved successfully ✅.",

        loadError: "We couldn't load your streak data. Please refresh the page.",

        newVersion: "New version of TafsirKurd is available. Refresh to see updates 🔁.",

        notificationUpdated: "Notification settings updated successfully 📨.",

        emailSubscribed: "Email reminder subscribed — you'll receive updates soon."
    },

    // 🌿 Special Events / Ramadan / Milestones
    specialEvents: {
        ramadanNear: "Ramadan is near! Set your Qur'an goal now and prepare your heart 🌙.",

        milestone: (count) => `Alhamdulillah! You've reached ${count} verses — keep it going 🌿.`,

        newTafsir: "New tafsir section added! Explore deeper meanings at tafsirkurd.com/quran 📜.",

        reflectToday: "Special reminder: Reflect on today's verse — it might be the one that changes your day ✨."
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
