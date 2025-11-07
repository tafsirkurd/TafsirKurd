// Notification Scheduler for TafsirKurd
// Handles browser notifications, scheduled reminders, and daily streaks

class NotificationScheduler {
    constructor() {
        this.permission = 'default';
        this.userId = null;
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications');
            return;
        }

        this.permission = Notification.permission;

        // Get user ID
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        this.userId = user.sub;

        // Set up daily check
        this.scheduleDailyCheck();

        // Check if it's Friday
        this.checkFridayReminder();

        // Check for late reading reminder
        this.checkLateReminder();
    }

    loadSettings() {
        const saved = localStorage.getItem('notificationSettings');
        if (saved) {
            return JSON.parse(saved);
        }

        // Default settings
        return {
            enabled: false,
            dailyReminder: true,
            streakReminder: true,
            goalReminder: true,
            fridayReminder: true,
            reminderTime: '20:00', // 8 PM default
            lateReminderTime: '22:00' // 10 PM late reminder
        };
    }

    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permission = 'granted';
            this.settings.enabled = true;
            this.saveSettings(this.settings);
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permission = permission;

            if (permission === 'granted') {
                this.settings.enabled = true;
                this.saveSettings(this.settings);

                // Show welcome notification
                this.showNotification({
                    title: 'Notifications Enabled ✅',
                    body: "You'll receive daily reminders to continue your Qur'an journey.",
                    icon: '/assets/images/logo.png'
                });

                return true;
            }
        }

        return false;
    }

    showNotification({ title, body, icon, tag, data }) {
        if (!this.settings.enabled || Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(title, {
            body,
            icon: icon || '/assets/images/logo.png',
            badge: '/assets/images/logo.png',
            tag: tag || 'tafsirkurd-notification',
            requireInteraction: false,
            silent: false,
            data: data || {}
        });

        notification.onclick = () => {
            window.focus();
            if (data && data.url) {
                window.location.href = data.url;
            } else {
                window.location.href = '/quran';
            }
            notification.close();
        };

        return notification;
    }

    scheduleDailyCheck() {
        // Check every hour if we should send daily reminder
        setInterval(() => {
            this.checkDailyReminder();
        }, 60 * 60 * 1000); // Every hour

        // Also check on load
        this.checkDailyReminder();
    }

    checkDailyReminder() {
        if (!this.settings.enabled || !this.settings.dailyReminder) {
            return;
        }

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Check if it's time for daily reminder
        if (currentTime === this.settings.reminderTime) {
            this.checkTodayProgress();
        }
    }

    checkTodayProgress() {
        if (!this.userId) return;

        const userKey = 'quran_data_' + this.userId;
        const data = JSON.parse(localStorage.getItem(userKey) || '{}');

        const today = new Date().toDateString();
        const lastRead = data.lastReadDate ? new Date(data.lastReadDate).toDateString() : null;

        if (lastRead !== today) {
            // User hasn't read today
            const streak = data.stats?.streak || 0;

            let message;
            if (streak > 0) {
                message = window.NotificationMessages?.dailyProgress?.streakGlowing ||
                         "Your streak is glowing — don't let it fade. Read just one ayah today 🌸.";
            } else {
                message = window.NotificationMessages?.dailyProgress?.oneVerseReminder ||
                         "Reminder: even one verse brings you closer to Allah. Continue your streak now.";
            }

            this.showNotification({
                title: 'Daily Qur\'an Reminder 📖',
                body: message,
                tag: 'daily-reminder',
                data: { url: '/quran' }
            });
        }
    }

    checkLateReminder() {
        if (!this.settings.enabled || !this.settings.streakReminder) {
            return;
        }

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        if (currentTime === this.settings.lateReminderTime) {
            this.sendLateReminder();
        }

        // Schedule next check
        setTimeout(() => this.checkLateReminder(), 60 * 1000); // Check every minute
    }

    sendLateReminder() {
        if (!this.userId) return;

        const userKey = 'quran_data_' + this.userId;
        const data = JSON.parse(localStorage.getItem(userKey) || '{}');

        const today = new Date().toDateString();
        const lastRead = data.lastReadDate ? new Date(data.lastReadDate).toDateString() : null;

        if (lastRead !== today) {
            const message = window.NotificationMessages?.missedReminder?.endOfDay ||
                           "It's almost the end of the day! Read one ayah to keep your streak unbroken 🌖.";

            this.showNotification({
                title: 'Late Reminder 🌙',
                body: message,
                tag: 'late-reminder',
                data: { url: '/quran' }
            });
        }
    }

    checkFridayReminder() {
        const now = new Date();
        if (now.getDay() === 5) { // Friday
            if (this.settings.enabled && this.settings.fridayReminder) {
                const message = window.NotificationMessages?.inspirational?.friday ||
                               "Friday reminder: increase your Qur'an recitation — it's the best dhikr on Jumu'ah 🌸.";

                this.showNotification({
                    title: 'Jumu\'ah Mubarak 🌙',
                    body: message,
                    tag: 'friday-reminder',
                    data: { url: '/quran' }
                });
            }
        }

        // Schedule next Friday check
        const nextFriday = new Date();
        nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
        nextFriday.setHours(10, 0, 0, 0); // 10 AM on Friday

        const timeUntilFriday = nextFriday - now;
        setTimeout(() => this.checkFridayReminder(), timeUntilFriday);
    }

    // Called when user completes daily goal
    notifyDailyComplete(dayCount) {
        if (!this.settings.enabled) return;

        const message = window.NotificationMessages?.dailyProgress?.journeyDay(dayCount) ||
                       `You're on day ${dayCount} of your Qur'an journey. Keep the light alive!`;

        this.showNotification({
            title: 'Daily Goal Complete! 🎉',
            body: message,
            tag: 'goal-complete',
            data: { url: '/quran' }
        });
    }

    // Called when user reaches milestone
    notifyMilestone(verseCount) {
        if (!this.settings.enabled) return;

        const message = window.NotificationMessages?.specialEvents?.milestone(verseCount) ||
                       `Alhamdulillah! You've reached ${verseCount} verses — keep it going 🌿.`;

        this.showNotification({
            title: 'Milestone Reached! 🌟',
            body: message,
            tag: 'milestone',
            data: { url: '/quran' }
        });
    }

    // Called when goal is reached
    notifyGoalReached(goalName) {
        if (!this.settings.enabled) return;

        const message = window.NotificationMessages?.goalAchievement?.goalReached(goalName) ||
                       `Goal reached! You completed ${goalName} — may Allah reward your effort 🤍.`;

        this.showNotification({
            title: 'Goal Achieved! 🏆',
            body: message,
            tag: 'goal-reached',
            data: { url: '/goals' }
        });
    }
}

// Initialize globally
if (typeof window !== 'undefined') {
    window.notificationScheduler = new NotificationScheduler();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationScheduler;
}
