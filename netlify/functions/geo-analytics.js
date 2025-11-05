// netlify/functions/geo-analytics.js
const { createClient } = require('@supabase/supabase-js');

// Get geographic data from IP
async function getGeoLocation(ip) {
    try {
        // Use ipapi.co for geolocation (1000 requests/day free)
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        if (!response.ok) throw new Error('Geo API failed');

        const data = await response.json();
        return {
            country: data.country_name || 'Unknown',
            country_code: data.country_code || 'XX',
            region: data.region || 'Unknown',
            city: data.city || 'Unknown',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            timezone: data.timezone || 'Unknown'
        };
    } catch (error) {
        console.error('Geo location error:', error);
        return {
            country: 'Unknown',
            country_code: 'XX',
            region: 'Unknown',
            city: 'Unknown',
            latitude: 0,
            longitude: 0,
            timezone: 'Unknown'
        };
    }
}

// Get client IP from request
function getClientIP(event) {
    return event.headers['x-forwarded-for']?.split(',')[0].trim() ||
           event.headers['client-ip'] ||
           event.headers['x-real-ip'] ||
           '127.0.0.1';
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // GET: Fetch geographic analytics
        if (event.httpMethod === 'GET') {
            const { data: visits, error } = await supabase
                .from('geo_analytics')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Aggregate data by country
            const countryStats = {};
            const regionStats = {};
            const cityStats = {};

            visits.forEach(visit => {
                // Country stats
                if (!countryStats[visit.country]) {
                    countryStats[visit.country] = {
                        country: visit.country,
                        country_code: visit.country_code,
                        visits: 0,
                        unique_ips: new Set()
                    };
                }
                countryStats[visit.country].visits++;
                countryStats[visit.country].unique_ips.add(visit.ip_address);

                // Region stats
                const regionKey = `${visit.country}|${visit.region}`;
                if (!regionStats[regionKey]) {
                    regionStats[regionKey] = {
                        country: visit.country,
                        region: visit.region,
                        visits: 0,
                        unique_ips: new Set()
                    };
                }
                regionStats[regionKey].visits++;
                regionStats[regionKey].unique_ips.add(visit.ip_address);

                // City stats
                const cityKey = `${visit.country}|${visit.region}|${visit.city}`;
                if (!cityStats[cityKey]) {
                    cityStats[cityKey] = {
                        country: visit.country,
                        region: visit.region,
                        city: visit.city,
                        visits: 0,
                        unique_ips: new Set()
                    };
                }
                cityStats[cityKey].visits++;
                cityStats[cityKey].unique_ips.add(visit.ip_address);
            });

            // Convert to arrays and format
            const countries = Object.values(countryStats)
                .map(c => ({
                    country: c.country,
                    country_code: c.country_code,
                    visits: c.visits,
                    unique_visitors: c.unique_ips.size
                }))
                .sort((a, b) => b.visits - a.visits);

            const regions = Object.values(regionStats)
                .map(r => ({
                    country: r.country,
                    region: r.region,
                    visits: r.visits,
                    unique_visitors: r.unique_ips.size
                }))
                .sort((a, b) => b.visits - a.visits);

            const cities = Object.values(cityStats)
                .map(c => ({
                    country: c.country,
                    region: c.region,
                    city: c.city,
                    visits: c.visits,
                    unique_visitors: c.unique_ips.size
                }))
                .sort((a, b) => b.visits - a.visits);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: {
                        total_visits: visits.length,
                        countries,
                        regions,
                        cities,
                        top_country: countries[0] || null,
                        top_region: regions[0] || null,
                        top_city: cities[0] || null
                    }
                })
            };
        }

        // POST: Track a visit
        if (event.httpMethod === 'POST') {
            const clientIP = getClientIP(event);
            const body = JSON.parse(event.body || '{}');

            // Get geographic data
            const geoData = await getGeoLocation(clientIP);

            // Insert visit record
            const { error: insertError } = await supabase
                .from('geo_analytics')
                .insert({
                    ip_address: clientIP,
                    country: geoData.country,
                    country_code: geoData.country_code,
                    region: geoData.region,
                    city: geoData.city,
                    latitude: geoData.latitude,
                    longitude: geoData.longitude,
                    timezone: geoData.timezone,
                    user_agent: event.headers['user-agent'] || 'Unknown',
                    page_url: body.page_url || '/',
                    referrer: body.referrer || null
                });

            if (insertError) throw insertError;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Visit tracked',
                    location: geoData
                })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('Geo analytics error:', error);
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
