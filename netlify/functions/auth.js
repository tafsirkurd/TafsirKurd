// netlify/functions/auth.js
const { createClient } = require('@supabase/supabase-js');
const {
    checkRateLimit,
    getClientIP,
    sanitizeInput,
    isValidEmail,
    getSecureHeaders,
    logSecurityEvent,
    detectSQLInjection,
    validateBodySize
} = require('./utils/security');
const {
    comparePassword,
    generateSession
} = require('./utils/auth-utils');

exports.handler = async (event, context) => {
    // Set secure CORS headers with origin validation
    const requestOrigin = event.headers.origin || event.headers.referer;
    const headers = getSecureHeaders(requestOrigin);

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Rate limiting - 20 requests per minute per IP
    const clientIP = getClientIP(event);
    if (checkRateLimit(clientIP, 20, 60000)) {
        logSecurityEvent(event, 'Rate limit exceeded', 'warning');
        return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Too many requests. Please try again later.'
            })
        };
    }

    // Validate request body size (max 10KB)
    if (event.body && !validateBodySize(event.body, 10)) {
        logSecurityEvent(event, 'Request body too large', 'warning');
        return {
            statusCode: 413,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Request body too large'
            })
        };
    }

    try {
        // Check environment variables
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            logSecurityEvent(event, 'Missing Supabase environment variables', 'error');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Server configuration error'
                }),
            };
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Handle session validation (GET request with Authorization header)
        if (event.httpMethod === 'GET') {
            const authHeader = event.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        message: 'No authorization token provided' 
                    })
                };
            }

            const token = authHeader.replace('Bearer ', '');
            
            // Try to validate with Supabase first
            try {
                const { data: { user }, error } = await supabase.auth.getUser(token);
                
                if (user && !error) {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ 
                            success: true, 
                            user: {
                                id: user.id,
                                email: user.email
                            }
                        })
                    };
                }
            } catch (supabaseError) {
                // Supabase validation failed, token is invalid
                logSecurityEvent(event, 'Invalid token validation attempt', 'warning');
            }

            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Invalid session' 
                })
            };
        }

        // Handle login (POST request)
        if (event.httpMethod === 'POST') {
            let body;
            try {
                body = JSON.parse(event.body || '{}');
            } catch (e) {
                console.error('JSON parse error:', e.message);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        message: 'Invalid JSON format' 
                    })
                };
            }

            const { email, password } = body;

            console.log('Login attempt for email:', email);

            if (!email || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Email and password are required'
                    })
                };
            }

            // Sanitize and validate inputs
            const trimmedEmail = sanitizeInput(email.trim());
            const trimmedPassword = password.trim();

            // Validate email format
            if (!isValidEmail(trimmedEmail)) {
                logSecurityEvent(event, 'Invalid email format attempt', 'warning');
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid email format'
                    })
                };
            }

            // Detect SQL injection attempts
            if (detectSQLInjection(trimmedEmail) || detectSQLInjection(trimmedPassword)) {
                logSecurityEvent(event, 'SQL injection attempt detected', 'critical');
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid input detected'
                    })
                };
            }

            // Try Supabase authentication
            const { data, error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: trimmedPassword,
            });

            if (error) {
                // Log failed auth attempt for security monitoring
                logSecurityEvent(event, `Failed login attempt for ${trimmedEmail}`, 'warning');

                let clientMessage = 'Authentication failed';
                if (error.message.includes('Invalid login credentials')) {
                    clientMessage = 'Invalid email or password';
                } else if (error.message.includes('Email not confirmed')) {
                    clientMessage = 'Email not confirmed';
                }

                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ 
                        success: false, 
                        message: clientMessage
                    })
                };
            }

            console.log('Supabase auth successful for:', trimmedEmail);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    user: {
                        id: data.user.id,
                        email: data.user.email
                    },
                    token: data.session.access_token,
                    expires: data.session.expires_at * 1000
                })
            };
        }

        // Method not allowed
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Method not allowed' 
            })
        };

    } catch (error) {
        console.error('Auth function error:', {
            message: error.message,
            stack: error.stack
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Internal server error'
            })
        };
    }
};