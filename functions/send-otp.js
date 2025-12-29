// Cloudflare Pages Function - Send OTP
// Sends OTP code for email verification

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
        const { email, name } = await request.json();

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Initialize Supabase client
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Store OTP in database
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete existing OTP for this email
        await supabase
            .from('otp_codes')
            .delete()
            .eq('email', email.toLowerCase());

        // Insert new OTP
        const { error: dbError } = await supabase
            .from('otp_codes')
            .insert({
                email: email.toLowerCase(),
                otp_code: otp,
                expires_at: expiresAt.toISOString(),
                attempts: 0
            });

        if (dbError) {
            throw new Error('Failed to store OTP: ' + dbError.message);
        }

        // Send email via Brevo
        if (env.BREVO_API_KEY) {
            const emailData = {
                sender: {
                    name: 'تەفسیر کورد',
                    email: 'noreply@tafsirkurd.com'
                },
                to: [{
                    email: email,
                    name: name || 'کاربەر'
                }],
                subject: 'کۆدی پشتڕاستکردنەوە - تەفسیر کورد',
                htmlContent: `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ku">
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
                            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
                            .otp-code { font-size: 32px; font-weight: bold; text-align: center; background: #f0f0f0; padding: 20px; border-radius: 8px; letter-spacing: 5px; color: #000; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 style="text-align: center;">🔐 کۆدی پشتڕاستکردنەوە</h1>
                            <p style="text-align: center;">سڵاو <strong>${name || 'کاربەر'}</strong>،</p>
                            <p style="text-align: center;">تکایە ئەم کۆدە بەکاربهێنە بۆ پشتڕاستکردنەوەی ئیمەیڵەکەت:</p>
                            <div class="otp-code">${otp}</div>
                            <p style="text-align: center; color: #666;">ئەم کۆدە لە ماوەی <strong>10 خولەک</strong> دا بەسەر دەچێت.</p>
                        </div>
                    </body>
                    </html>
                `
            };

            const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': env.BREVO_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (!brevoResponse.ok) {
                console.error('Brevo error:', await brevoResponse.text());
                throw new Error('Failed to send email');
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'OTP sent successfully',
                expiresIn: 600 // 10 minutes in seconds
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Send OTP error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
