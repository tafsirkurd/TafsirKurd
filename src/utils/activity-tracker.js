// Activity Tracker - Sends all user activity to Discord
// Import this in your HTML files

class ActivityTracker {
    constructor() {
        this.endpoint = '/activity-monitor';
    }

    async track(type, data) {
        try {
            await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, data })
            });
        } catch (error) {
            console.error('Activity tracking error:', error);
        }
    }

    // User logged in
    userLogin(user) {
        this.track('user_login', {
            name: user.displayName || user.email,
            email: user.email,
            picture: user.photoURL,
            location: this.getLocation()
        });
    }

    // Started reading session
    readingStart(surah, ayah, progress) {
        const user = this.getCurrentUser();
        this.track('reading_session_start', {
            userName: user?.displayName || user?.email || 'User',
            surah,
            ayah,
            progress
        });
    }

    // Bookmark added
    bookmarkAdded(surah, ayah, totalBookmarks) {
        const user = this.getCurrentUser();
        this.track('bookmark_added', {
            userName: user?.displayName || user?.email || 'User',
            surah,
            ayah,
            totalBookmarks
        });
    }

    // Daily goal achieved
    goalAchieved(goal, readToday, streak) {
        const user = this.getCurrentUser();
        this.track('goal_achieved', {
            userName: user?.displayName || user?.email || 'User',
            goal,
            readToday,
            streak
        });
    }

    // Surah completed
    surahCompleted(surah, surahName, ayahs, overallProgress) {
        const user = this.getCurrentUser();
        this.track('surah_completed', {
            userName: user?.displayName || user?.email || 'User',
            surah,
            surahName,
            ayahs,
            overallProgress
        });
    }

    // Juz completed
    juzCompleted(juz, daysTaken, progress) {
        const user = this.getCurrentUser();
        this.track('juz_completed', {
            userName: user?.displayName || user?.email || 'User',
            juz,
            daysTaken,
            progress
        });
    }

    // Profile updated
    profileUpdated(changes) {
        const user = this.getCurrentUser();
        this.track('profile_updated', {
            userName: user?.displayName || user?.email || 'User',
            changes
        });
    }

    // Goal set
    goalSet(dailyGoal, goalType) {
        const user = this.getCurrentUser();
        this.track('goal_set', {
            userName: user?.displayName || user?.email || 'User',
            dailyGoal,
            goalType
        });
    }

    // Error occurred
    errorOccurred(error, page) {
        const user = this.getCurrentUser();
        this.track('error_occurred', {
            error: error.toString(),
            page: page || window.location.pathname,
            user: user?.email || 'Anonymous'
        });
    }

    // Search query
    searchQuery(query, results) {
        this.track('search_query', {
            query,
            results
        });
    }

    // Page view (for important pages only)
    pageView(page) {
        const user = this.getCurrentUser();
        this.track('page_view', {
            page: page || window.location.pathname,
            user: user?.email || 'Guest'
        });
    }

    // Helper: Get current user from Firebase
    getCurrentUser() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            return firebase.auth().currentUser;
        }
        return null;
    }

    // Helper: Get approximate location
    getLocation() {
        // You can integrate with IP geolocation API if needed
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
}

// Create global instance
window.activityTracker = new ActivityTracker();

// Auto-track errors
window.addEventListener('error', (event) => {
    window.activityTracker.errorOccurred(event.error, window.location.pathname);
});

// Auto-track important page views
if (window.location.pathname.includes('admin') || window.location.pathname.includes('settings')) {
    window.activityTracker.pageView(window.location.pathname);
}
