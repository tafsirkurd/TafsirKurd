// Admin Dashboard Statistics Loader
// Fetches stats from secure backend API endpoint
// v1.0

const STATS_API_URL = '/admin-stats';

/**
 * Load dashboard statistics from secure backend
 * @returns {Promise<Object>} Stats object with users, videos, messages data
 */
async function loadDashboardStats() {
    try {
        const token = sessionStorage.getItem('adminToken');

        if (!token) {
            console.error('❌ No admin token found');
            return null;
        }

        console.log('📊 Loading dashboard statistics...');

        const response = await fetch(STATS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            console.error('❌ Stats API error:', response.status);
            return null;
        }

        const data = await response.json();

        if (!data.success) {
            console.error('❌ Stats API returned error:', data.error);
            return null;
        }

        console.log('✅ Dashboard stats loaded:', data.stats);
        return data.stats;

    } catch (error) {
        console.error('❌ Error loading dashboard stats:', error);
        return null;
    }
}

/**
 * Update dashboard UI with loaded stats
 * @param {Object} stats - Stats object from API
 */
function updateDashboardUI(stats) {
    if (!stats) {
        console.error('❌ No stats to update UI with');
        return;
    }

    // Update Total Users
    const userCountElement = document.querySelector('.stat-card:nth-child(1) .stat-number');
    if (userCountElement) {
        userCountElement.textContent = (stats.users?.total ?? 0).toLocaleString();
    }

    // Update Total Videos
    const videoCountElement = document.querySelector('.stat-card:nth-child(2) .stat-number');
    if (videoCountElement) {
        videoCountElement.textContent = (stats.videos?.total ?? 0).toLocaleString();
    }

    // Update Unread Messages
    const messageCountElement = document.querySelector('.stat-card:nth-child(3) .stat-number');
    if (messageCountElement) {
        messageCountElement.textContent = (stats.messages?.unread ?? 0).toLocaleString();
    }

    console.log('✅ Dashboard UI updated with stats');
}

/**
 * Initialize dashboard stats loading
 * Call this when dashboard page loads
 */
async function initDashboardStats() {
    console.log('🚀 Initializing dashboard stats...');

    const stats = await loadDashboardStats();

    if (stats) {
        updateDashboardUI(stats);
    } else {
        console.warn('⚠️ Failed to load stats - showing zeros');
    }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardStats);
} else {
    initDashboardStats();
}

// Export for manual calls if needed
window.adminStats = {
    load: loadDashboardStats,
    update: updateDashboardUI,
    refresh: initDashboardStats
};
