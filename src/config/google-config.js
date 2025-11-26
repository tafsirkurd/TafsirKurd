// Google OAuth Configuration
// This file contains the Google OAuth Client ID used across the application
// Note: Client IDs are not sensitive secrets and are meant to be public

const GOOGLE_CONFIG = {
    CLIENT_ID: "510335424343-i42ua2q2718pg230e0kbrgha8edtmb14.apps.googleusercontent.com"
};

// Export for use in HTML files
if (typeof window !== 'undefined') {
    window.GOOGLE_CONFIG = GOOGLE_CONFIG;
}
