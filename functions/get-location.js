// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/get-location.js

// Netlify Function to get client IP and location data
// This runs server-side so no CORS issues

const https = require('https');

export async function onRequest(context) {
    const { request, env } = context;
    try {
        // Get real client IP (especially behind Cloudflare/proxies)
        let clientIP =
            Object.fromEntries(request.headers)['cf-connecting-ip'] ||
            Object.fromEntries(request.headers)['x-real-ip'] ||
            Object.fromEntries(request.headers)['x-nf-client-connection-ip'] ||
            Object.fromEntries(request.headers)['x-forwarded-for']?.split(',')[0]?.trim() ||
            Object.fromEntries(request.headers)['client-ip'] ||
            'Unknown';

        console.log('Detected IP:', clientIP);

        // If we got an IP, fetch location data from ipapi.co
        if (clientIP && clientIP !== 'Unknown') {
            try {
                const locationData = await fetchLocationData(clientIP);

                return new Response(JSON.stringify({
                        success: true,
                        ip: clientIP,
                        city: locationData.city || null,
                        region: locationData.region || null,
                        country: locationData.country_name || null,
                        country_code: locationData.country_code || null,
                        timezone: locationData.timezone || null,
                        latitude: locationData.latitude || null,
                        longitude: locationData.longitude || null
                    , { status: 200, headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Cache-Control': 'no-cache'
                    } }))
                };
            } catch (error) {
                console.error('Location lookup failed:', error);
                // Return IP even if location lookup fails
                return new Response(JSON.stringify({
                        success: true,
                        ip: clientIP,
                        city: null,
                        region: null,
                        country: null,
                        error: 'Location lookup failed'
                    , { status: 200, headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache'
                    } }))
                };
            }
        }

        return new Response(JSON.stringify({
                success: false,
                error: 'Could not determine IP address'
            , { status: 200, headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            } }))
        };

    } catch (error) {
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
