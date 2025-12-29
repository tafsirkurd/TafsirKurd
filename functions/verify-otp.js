// Cloudflare Pages Function - Verify OTP
// Verifies OTP code for email verification

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return new Response(
                JSON.stringify({ error: 'Email and OTP are required' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Initialize Supabase client
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get OTP from database
        const { data: otpRecord, error: fetchError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (fetchError || !otpRecord) {
            return new Response(
                JSON.stringify({ error: 'OTP not found or expired' }),
                { status: 404, headers: corsHeaders }
            );
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

            return new Response(
                JSON.stringify({ error: 'OTP has expired' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Check attempts
        if (otpRecord.attempts >= 5) {
            return new Response(
                JSON.stringify({ error: 'Too many failed attempts' }),
                { status: 429, headers: corsHeaders }
            );
        }

        // Verify OTP
        if (otpRecord.otp_code !== otp) {
            // Increment attempts
            await supabase
                .from('otp_codes')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('email', email.toLowerCase());

            return new Response(
                JSON.stringify({
                    error: 'Invalid OTP',
                    attemptsRemaining: 5 - (otpRecord.attempts + 1)
                }),
                { status: 400, headers: corsHeaders }
            );
        }

        // OTP is valid! Delete it
        await supabase
            .from('otp_codes')
            .delete()
            .eq('email', email.toLowerCase());

        return new Response(
            JSON.stringify({
                success: true,
                message: 'OTP verified successfully'
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Verify OTP error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
