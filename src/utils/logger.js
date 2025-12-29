/**
 * Production-safe logging utility
 * Only logs in development mode, silent in production
 */

const isDevelopment = window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    || window.location.hostname.includes('pages.dev');

const isProduction = window.location.hostname === 'tafsirkurd.com';

const logger = {
    /**
     * Log general information (disabled in production)
     */
    log: (...args) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log warnings (enabled in production)
     */
    warn: (...args) => {
        console.warn(...args);
    },

    /**
     * Log errors (always enabled, critical for debugging)
     */
    error: (...args) => {
        console.error(...args);
        // In production, you could send errors to monitoring service
        if (isProduction) {
            // TODO: Send to error tracking service (e.g., Sentry)
        }
    },

    /**
     * Log debug information (only in development)
     */
    debug: (...args) => {
        if (isDevelopment) {
            console.debug('🔍 DEBUG:', ...args);
        }
    },

    /**
     * Log success messages (only in development)
     */
    success: (...args) => {
        if (isDevelopment) {
            console.log('✅', ...args);
        }
    },

    /**
     * Log API calls (only in development)
     */
    api: (method, url, data) => {
        if (isDevelopment) {
            console.log(`📡 API ${method}:`, url, data || '');
        }
    },

    /**
     * Group logs (only in development)
     */
    group: (label, callback) => {
        if (isDevelopment) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    },

    /**
     * Disable all console logs (for production)
     */
    disableAll: () => {
        if (isProduction) {
            console.log = () => {};
            console.debug = () => {};
            console.info = () => {};
            // Keep warn and error for critical issues
        }
    }
};

// Auto-disable in production
if (isProduction) {
    logger.disableAll();
}

// Make available globally
window.logger = logger;
