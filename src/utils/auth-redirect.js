/**
 * Authentication Redirect Handler
 * Handles post-login redirects based on user profile status
 * Shows complete-signup ONCE for first-time email/quran users
 * Skips complete-signup for TV and Google users
 */

(async function() {
    'use strict';

    // Initialize Supabase client (assumes supabase is globally available)
    if (typeof window.supabaseClient === 'undefined') {
        console.error('Supabase client not initialized');
        return;
    }

    const supabase = window.supabaseClient;

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
            if (!profile.has_completed_signup) {
                // Only show complete-signup for quran and email registrations
                if (profile.registration_source === 'quran' || profile.registration_source === 'email') {
                    return { needsCompletion: true, redirectUrl: '/complete-signup.html' };
                } else {
                    // TV and Google users skip complete-signup
                    // Mark as completed automatically
                    await supabase
                        .from('profiles')
                        .update({ has_completed_signup: true })
                        .eq('id', userId);

                    return { needsCompletion: false, redirectUrl: null };
                }
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

                // Send Discord notification for new user
                try {
                    await fetch('/.netlify/functions/discord-notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'new_user',
                            title: registrationSource === 'google' ? '🎉 New Google User!' : '🎉 New User Signup!',
                            message: `A new user has joined via ${registrationSource}`,
                            data: {
                                userName: profile.display_name,
                                email: profile.email,
                                registrationSource: registrationSource,
                                picture: profile.avatar_url,
                                timestamp: new Date().toISOString()
                            }
                        })
                    }).catch(err => console.error('Discord notification failed:', err));
                } catch (notifError) {
                    console.error('Failed to send Discord notification:', notifError);
                }
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
        } else if (intendedDestination && intendedDestination !== window.location.pathname) {
            // Redirect to intended destination
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

            // Redirect to stored destination or default
            const redirectUrl = sessionStorage.getItem('post_signup_redirect') || '/quran.html';
            sessionStorage.removeItem('post_signup_redirect');
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
