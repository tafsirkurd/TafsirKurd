// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/send-otp.js

/**
 * Send OTP Code for Email Verification
 * Generates and sends a 6-digit OTP code to verify email before account creation
 * Stores OTP in Supabase for verification
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Generate 6-digit OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// Store OTP in Supabase
async function storeOTP(supabase, email, otp) {
    const expiresAt = new Date(Date.now() + (10 * 60 * 1000)).toISOString(); // 10 minutes

    // Delete any existing OTP for this email
    await supabase
        .from('otp_codes')
        .delete()
        .eq('email', email.toLowerCase());

    // Insert new OTP
    const { data, error } = await supabase
        .from('otp_codes')
        .insert({
            email: email.toLowerCase(),
            otp_code: otp,
            expires_at: expiresAt,
            attempts: 0,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Error storing OTP:', error);
        throw error;
    }

    return data;
}

// Send email via Brevo
async function sendOTPEmail(email, otp, name) {
    const brevoApiKey = env.BREVO_API_KEY;

    if (!brevoApiKey) {
        throw new Error('BREVO_API_KEY not configured');
    }

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
                    .header { text-align: center; margin-bottom: 30px; }
                    .otp-code {
                        font-size: 32px;
                        font-weight: bold;
                        text-align: center;
                        background: #f0f0f0;
                        padding: 20px;
                        border-radius: 8px;
                        letter-spacing: 5px;
                        color: #000;
                        margin: 20px 0;
                    }
                    .message { text-align: center; line-height: 1.8; color: #333; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    .warning { color: #e74c3c; font-weight: bold; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 کۆدی پشتڕاستکردنەوە</h1>
                    </div>

                    <div class="message">
                        <p>سڵاو <strong>${name || 'کاربەر'}</strong>،</p>
                        <p>تکایە ئەم کۆدە بەکاربهێنە بۆ پشتڕاستکردنەوەی ئیمەیڵەکەت:</p>
                    </div>

                    <div class="otp-code">
                        ${otp}
                    </div>

                    <div class="message">
                        <p>ئەم کۆدە لە ماوەی <strong>10 خولەک</strong> بەسەردەچێت.</p>
                        <p class="warning">⚠️ ئەم کۆدە بە کەس مەدە!</p>
                        <p>ئەگەر تۆ داوای ئەم کۆدەت نەکردووە، تکایە ئەم ئیمەیلە پشتگوێ بخە.</p>
                    </div>

                    <div class="footer">
                        <p>سوپاس،<br>تیمی تەفسیر کورد</p>
                        <p><a href="https://tafsirkurd.com">tafsirkurd.com</a></p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify(emailData)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
    }

    return await response.json();
}

export async function onRequest(context) {
    const { request, env } = context;
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (request.method !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { email, name } = JSON.parse(await request.text());

        // Validate input
        if (!email || !email.includes('@')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Valid email is required' })
            };
        }

        // Initialize Supabase
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Generate OTP
        const otp = generateOTP();

        // Store OTP in Supabase
        await storeOTP(supabase, email, otp);

        console.log(`OTP generated for ${email}: ${otp}`);

        // Send OTP email
        await sendOTPEmail(email, otp, name);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'OTP sent successfully',
                expiresIn: 600 // seconds
            })
        };

    } catch (error) {
        console.error('Send OTP error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to send OTP',
                message: error.message
            })
        };
    }
};
