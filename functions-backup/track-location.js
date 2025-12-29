// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/track-location.js

// Netlify Function to track user location
// This does everything server-side: get IP, lookup location, save to database

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

export async function onRequest(context) {
    const { request, env } = context;
    try {
        // Only accept POST requests
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { "Content-Type": "application/json" } });
        }

        // Parse request body to get user info
        const body = JSON.parse(await request.text() || '{}');
        const { userId, userEmail } = body;

        if (!userId) {
            return new Response(JSON.stringify({
                    success: false,
                    error: 'userId is required'
                , { status: 400, headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                } }))
            };
        }

        // Get real client IP
        let clientIP =
            Object.fromEntries(request.headers)['cf-connecting-ip'] ||
            Object.fromEntries(request.headers)['x-real-ip'] ||
            Object.fromEntries(request.headers)['x-nf-client-connection-ip'] ||
            Object.fromEntries(request.headers)['x-forwarded-for']?.split(',')[0]?.trim() ||
            'Unknown';

        console.log('Tracking location for user:', userId, 'IP:', clientIP);

        // Fetch location data
        let locationData = null;
        if (clientIP && clientIP !== 'Unknown') {
            try {
                locationData = await fetchLocationData(clientIP);
                console.log('Location data:', locationData);
            } catch (error) {
                console.error('Location lookup failed:', error);
            }
        }

        // Save to Supabase
        const supabaseUrl = env.SUPABASE_URL || 'https://sroaorqiuocygfzggbax.supabase.co';
        const supabaseKey = env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2FvcnFpdW9jeWdmemdnYmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MjY0OTQsImV4cCI6MjA1MDEwMjQ5NH0.Lqnhak7iqfT4wZJ6ld0R4PEFPZhiTAGgdPxW25DgLak';

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('user_data')
            .upsert({
                user_id: userId,
                email: userEmail || null,
                city: locationData?.city || null,
                region: locationData?.region || null,
                country: locationData?.country_name || null,
                country_code: locationData?.country_code || null,
                ip_address: clientIP,
                timezone: locationData?.timezone || null,
                latitude: locationData?.latitude || null,
                longitude: locationData?.longitude || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Database error:', error);
            return new Response(JSON.stringify({
                    success: false,
                    error: error.message
                , { status: 500, headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                } }))
            };
        }

        console.log('✅ Location saved successfully');

        return new Response(JSON.stringify({
                success: true,
                ip: clientIP,
                location: locationData ? {
                    city: locationData.city,
                    region: locationData.region,
                    country: locationData.country_name
                , { status: 200, headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            } }) : null
            })
        };

    } catch (error) {
        console.error('Track location error:', error);
        return new Response(JSON.stringify({
                success: false,
                error: error.message
            , { status: 500, headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            } }))
        };
    }
};

// Helper function to fetch location data
function fetchLocationData(ip) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'ipapi.co',
            port: 443,
            path: `/${ip}/json/`,
            method: 'GET',
            headers: {
                'User-Agent': 'TafsirKurd/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error(parsed.reason || 'API error'));
                    } else {
                        resolve(parsed);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}
