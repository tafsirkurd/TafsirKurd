/**
 * Cloud Sync Manager - Syncs ALL user data to Supabase
 * Ensures data persists across devices and survives cache deletion
 * Data only deleted when user deletes their account
 */

class CloudSyncManager {
    constructor() {
        this.supabase = null;
        this.userId = null;
        this.syncInterval = null;
        this.isSyncing = false;
        this.lastSyncTime = 0;
        this.SYNC_INTERVAL = 30000; // Sync every 30 seconds
    }

    /**
     * Initialize cloud sync with Supabase client and user ID
     */
    async initialize(supabaseClient, userId) {
        if (!supabaseClient || !userId) {
            console.error('CloudSync: Missing supabase client or user ID');
            return false;
        }

        this.supabase = supabaseClient;
        this.userId = userId;

        // Load all data from cloud on first login
        await this.loadAllFromCloud();

        // Start auto-sync
        this.startAutoSync();

        return true;
    }

    /**
     * Start automatic periodic sync
     */
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Sync every 30 seconds
        this.syncInterval = setInterval(() => {
            this.syncAllToCloud().catch(err => {
                console.error('Auto-sync failed:', err);
            });
        }, this.SYNC_INTERVAL);
    }

    /**
     * Stop automatic sync
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    /**
     * Sync ALL user data to cloud
     */
    async syncAllToCloud() {
        if (!this.supabase || !this.userId || this.isSyncing) {
            return;
        }

        try {
            this.isSyncing = true;

            // Gather all data from localStorage
            const userData = {
                user_id: this.userId,

                // Reading progress
                current_surah: parseInt(localStorage.getItem('currentSurah')) || 1,
                current_ayah: parseInt(localStorage.getItem('currentAyah')) || 1,
                scroll_position: parseInt(localStorage.getItem('scrollPosition')) || 0,
                last_read_time: new Date().toISOString(),

                // Bookmarks
                bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '[]'),

                // Reading goals
                daily_goal: parseInt(localStorage.getItem('dailyGoal')) || 0,
                monthly_goal: parseInt(localStorage.getItem('monthlyGoal')) || 0,
                reading_streak: parseInt(localStorage.getItem('readingStreak')) || 0,
                total_ayahs_read: parseInt(localStorage.getItem('totalAyahsRead')) || 0,
                completed_surahs: JSON.parse(localStorage.getItem('completedSurahs') || '[]'),

                // Reading history
                reading_history: JSON.parse(localStorage.getItem('readingHistory') || '[]'),

                // Settings
                theme: localStorage.getItem('theme') || 'light',
                font_size: localStorage.getItem('fontSize') || 'medium',
                arabic_font: localStorage.getItem('arabicFont') || 'default',
                show_translation: localStorage.getItem('showTranslation') === 'true',
                show_tafsir: localStorage.getItem('showTafsir') === 'true',
                auto_scroll: localStorage.getItem('autoScroll') === 'true',

                // Notifications
                notifications_enabled: localStorage.getItem('notificationsEnabled') === 'true',
                reminder_times: JSON.parse(localStorage.getItem('reminderTimes') || '[]'),

                // Last updated timestamp
                updated_at: new Date().toISOString()
            };

            // Upsert to Supabase (insert or update)
            const { error } = await this.supabase
                .from('user_data')
                .upsert(userData, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                });

            if (error) {
                throw error;
            }

            this.lastSyncTime = Date.now();

        } catch (error) {
            console.error('Cloud sync failed:', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Load ALL user data from cloud
     */
    async loadAllFromCloud() {
        if (!this.supabase || !this.userId) {
            console.error('CloudSync: Cannot load, missing client or user ID');
            return null;
        }

        try {
            // Get user data from Supabase
            const { data, error } = await this.supabase
                .from('user_data')
                .select('*')
                .eq('user_id', this.userId)
                .single();

            if (error) {
                // If no data exists yet, that's okay (new user)
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }

            if (!data) {
                return null;
            }

            // Restore all data to localStorage
            if (data.current_surah) localStorage.setItem('currentSurah', data.current_surah.toString());
            if (data.current_ayah) localStorage.setItem('currentAyah', data.current_ayah.toString());
            if (data.scroll_position) localStorage.setItem('scrollPosition', data.scroll_position.toString());

            if (data.bookmarks) localStorage.setItem('bookmarks', JSON.stringify(data.bookmarks));

            if (data.daily_goal) localStorage.setItem('dailyGoal', data.daily_goal.toString());
            if (data.monthly_goal) localStorage.setItem('monthlyGoal', data.monthly_goal.toString());
            if (data.reading_streak) localStorage.setItem('readingStreak', data.reading_streak.toString());
            if (data.total_ayahs_read) localStorage.setItem('totalAyahsRead', data.total_ayahs_read.toString());
            if (data.completed_surahs) localStorage.setItem('completedSurahs', JSON.stringify(data.completed_surahs));

            if (data.reading_history) localStorage.setItem('readingHistory', JSON.stringify(data.reading_history));

            if (data.theme) localStorage.setItem('theme', data.theme);
            if (data.font_size) localStorage.setItem('fontSize', data.font_size);
            if (data.arabic_font) localStorage.setItem('arabicFont', data.arabic_font);

            localStorage.setItem('showTranslation', data.show_translation ? 'true' : 'false');
            localStorage.setItem('showTafsir', data.show_tafsir ? 'true' : 'false');
            localStorage.setItem('autoScroll', data.auto_scroll ? 'true' : 'false');

            localStorage.setItem('notificationsEnabled', data.notifications_enabled ? 'true' : 'false');
            if (data.reminder_times) localStorage.setItem('reminderTimes', JSON.stringify(data.reminder_times));

            return data;

        } catch (error) {
            console.error('Failed to load data from cloud:', error);
            return null;
        }
    }

    /**
     * Save reading progress to cloud immediately
     */
    async saveReadingProgress(surah, ayah, scrollPosition = 0) {
        if (!this.supabase || !this.userId) return;

        try {
            const { error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.userId,
                    current_surah: surah,
                    current_ayah: ayah,
                    scroll_position: scrollPosition,
                    last_read_time: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                });

            if (error) throw error;
        } catch (error) {
            console.error('Failed to save reading progress:', error);
        }
    }

    /**
     * Save bookmark to cloud immediately
     */
    async saveBookmark(bookmark) {
        if (!this.supabase || !this.userId) return;

        try {
            // Get current bookmarks from cloud
            const { data } = await this.supabase
                .from('user_data')
                .select('bookmarks')
                .eq('user_id', this.userId)
                .single();

            const currentBookmarks = data?.bookmarks || [];

            // Add new bookmark
            const updatedBookmarks = [...currentBookmarks, bookmark];

            // Save back to cloud
            const { error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.userId,
                    bookmarks: updatedBookmarks,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                });

            if (error) throw error;
        } catch (error) {
            console.error('Failed to save bookmark:', error);
        }
    }

    /**
     * Delete bookmark from cloud
     */
    async deleteBookmark(bookmarkId) {
        if (!this.supabase || !this.userId) return;

        try {
            // Get current bookmarks from cloud
            const { data } = await this.supabase
                .from('user_data')
                .select('bookmarks')
                .eq('user_id', this.userId)
                .single();

            const currentBookmarks = data?.bookmarks || [];

            // Remove bookmark
            const updatedBookmarks = currentBookmarks.filter(b => b.id !== bookmarkId);

            // Save back to cloud
            const { error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.userId,
                    bookmarks: updatedBookmarks,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                });

            if (error) throw error;
        } catch (error) {
            console.error('Failed to delete bookmark:', error);
        }
    }

    /**
     * Save reading goal to cloud
     */
    async saveReadingGoal(dailyGoal, monthlyGoal) {
        if (!this.supabase || !this.userId) return;

        try {
            const { error } = await this.supabase
                .from('user_data')
                .upsert({
                    user_id: this.userId,
                    daily_goal: dailyGoal,
                    monthly_goal: monthlyGoal,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                });

            if (error) throw error;
        } catch (error) {
            console.error('Failed to save reading goal:', error);
        }
    }

    /**
     * Update reading stats
     */
    async updateReadingStats(stats) {
        if (!this.supabase || !this.userId) return;

        try {
            const updateData = {
                user_id: this.userId,
                updated_at: new Date().toISOString()
            };

            if (stats.totalAyahsRead !== undefined) updateData.total_ayahs_read = stats.totalAyahsRead;
            if (stats.readingStreak !== undefined) updateData.reading_streak = stats.readingStreak;
            if (stats.completedSurahs !== undefined) updateData.completed_surahs = stats.completedSurahs;

            const { error } = await this.supabase
                .from('user_data')
                .upsert(updateData, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                });

            if (error) throw error;
        } catch (error) {
            console.error('Failed to update reading stats:', error);
        }
    }

    /**
     * Save settings to cloud
     */
    async saveSettings(settings) {
        if (!this.supabase || !this.userId) return;

        try {
            const updateData = {
                user_id: this.userId,
                updated_at: new Date().toISOString()
            };

            if (settings.theme) updateData.theme = settings.theme;
            if (settings.fontSize) updateData.font_size = settings.fontSize;
            if (settings.arabicFont) updateData.arabic_font = settings.arabicFont;
            if (settings.showTranslation !== undefined) updateData.show_translation = settings.showTranslation;
            if (settings.showTafsir !== undefined) updateData.show_tafsir = settings.showTafsir;
            if (settings.autoScroll !== undefined) updateData.auto_scroll = settings.autoScroll;

            const { error } = await this.supabase
                .from('user_data')
                .upsert(updateData, {
                    onConflict: 'user_id',
                    ignoreDuplicates: false
                });

            if (error) throw error;
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Delete all user data (when account is deleted)
     */
    async deleteAllUserData() {
        if (!this.supabase || !this.userId) return;

        try {
            // Stop auto-sync first
            this.stopAutoSync();

            // Delete from cloud
            const { error } = await this.supabase
                .from('user_data')
                .delete()
                .eq('user_id', this.userId);

            if (error) throw error;

            // Clear local storage
            localStorage.clear();
            sessionStorage.clear();

            // Clear IndexedDB
            if (window.secureStorage) {
                await window.secureStorage.clearAll();
            }

            return true;
        } catch (error) {
            console.error('Failed to delete user data:', error);
            return false;
        }
    }

    /**
     * Force sync now (don't wait for auto-sync)
     */
    async forceSyncNow() {
        return await this.syncAllToCloud();
    }
}

// Create global instance
window.cloudSync = new CloudSyncManager();
