// Universal Dark Mode Theme Loader
// This script runs immediately on page load to prevent flash of wrong theme
(function() {
    const savedTheme = localStorage.getItem('theme');
    const userPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    const theme = savedTheme || (userPrefs.darkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
})();
