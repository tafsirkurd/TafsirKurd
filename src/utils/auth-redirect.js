/**
 * Authentication Redirect Handler
 * Handles post-login redirects based on user profile status
 * Shows complete-signup ONCE for first-time email/quran users
 * Skips complete-signup for TV and Google users
 */

(async function() {
    'use strict';

    // Wait for Supabase client to be initialized
    async function waitForSupabase() {
        const maxRetries = 150; // 15 seconds max — covers slow connections
        for (let i = 0; i < maxRetries; i++) {
            if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
                return window.supabaseClient;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    }

    const supabase = await waitForSupabase();
    if (!supabase) {
        console.error('Cannot initialize auth redirect without Supabase');
        // Still expose empty functions to prevent errors
        window.authRedirect = {
            checkSignupStatus: async () => ({ needsCompletion: false, redirectUrl: null }),
            handlePostLoginRedirect: async () => {},
            markSignupCompleted: async () => false,
            getUserProfile: async () => null,
            createProfile: async () => {}
        };
        return;
    }

    /**
     * Check if user needs to complete signup
     * @returns {Promise<{needsCompletion: boolean, redirectUrl: string}>}
     */
    async function checkSignupStatus() {
        try {
            // Get current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.log('No active session');
                return { needsCompletion: false, redirectUrl: null };
            }

            const userId = session.user.id;

            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
                // If profile doesn't exist, create it first
                if (profileError.code === 'PGRST116') {
                    await createProfile(session.user);
                    return { needsCompletion: true, redirectUrl: '/complete-signup.html' };
                }
                return { needsCompletion: false, redirectUrl: null };
            }

            // Check if user needs to complete signup
            // ALL new users (Google, Email, Quran, TV) must complete signup
            if (!profile.has_completed_signup) {
                return { needsCompletion: true, redirectUrl: '/complete-signup.html' };
            }

            return { needsCompletion: false, redirectUrl: null };

        } catch (error) {
            console.error('Error checking signup status:', error);
            return { needsCompletion: false, redirectUrl: null };
        }
    }

    /**
     * Create profile if it doesn't exist
     * @param {Object} user - Supabase user object
     */
    async function createProfile(user) {
        try {
            const registrationSource = user.user_metadata?.registration_source ||
                                      (user.user_metadata?.provider === 'google' ? 'google' : 'email');

            // Check if a profile with this email already exists with different auth method
            const { data: existingProfiles } = await supabase
                .from('profiles')
                .select('email, registration_source, id')
                .eq('email', user.email)
                .neq('id', user.id); // Different user ID

            if (existingProfiles && existingProfiles.length > 0) {
                const existingProfile = existingProfiles[0];
                const existingMethod = existingProfile.registration_source;

                // If trying to use Google but email account exists
                if (registrationSource === 'google' && existingMethod === 'email') {
                    console.error('Email already registered with email/password');
                    // Sign out the Google user
                    await supabase.auth.signOut();
                    // Redirect to login with error
                    alert(window.t ? window.t('auth.email_conflict_email') : 'ئیمێڵێ تە یێ گرێداییە ب هەژمارەکا دی ڤە.');
                    window.location.href = '/login.html';
                    return;
                }

                // If trying to use email but Google account exists (shouldn't happen but safeguard)
                if (registrationSource === 'email' && existingMethod === 'google') {
                    console.error('Email already registered with Google');
                    await supabase.auth.signOut();
                    alert(window.t ? window.t('auth.email_conflict_google') : 'ئیمێڵێ تە یێ گرێداییە ب Google ڤە، ب گووگڵ هەرە ژوورڤە.');
                    window.location.href = '/login.html';
                    return;
                }
            }

            const profile = {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                display_name: user.user_metadata?.display_name || user.user_metadata?.name || user.email.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url || null,
                registration_source: registrationSource,
                has_completed_signup: false,
                first_login_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('profiles')
                .insert(profile);

            if (error) {
                console.error('Error creating profile:', error);
            } else {
                console.log('Profile created successfully');

            }
        } catch (error) {
            console.error('Error in createProfile:', error);
        }
    }

    /**
     * Handle redirect after login
     * @param {string} intendedDestination - Where user wanted to go (default: /quran.html)
     */
    async function handlePostLoginRedirect(intendedDestination = '/quran.html') {
        const status = await checkSignupStatus();

        if (status.needsCompletion && status.redirectUrl) {
            // Store intended destination for after completing signup
            sessionStorage.setItem('post_signup_redirect', intendedDestination);
            window.location.href = status.redirectUrl;
        } else if (intendedDestination && intendedDestination !== window.location.pathname && /^\/[^/]/.test(intendedDestination)) {
            // Redirect to intended destination (validated to prevent open redirect)
            window.location.href = intendedDestination;
        }
        // Otherwise, stay on current page
    }

    /**
     * Mark signup as completed
     */
    async function markSignupCompleted() {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.error('No active session');
                return false;
            }

            const { error } = await supabase
                .from('profiles')
                .update({ has_completed_signup: true })
                .eq('id', session.user.id);

            if (error) {
                console.error('Error marking signup as completed:', error);
                return false;
            }

            console.log('Signup marked as completed');

            // Redirect to stored destination or default (with validation to prevent open redirect)
            var storedRedirect = sessionStorage.getItem('post_signup_redirect') || '/quran.html';
            sessionStorage.removeItem('post_signup_redirect');

            // Validate redirect URL — must be a relative path like /page (no protocol, no double-slash)
            var redirectUrl = '/quran.html';
            if (storedRedirect && /^\/[^/]/.test(storedRedirect)) {
                redirectUrl = storedRedirect;
            }
            window.location.href = redirectUrl;

            return true;
        } catch (error) {
            console.error('Error in markSignupCompleted:', error);
            return false;
        }
    }

    /**
     * Get user profile with default avatar
     */
    async function getUserProfile() {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                return null;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }

            // Add default avatar if none exists
            if (!profile.avatar_url) {
                profile.avatar_url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.display_name || 'User')}`;
            }

            return profile;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    // Expose functions globally
    window.authRedirect = {
        checkSignupStatus,
        handlePostLoginRedirect,
        markSignupCompleted,
        getUserProfile,
        createProfile
    };

    console.log('✅ Auth redirect handler loaded');
})();
