// Netlify Function to track user location
// This does everything server-side: get IP, lookup location, save to database

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    try {
        // Only accept POST requests
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        // Parse request body to get user info
        const body = JSON.parse(event.body || '{}');
        const { userId, userEmail } = body;

        if (!userId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'userId is required'
                })
            };
        }

        // Get real client IP
        let clientIP =
            event.headers['cf-connecting-ip'] ||
            event.headers['x-real-ip'] ||
            event.headers['x-nf-client-connection-ip'] ||
            event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
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
        const supabaseUrl = process.env.SUPABASE_URL || 'https://sroaorqiuocygfzggbax.supabase.co';
        const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2FvcnFpdW9jeWdmemdnYmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MjY0OTQsImV4cCI6MjA1MDEwMjQ5NH0.Lqnhak7iqfT4wZJ6ld0R4PEFPZhiTAGgdPxW25DgLak';

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
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: error.message
                })
            };
        }

        console.log('✅ Location saved successfully');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                success: true,
                ip: clientIP,
                location: locationData ? {
                    city: locationData.city,
                    region: locationData.region,
                    country: locationData.country_name
                } : null
            })
        };

    } catch (error) {
        console.error('Track location error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
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
