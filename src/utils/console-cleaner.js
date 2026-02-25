/**
 * Console Cleaner - Disables console logs in production
 * Add this script at the top of every page for a clean console
 */

(function() {
    'use strict';

    // Detect environment
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tafsirkurd.com' || hostname === 'www.tafsirkurd.com';
    const isDevelopment = hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname.includes('127.0.0.1')
        || hostname.includes('localhost');

    // Store original console methods BEFORE any replacement
    window._console = {
        log: console.log.bind(console),
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };

    if (isProduction) {
        // In production: disable console.log, console.debug, console.info
        // Keep console.warn and console.error for critical issues only

        const noop = function() {};

        // Show welcome message using originals BEFORE disabling
        console.clear();
        window._console.log('%c🕌 تەفسیر کورد', 'font-size: 24px; font-weight: bold; color: #000;');
        window._console.log('%cWelcome to Tafsir Kurd', 'font-size: 14px; color: #666;');
        window._console.log('%cFor developer opportunities: contact@tafsirkurd.com', 'font-size: 12px; color: #999;');
        window._console.log('%c⚠️ Warning: Do not paste unknown code here!', 'font-size: 12px; font-weight: bold; color: #ff0000; background: #fff3cd; padding: 4px;');

        // Now disable
        console.log = noop;
        console.debug = noop;
        console.info = noop;
    }

})();
