/**
 * 🚀 PRODUCTION MODE - Auto-disable console in production
 * Performance boost: Removes all console.log overhead
 * Code quality: Clean production environment
 */

(function() {
    'use strict';

    // Only disable in production (not localhost)
    const isProduction = window.location.hostname !== 'localhost' &&
                         !window.location.hostname.includes('127.0.0.1') &&
                         !window.location.hostname.includes('.pages.dev');

    if (isProduction) {
        // Disable all console methods in production for maximum performance
        const noop = function() {};

        console.log = noop;
        console.debug = noop;
        console.info = noop;
        console.warn = noop;

        // Keep console.error for critical error tracking
        const originalError = console.error;
        console.error = function(...args) {
            // Log to error tracking service in future
            originalError.apply(console, args);
        };

        console.log('%c🚀 PRODUCTION MODE ACTIVE', 'color: #00ff00; font-size: 16px; font-weight: bold;');
        console.log('%c✅ Console logging disabled for maximum performance', 'color: #00ff00;');
    } else {
        console.log('%c🔧 DEVELOPMENT MODE', 'color: #ffaa00; font-size: 16px; font-weight: bold;');
        console.log('%c✅ Full console logging enabled', 'color: #ffaa00;');
    }
})();
