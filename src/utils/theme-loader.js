// Universal Dark Mode Theme Loader
// This script runs immediately on page load to prevent flash of wrong theme
(function() {
    try {
        var savedTheme = localStorage.getItem('theme');
        var userPrefs = {};
        try {
            var prefsStr = localStorage.getItem('userPreferences');
            if (prefsStr) userPrefs = JSON.parse(prefsStr);
        } catch (e) {
            // Invalid JSON in userPreferences, ignore
        }
        var theme = savedTheme || (userPrefs.darkMode ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
        // Fallback to light theme on any error
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();
