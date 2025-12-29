// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/admin-auth.js

// netlify/functions/admin-auth.js
// crypto is available globally in Cloudflare Workers;

// CRITICAL: Admin credentials MUST be set in Netlify environment variables
// Go to: Netlify Dashboard -> Site Settings -> Environment Variables
// Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH
// Generate hash: node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"

// Get credentials from environment variables
const ADMIN_EMAIL = env.ADMIN_EMAIL;
const ADMIN_PASSWORD_HASH = env.ADMIN_PASSWORD_HASH;

// Simple password hashing function (use bcrypt in production for better security)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate a simple session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Store active sessions (in production, use Redis or database)
const activeSessions = new Map();

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (request.method !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        // Check if environment variables are set
        if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server configuration error: Admin credentials not set. Please contact administrator.'
                })
            };
        }

        const body = JSON.parse(await request.text() || '{}');
        const { action, email, password, token } = body;

        // LOGIN
        if (action === 'login') {
            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Email and password required' })
                };
            }

            const passwordHash = hashPassword(password);

            if (email === ADMIN_EMAIL && passwordHash === ADMIN_PASSWORD_HASH) {
                const sessionToken = generateSessionToken();
                const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

                activeSessions.set(sessionToken, {
                    email: email,
                    expiresAt: expiresAt
                });

                // Clean up expired sessions
                for (const [key, value] of activeSessions.entries()) {
                    if (value.expiresAt < Date.now()) {
                        activeSessions.delete(key);
                    }
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        token: sessionToken,
                        expiresAt: expiresAt
                    })
                };
            } else {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid credentials' })
                };
            }
        }

        // VERIFY TOKEN
        if (action === 'verify') {
            if (!token) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Token required' })
                };
            }

            const session = activeSessions.get(token);

            if (session && session.expiresAt > Date.now()) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        email: session.email,
                        expiresAt: session.expiresAt
                    })
                };
            } else {
                activeSessions.delete(token);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid or expired token' })
                };
            }
        }

        // LOGOUT
        if (action === 'logout') {
            if (token) {
                activeSessions.delete(token);
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Logged out successfully' })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid action' })
        };

    } catch (error) {
        console.error('Admin auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Authentication error'
            })
        };
    }
};
