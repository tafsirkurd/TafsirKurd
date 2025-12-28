/**
 * Verify OTP and Create Account
 * Verifies the OTP code and creates Supabase account only after successful verification
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, otp, password, name } = JSON.parse(event.body);

        // Validate input
        if (!email || !otp || !password || !name) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'All fields are required' })
            };
        }

        // Initialize Supabase
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const emailLower = email.toLowerCase();

        // Get OTP from database
        const { data: otpData, error: fetchError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('email', emailLower)
            .single();

        if (fetchError || !otpData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'OTP not found',
                    message: 'کۆدی پشتڕاستکردنەوە نەدۆزرایەوە. تکایە کۆدێکی نوێ بخوازە'
                })
            };
        }

        // Check if expired
        if (new Date(otpData.expires_at) < new Date()) {
            // Delete expired OTP
            await supabase.from('otp_codes').delete().eq('email', emailLower);

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'OTP expired',
                    message: 'کۆدی پشتڕاستکردنەوە بەسەرچووە. تکایە کۆدێکی نوێ بخوازە'
                })
            };
        }

        // Check attempts
        if (otpData.attempts >= 5) {
            await supabase.from('otp_codes').delete().eq('email', emailLower);

            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({
                    error: 'Too many attempts',
                    message: 'زۆر هەوڵت داوە. تکایە کۆدێکی نوێ بخوازە'
                })
            };
        }

        // Verify OTP
        if (otpData.otp_code !== otp.trim()) {
            // Increment attempts
            await supabase
                .from('otp_codes')
                .update({ attempts: otpData.attempts + 1 })
                .eq('email', emailLower);

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid OTP',
                    message: 'کۆدی هەڵە',
                    attemptsLeft: 5 - (otpData.attempts + 1)
                })
            };
        }

        // OTP is valid - create Supabase account

        // Create user with email already confirmed
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Mark email as confirmed immediately
            user_metadata: {
                full_name: name,
                display_name: name,
                registration_source: 'email' // Track that this is an email signup
            }
        });

        if (createError) {
            console.error('Account creation error:', createError);

            // Check if user already exists
            if (createError.message.includes('already registered') || createError.message.includes('already been registered')) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'User already exists',
                        message: 'ئەم ئیمەیلە پێشتر تۆمارکراوە'
                    })
                };
            }

            throw createError;
        }

        // Delete OTP from database
        await supabase.from('otp_codes').delete().eq('email', emailLower);

        console.log(`Account created successfully for ${email}`);

        // Send Discord notification for new user signup
        try {
            const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
            if (discordWebhook) {
                await fetch('https://tafsirkurd.com/.netlify/functions/discord-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'new_user',
                        title: '🎉 New User Signup!',
                        message: `A new user has joined via email verification`,
                        data: {
                            userName: name,
                            email: email,
                            registrationSource: 'email',
                            timestamp: new Date().toISOString()
                        }
                    })
                }).catch(err => console.error('Discord notification failed:', err));
            }
        } catch (error) {
            console.error('Failed to send Discord notification:', error);
            // Don't fail the signup if notification fails
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Account created successfully',
                user: {
                    id: userData.user.id,
                    email: userData.user.email
                }
            })
        };

    } catch (error) {
        console.error('Verify OTP error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Verification failed',
                message: error.message
            })
        };
    }
};
