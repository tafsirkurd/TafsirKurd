// Notification Scheduler for TafsirKurd
// Handles browser notifications, scheduled reminders, and daily streaks

class NotificationScheduler {
    constructor() {
        this.permission = 'default';
        this.userId = null;
        this.settings = this.loadSettings();
        this.dailyCheckInterval = null;
        this.lateReminderTimeout = null;
        this.fridayReminderTimeout = null;
        this.init();
    }

    // Safe JSON parse helper
    safeJsonParse(str, fallback) {
        if (!str) return fallback;
        try {
            return JSON.parse(str);
        } catch (e) {
            return fallback;
        }
    }

    init() {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('Browser does not support notifications');
            return;
        }

        this.permission = Notification.permission;

        // Get user ID safely
        var user = this.safeJsonParse(localStorage.getItem('user'), {});
        this.userId = user.sub || null;

        // Set up daily check
        this.scheduleDailyCheck();

        // Check if it's Friday
        this.checkFridayReminder();

        // Check for late reading reminder
        this.checkLateReminder();
    }

    loadSettings() {
        var saved = this.safeJsonParse ?
            this.safeJsonParse(localStorage.getItem('notificationSettings'), null) :
            null;

        if (!saved) {
            try {
                var savedStr = localStorage.getItem('notificationSettings');
                if (savedStr) saved = JSON.parse(savedStr);
            } catch (e) {
                saved = null;
            }
        }

        if (saved) {
            return saved;
        }

        // Default settings
        return {
            enabled: false,
            dailyReminder: true,
            streakReminder: true,
            goalReminder: true,
            fridayReminder: true,
            reminderTime: '20:00',
            lateReminderTime: '22:00'
        };
    }

    saveSettings(settings) {
        this.settings = Object.assign({}, this.settings, settings);
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save notification settings:', e);
        }
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
            try {
                var permission = await Notification.requestPermission();
                this.permission = permission;

                if (permission === 'granted') {
                    this.settings.enabled = true;
                    this.saveSettings(this.settings);

                    this.showNotification({
                        title: 'Notifications Enabled',
                        body: "You'll receive daily reminders to continue your Qur'an journey.",
                        icon: '/assets/images/logo.png'
                    });

                    return true;
                }
            } catch (e) {
                console.warn('Failed to request notification permission:', e);
            }
        }

        return false;
    }

    showNotification(options) {
        if (!this.settings.enabled || Notification.permission !== 'granted') {
            return null;
        }

        try {
            var notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/assets/images/logo.png',
                badge: '/assets/images/logo.png',
                tag: options.tag || 'tafsirkurd-notification',
                requireInteraction: false,
                silent: false,
                data: options.data || {}
            });

            notification.onclick = function() {
                window.focus();
                if (options.data && options.data.url) {
                    window.location.href = options.data.url;
                } else {
                    window.location.href = '/quran';
                }
                notification.close();
            };

            return notification;
        } catch (e) {
            console.warn('Failed to show notification:', e);
            return null;
        }
    }

    scheduleDailyCheck() {
        // Clear existing interval
        if (this.dailyCheckInterval) {
            clearInterval(this.dailyCheckInterval);
        }

        // Check every hour if we should send daily reminder
        this.dailyCheckInterval = setInterval(function() {
            this.checkDailyReminder();
        }.bind(this), 60 * 60 * 1000);

        // Also check on load
        this.checkDailyReminder();
    }

    checkDailyReminder() {
        if (!this.settings.enabled || !this.settings.dailyReminder) {
            return;
        }

        var now = new Date();
        var currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                         now.getMinutes().toString().padStart(2, '0');

        if (currentTime === this.settings.reminderTime) {
            this.checkTodayProgress();
        }
    }

    checkTodayProgress() {
        if (!this.userId) return;

        var userKey = 'quran_data_' + this.userId;
        var data = this.safeJsonParse(localStorage.getItem(userKey), {});

        var today = new Date().toDateString();
        var lastRead = data.lastReadDate ? new Date(data.lastReadDate).toDateString() : null;

        if (lastRead !== today) {
            var streak = (data.stats && data.stats.streak) ? data.stats.streak : 0;
            var message;

            if (streak > 0) {
                message = (window.NotificationMessages && window.NotificationMessages.dailyProgress &&
                          window.NotificationMessages.dailyProgress.streakGlowing) ||
                         "Your streak is glowing - don't let it fade. Read just one ayah today.";
            } else {
                message = (window.NotificationMessages && window.NotificationMessages.dailyProgress &&
                          window.NotificationMessages.dailyProgress.oneVerseReminder) ||
                         "Reminder: even one verse brings you closer to Allah. Continue your streak now.";
            }

            this.showNotification({
                title: 'Daily Quran Reminder',
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

        var now = new Date();
        var currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                         now.getMinutes().toString().padStart(2, '0');

        if (currentTime === this.settings.lateReminderTime) {
            this.sendLateReminder();
        }

        // Clear existing timeout
        if (this.lateReminderTimeout) {
            clearTimeout(this.lateReminderTimeout);
        }

        // Schedule next check
        this.lateReminderTimeout = setTimeout(function() {
            this.checkLateReminder();
        }.bind(this), 60 * 1000);
    }

    sendLateReminder() {
        if (!this.userId) return;

        var userKey = 'quran_data_' + this.userId;
        var data = this.safeJsonParse(localStorage.getItem(userKey), {});

        var today = new Date().toDateString();
        var lastRead = data.lastReadDate ? new Date(data.lastReadDate).toDateString() : null;

        if (lastRead !== today) {
            var message = (window.NotificationMessages && window.NotificationMessages.missedReminder &&
                          window.NotificationMessages.missedReminder.endOfDay) ||
                         "It's almost the end of the day! Read one ayah to keep your streak unbroken.";

            this.showNotification({
                title: 'Late Reminder',
                body: message,
                tag: 'late-reminder',
                data: { url: '/quran' }
            });
        }
    }

    checkFridayReminder() {
        var now = new Date();
        if (now.getDay() === 5) {
            if (this.settings.enabled && this.settings.fridayReminder) {
                var message = (window.NotificationMessages && window.NotificationMessages.inspirational &&
                              window.NotificationMessages.inspirational.friday) ||
                             "Friday reminder: increase your Quran recitation - it's the best dhikr on Jumuah.";

                this.showNotification({
                    title: 'Jumuah Mubarak',
                    body: message,
                    tag: 'friday-reminder',
                    data: { url: '/quran' }
                });
            }
        }

        // Clear existing timeout
        if (this.fridayReminderTimeout) {
            clearTimeout(this.fridayReminderTimeout);
        }

        // Schedule next Friday check
        var nextFriday = new Date();
        nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
        nextFriday.setHours(10, 0, 0, 0);

        var timeUntilFriday = nextFriday - now;
        if (timeUntilFriday > 0) {
            this.fridayReminderTimeout = setTimeout(function() {
                this.checkFridayReminder();
            }.bind(this), timeUntilFriday);
        }
    }

    notifyDailyComplete(dayCount) {
        if (!this.settings.enabled) return;

        var message;
        if (window.NotificationMessages && window.NotificationMessages.dailyProgress &&
            typeof window.NotificationMessages.dailyProgress.journeyDay === 'function') {
            message = window.NotificationMessages.dailyProgress.journeyDay(dayCount);
        } else {
            message = "You're on day " + dayCount + " of your Quran journey. Keep the light alive!";
        }

        this.showNotification({
            title: 'Daily Goal Complete!',
            body: message,
            tag: 'goal-complete',
            data: { url: '/quran' }
        });
    }

    notifyMilestone(verseCount) {
        if (!this.settings.enabled) return;

        var message;
        if (window.NotificationMessages && window.NotificationMessages.specialEvents &&
            typeof window.NotificationMessages.specialEvents.milestone === 'function') {
            message = window.NotificationMessages.specialEvents.milestone(verseCount);
        } else {
            message = "Alhamdulillah! You've reached " + verseCount + " verses - keep it going.";
        }

        this.showNotification({
            title: 'Milestone Reached!',
            body: message,
            tag: 'milestone',
            data: { url: '/quran' }
        });
    }

    notifyGoalReached(goalName) {
        if (!this.settings.enabled) return;

        var message;
        if (window.NotificationMessages && window.NotificationMessages.goalAchievement &&
            typeof window.NotificationMessages.goalAchievement.goalReached === 'function') {
            message = window.NotificationMessages.goalAchievement.goalReached(goalName);
        } else {
            message = "Goal reached! You completed " + goalName + " - may Allah reward your effort.";
        }

        this.showNotification({
            title: 'Goal Achieved!',
            body: message,
            tag: 'goal-reached',
            data: { url: '/goals' }
        });
    }

    // Cleanup method
    destroy() {
        if (this.dailyCheckInterval) {
            clearInterval(this.dailyCheckInterval);
            this.dailyCheckInterval = null;
        }
        if (this.lateReminderTimeout) {
            clearTimeout(this.lateReminderTimeout);
            this.lateReminderTimeout = null;
        }
        if (this.fridayReminderTimeout) {
            clearTimeout(this.fridayReminderTimeout);
            this.fridayReminderTimeout = null;
        }
    }
}

// Initialize globally
if (typeof window !== 'undefined') {
    window.notificationScheduler = new NotificationScheduler();

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        if (window.notificationScheduler && typeof window.notificationScheduler.destroy === 'function') {
            window.notificationScheduler.destroy();
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationScheduler;
}
