// Netlify Function - Verify OTP
// Verifies OTP code for email verification

exports.handler = async (event, context) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, otp } = JSON.parse(event.body);

        if (!email || !otp) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Email and OTP are required' })
            };
        }

        // Initialize Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get OTP from database
        const { data: otpRecord, error: fetchError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (fetchError || !otpRecord) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'OTP not found or expired' })
            };
        }

        // Check if expired
        const now = new Date();
        const expiresAt = new Date(otpRecord.expires_at);
        if (now > expiresAt) {
            // Delete expired OTP
            await supabase
                .from('otp_codes')
                .delete()
                .eq('email', email.toLowerCase());

            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'OTP has expired' })
            };
        }

        // Check attempts
        if (otpRecord.attempts >= 5) {
            return {
                statusCode: 429,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Too many failed attempts' })
            };
        }

        // Verify OTP
        if (otpRecord.otp_code !== otp) {
            // Increment attempts
            await supabase
                .from('otp_codes')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('email', email.toLowerCase());

            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Invalid OTP',
                    attemptsRemaining: 5 - (otpRecord.attempts + 1)
                })
            };
        }

        // OTP is valid! Delete it
        await supabase
            .from('otp_codes')
            .delete()
            .eq('email', email.toLowerCase());

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'OTP verified successfully'
            })
        };

    } catch (error) {
        console.error('Verify OTP error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};
