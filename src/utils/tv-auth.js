// TV Authentication Middleware
// Enforces 100% login requirement for all TV/Deen Media pages
// No guest access allowed

class TVAuth {
    constructor() {
        this.supabase = null;
        this.initialized = false;
    }

    // Initialize with Supabase client
    async init() {
        if (this.initialized) return;

        // Wait for Supabase to be available
        const maxAttempts = 50;
        let attempts = 0;

        while (!window.supabase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.supabase) {
            console.error('❌ Supabase not loaded - TV auth cannot function');
            return false;
        }

        this.supabase = window.supabase;
        this.initialized = true;
        return true;
    }

    // Check if user is authenticated - CRITICAL for TV access
    async checkAuth() {
        await this.init();

        if (!this.supabase) {
            console.error('❌ TV Auth: Supabase not available');
            this.redirectToLogin();
            return false;
        }

        try {
            // Get current session
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) {
                console.error('❌ TV Auth error:', error);
                this.redirectToLogin();
                return false;
            }

            if (!session) {
                console.log('🔒 No session - redirecting to login');
                this.redirectToLogin();
                return false;
            }

            console.log('✅ User authenticated:', session.user.email);
            return true;

        } catch (error) {
            console.error('❌ TV Auth exception:', error);
            this.redirectToLogin();
            return false;
        }
    }

    // Redirect to login page
    redirectToLogin() {
        const currentPath = window.location.pathname + window.location.hash;
        const loginUrl = `/login.html?redirect=${encodeURIComponent(currentPath)}`;

        console.log('🔒 Redirecting to:', loginUrl);
        window.location.href = loginUrl;
    }

    // Get user profile and TV preferences
    async getUserProfile() {
        await this.init();

        try {
            // Get current user
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();

            if (userError || !user) {
                console.error('❌ Cannot get user:', userError);
                return null;
            }

            // Get user data with TV preferences
            const { data: userData, error: dataError } = await this.supabase
                .from('user_data')
                .select('watch_progress, bookmarks, watch_history, preferences')
                .eq('user_id', user.id)
                .single();

            if (dataError) {
                console.warn('⚠️ No user_data found, creating default...');

                // Create default user_data entry
                await this.supabase.from('user_data').insert({
                    user_id: user.id,
                    watch_progress: {},
                    bookmarks: [],
                    watch_history: [],
                    preferences: {
                        audioOnlyMode: true,  // Audio-first by default
                        autoPlayNext: true,
                        defaultQuality: '1080p',
                        playbackSpeed: 1.0
                    }
                });

                return {
                    user,
                    preferences: {
                        audioOnlyMode: true,
                        autoPlayNext: true,
                        defaultQuality: '1080p',
                        playbackSpeed: 1.0
                    },
                    watchProgress: {},
                    bookmarks: [],
                    watchHistory: []
                };
            }

            return {
                user,
                preferences: userData?.preferences || { audioOnlyMode: true },
                watchProgress: userData?.watch_progress || {},
                bookmarks: userData?.bookmarks || [],
                watchHistory: userData?.watch_history || []
            };

        } catch (error) {
            console.error('❌ Error getting user profile:', error);
            return null;
        }
    }

    // Save user preferences
    async savePreferences(preferences) {
        await this.init();

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return false;

            const { error } = await this.supabase
                .from('user_data')
                .update({ preferences })
                .eq('user_id', user.id);

            if (error) {
                console.error('❌ Error saving preferences:', error);
                return false;
            }

            console.log('✅ Preferences saved');
            return true;

        } catch (error) {
            console.error('❌ Exception saving preferences:', error);
            return false;
        }
    }

    // Update watch progress
    async updateWatchProgress(episodeId, progress) {
        await this.init();

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return false;

            // Get current watch_progress
            const { data: userData } = await this.supabase
                .from('user_data')
                .select('watch_progress')
                .eq('user_id', user.id)
                .single();

            const currentProgress = userData?.watch_progress || {};
            currentProgress[episodeId] = progress;

            // Update watch_progress
            const { error } = await this.supabase
                .from('user_data')
                .update({ watch_progress: currentProgress })
                .eq('user_id', user.id);

            if (error) {
                console.error('❌ Error updating watch progress:', error);
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Exception updating progress:', error);
            return false;
        }
    }

    // Logout
    async logout() {
        await this.init();

        try {
            const { error } = await this.supabase.auth.signOut();

            if (error) {
                console.error('❌ Logout error:', error);
                return false;
            }

            console.log('✅ Logged out successfully');
            window.location.href = '/login.html';
            return true;

        } catch (error) {
            console.error('❌ Exception during logout:', error);
            return false;
        }
    }
}

// Create global instance
window.tvAuth = new TVAuth();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TVAuth;
}
