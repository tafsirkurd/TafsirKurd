// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/brevo-email-stats.js

/**
 * Brevo Email Statistics
 * Fetches email logs and statistics from Brevo API
 */

const https = require('https');

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const BREVO_API_KEY = env.BREVO_API_KEY;

        if (!BREVO_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'BREVO_API_KEY not configured'
                })
            };
        }

        // Get email events (last 30 days, limit 100)
        const days = 30;
        const limit = 100;

        const emailEvents = await getBrevoEmailEvents(BREVO_API_KEY, days, limit);

        // Get account statistics
        const stats = await getBrevoStats(BREVO_API_KEY);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                events: emailEvents,
                stats: stats
            })
        };

    } catch (error) {
        console.error('❌ Error fetching Brevo stats:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

function getBrevoEmailEvents(apiKey, days = 30, limit = 100) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: `/v3/smtp/statistics/events?limit=${limit}&offset=0&days=${days}&sort=desc`,
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey
            }
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);

                    if (res.statusCode === 200) {
                        resolve(response.events || []);
                    } else {
                        console.error('Brevo events error:', response);
                        resolve([]); // Return empty array on error
                    }
                } catch (error) {
                    console.error('Failed to parse events response:', error);
                    resolve([]);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            resolve([]); // Return empty array on error
        });

        req.end();
    });
}

function getBrevoStats(apiKey) {
    return new Promise((resolve, reject) => {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: `/v3/smtp/statistics/aggregatedReport?startDate=${startDate}&endDate=${endDate}`,
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey
            }
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);

                    if (res.statusCode === 200) {
                        resolve(response);
                    } else {
                        console.error('Brevo stats error:', response);
                        resolve({ requests: 0, delivered: 0, opens: 0, clicks: 0 });
                    }
                } catch (error) {
                    console.error('Failed to parse stats response:', error);
                    resolve({ requests: 0, delivered: 0, opens: 0, clicks: 0 });
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            resolve({ requests: 0, delivered: 0, opens: 0, clicks: 0 });
        });

        req.end();
    });
}
