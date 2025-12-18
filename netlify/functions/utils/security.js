// Security utilities for serverless functions
// Implements rate limiting, input validation, and security headers

const { Redis } = require('@upstash/redis');

// Initialize Redis client (Upstash Redis for serverless)
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

// Fallback: In-memory rate limiting store (only if Redis not configured)
const rateLimitStore = new Map();

/**
 * Rate limiter middleware - Redis-based for serverless
 * @param {string} identifier - Usually IP address or user ID
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<boolean>} - Returns true if rate limit exceeded
 */
async function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();

    // Use Redis if available (production)
    if (redis) {
        try {
            const current = await redis.get(key);

            if (!current) {
                // First request, set count to 1 with expiry
                await redis.set(key, 1, { px: windowMs });
                return false;
            }

            const count = parseInt(current, 10);

            if (count >= maxRequests) {
                return true; // Rate limit exceeded
            }

            // Increment counter
            await redis.incr(key);
            return false;
        } catch (error) {
            console.error('Redis rate limit error:', error);
            // Fall back to in-memory on Redis error
        }
    }

    // Fallback: In-memory rate limiting (development only)
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        return false;
    }

    const record = rateLimitStore.get(key);

    // Reset if window expired
    if (now > record.resetTime) {
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        return false;
    }

    // Increment counter
    record.count++;

    // Check if limit exceeded
    if (record.count > maxRequests) {
        return true;
    }

    return false;
}

/**
 * Clean up old rate limit entries (only for in-memory fallback)
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Clean up every 5 minutes (only for in-memory fallback)
if (!redis) {
    setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Get client IP address from event
 */
function getClientIP(event) {
    return event.headers['x-forwarded-for']?.split(',')[0].trim()
        || event.headers['x-real-ip']
        || 'unknown';
}

/**
 * Sanitize user input to prevent XSS
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number
 */
function isStrongPassword(password) {
    if (!password || password.length < 8) return false;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return hasUpperCase && hasLowerCase && hasNumbers;
}

/**
 * Secure headers for all responses
 */
function getSecureHeaders(requestOrigin) {
    // Allowed origins for CORS
    const allowedOrigins = [
        'https://tafsirkurd.com',
        'https://www.tafsirkurd.com',
        'http://localhost:8888', // Netlify dev
        'http://localhost:3000'  // Local development
    ];

    // Validate origin and set CORS header
    let corsOrigin = 'https://tafsirkurd.com'; // Default to production
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        corsOrigin = requestOrigin;
    }

    return {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private'
    };
}

/**
 * Log security events (in production, send to monitoring service)
 */
function logSecurityEvent(event, message, severity = 'info') {
    const timestamp = new Date().toISOString();
    const ip = getClientIP(event);

    console.log(JSON.stringify({
        timestamp,
        severity,
        ip,
        message,
        path: event.path,
        method: event.httpMethod
    }));
}

/**
 * Detect potential SQL injection attempts
 */
function detectSQLInjection(input) {
    if (typeof input !== 'string') return false;

    const sqlPatterns = [
        /(\bOR\b|\bAND\b).*=.*=/i,
        /UNION.*SELECT/i,
        /DROP\s+TABLE/i,
        /INSERT\s+INTO/i,
        /DELETE\s+FROM/i,
        /--/,
        /;.*DROP/i,
        /'\s*OR\s*'1'\s*=\s*'1/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate request body size (prevent DoS)
 */
function validateBodySize(body, maxSizeKB = 100) {
    if (!body) return true;

    const sizeInKB = new TextEncoder().encode(body).length / 1024;
    return sizeInKB <= maxSizeKB;
}

module.exports = {
    checkRateLimit,
    getClientIP,
    sanitizeInput,
    isValidEmail,
    isStrongPassword,
    getSecureHeaders,
    logSecurityEvent,
    detectSQLInjection,
    validateBodySize
};
