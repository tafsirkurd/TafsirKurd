// Authentication utilities for secure password handling and token generation
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    const saltRounds = 12; // High security
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
async function comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a cryptographically secure random token
 * @param {number} byteLength - Number of random bytes (default: 32)
 * @returns {string} Random token as hex string
 */
function generateSecureToken(byteLength = 32) {
    return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Generate a session token with metadata
 * @param {string} userId - User identifier
 * @param {number} expiresInHours - Token expiry in hours (default: 24)
 * @returns {Object} Session object with token and expiry
 */
function generateSession(userId, expiresInHours = 24) {
    const token = generateSecureToken(32);
    const expiresAt = Date.now() + (expiresInHours * 60 * 60 * 1000);

    return {
        token,
        expiresAt,
        userId,
        createdAt: Date.now()
    };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, message: string }
 */
function validatePasswordStrength(password) {
    if (!password || password.length < 12) {
        return { valid: false, message: 'Password must be at least 12 characters long' };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!hasLowerCase) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!hasNumbers) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChar) {
        return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true, message: 'Password is strong' };
}

module.exports = {
    hashPassword,
    comparePassword,
    generateSecureToken,
    generateSession,
    validatePasswordStrength
};
