// netlify/functions/auth.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        console.log('Environment variables check:', {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
            hasAdminEmail: !!process.env.ADMIN_EMAIL,
            hasAdminPassword: !!process.env.ADMIN_PASSWORD,
            supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 30)
        });

        // Check environment variables
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            console.error("Missing Supabase environment variables");
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Server configuration error - missing Supabase config' 
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
                console.log('Supabase token validation failed:', supabaseError.message);
            }

            // Fallback: check if it's a simple JWT with admin credentials
            // This is a simplified check - in production, use proper JWT validation
            if (token === 'admin-session-token') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ 
                        success: true, 
                        user: {
                            id: 'admin',
                            email: process.env.ADMIN_EMAIL || 'admin@tafsirkurd.com'
                        }
                    })
                };
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

            const trimmedEmail = email.trim();
            const trimmedPassword = password.trim();

            // Check against environment variables first (fallback authentication)
            if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
                if (trimmedEmail === process.env.ADMIN_EMAIL && trimmedPassword === process.env.ADMIN_PASSWORD) {
                    console.log('Environment variable auth successful');
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            user: {
                                id: 'admin',
                                email: trimmedEmail
                            },
                            token: 'admin-session-token',
                            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                        })
                    };
                }
            }

            // Try Supabase authentication
            console.log('Attempting Supabase auth for:', trimmedEmail);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: trimmedPassword,
            });

            if (error) {
                console.error('Supabase auth error:', {
                    message: error.message,
                    status: error.status,
                    code: error.code
                });

                // Check if this matches the hardcoded credentials as final fallback
                if (trimmedEmail === 'admin@tafsirkurd.com' && trimmedPassword === 'TafsirKurd2024!') {
                    console.log('Using hardcoded fallback credentials');
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            user: {
                                id: 'admin-fallback',
                                email: trimmedEmail
                            },
                            token: 'admin-session-token',
                            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                        })
                    };
                }

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