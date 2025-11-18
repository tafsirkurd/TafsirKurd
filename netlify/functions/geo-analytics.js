// netlify/functions/geo-analytics.js
const { createClient } = require('@supabase/supabase-js');

// Normalize city and region names (fix common spelling variations)
function normalizeLocationName(name) {
    if (!name) return name;

    const normalizations = {
        // Erbil variations
        'arbil': 'Erbil',
        'hawler': 'Erbil',
        'hewler': 'Erbil',
        'hewlêr': 'Erbil',
        'irbil': 'Erbil',
        'arbīl': 'Erbil',

        // Duhok variations (all possible spellings)
        'duhok': 'Duhok',
        'dihok': 'Duhok',
        'dihuk': 'Duhok',
        'dahuk': 'Duhok',
        'duhuk': 'Duhok',
        'dehok': 'Duhok',
        'dihôk': 'Duhok',
        'dohuk': 'Duhok',
        'dhok': 'Duhok',
        'dahok': 'Duhok',
        'duhoc': 'Duhok',
        'dıhok': 'Duhok',

        // Sulaymaniyah variations
        'slemani': 'Sulaymaniyah',
        'silêmanî': 'Sulaymaniyah',
        'sulaimani': 'Sulaymaniyah',
        'suleimaniyah': 'Sulaymaniyah',
        'as-sulaymaniyah': 'Sulaymaniyah',

        // Other Kurdish cities
        'halabja': 'Halabja',
        'halabjah': 'Halabja',
        'zakho': 'Zakho',
        'zaxo': 'Zakho',
        'kirkuk': 'Kirkuk',
        'kerkük': 'Kirkuk'
    };

    const lowerName = name.toLowerCase();
    return normalizations[lowerName] || name;
}

// Get geographic data from IP with multiple fallback providers
async function getGeoLocation(ip) {
    console.log('🌍 Getting geo location for IP:', ip);

    // Skip localhost and private IPs
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        console.log('⚠️ Private IP detected, using default location');
        return {
            country: 'Local/Private Network',
            country_code: 'XX',
            region: 'Private',
            city: 'Localhost',
            latitude: 0,
            longitude: 0,
            timezone: 'Unknown'
        };
    }

    // Try multiple providers in order
    const providers = [
        // Provider 1: ipapi.co (1000/day free, detailed data)
        async () => {
            const response = await fetch(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
            if (!response.ok) throw new Error('ipapi.co failed');
            const data = await response.json();
            if (data.error) throw new Error(data.reason || 'API error');
            console.log('✅ ipapi.co success:', data);
            return {
                country: data.country_name || 'Unknown',
                country_code: data.country_code || 'XX',
                region: normalizeLocationName(data.region || 'Unknown'),
                city: normalizeLocationName(data.city || 'Unknown'),
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                timezone: data.timezone || 'Unknown'
            };
        },

        // Provider 2: ip-api.com (free, unlimited for non-commercial)
        async () => {
            const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone`, { timeout: 3000 });
            if (!response.ok) throw new Error('ip-api.com failed');
            const data = await response.json();
            if (data.status !== 'success') throw new Error('API returned fail status');
            console.log('✅ ip-api.com success:', data);
            return {
                country: data.country || 'Unknown',
                country_code: data.countryCode || 'XX',
                region: normalizeLocationName(data.regionName || 'Unknown'),
                city: normalizeLocationName(data.city || 'Unknown'),
                latitude: data.lat || 0,
                longitude: data.lon || 0,
                timezone: data.timezone || 'Unknown'
            };
        },

        // Provider 3: ipwhois.app (free, 10k/month)
        async () => {
            const response = await fetch(`https://ipwhois.app/json/${ip}`, { timeout: 3000 });
            if (!response.ok) throw new Error('ipwhois.app failed');
            const data = await response.json();
            if (!data.success) throw new Error('API returned fail status');
            console.log('✅ ipwhois.app success:', data);
            return {
                country: data.country || 'Unknown',
                country_code: data.country_code || 'XX',
                region: normalizeLocationName(data.region || 'Unknown'),
                city: normalizeLocationName(data.city || 'Unknown'),
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                timezone: data.timezone || 'Unknown'
            };
        }
    ];

    // Try each provider until one succeeds
    for (let i = 0; i < providers.length; i++) {
        try {
            const result = await providers[i]();
            console.log(`✅ Provider ${i + 1} succeeded`);
            return result;
        } catch (error) {
            console.error(`❌ Provider ${i + 1} failed:`, error.message);
            if (i === providers.length - 1) {
                // All providers failed
                console.error('❌ All geo providers failed, using Unknown');
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
    }
}

// Get client IP from request (Netlify-specific headers)
function getClientIP(event) {
    // Try Netlify-specific client IP header first
    const clientIP = event.headers['x-nf-client-connection-ip'] ||
                     event.headers['x-forwarded-for']?.split(',')[0].trim() ||
                     event.headers['client-ip'] ||
                     event.headers['x-real-ip'] ||
                     '127.0.0.1';

    console.log('🔍 Detected IP:', clientIP);
    console.log('📋 All headers:', JSON.stringify(event.headers, null, 2));

    return clientIP;
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

            console.log('📍 Tracking visit from IP:', clientIP);

            // Get geographic data
            const geoData = await getGeoLocation(clientIP);

            console.log('✅ Geo data retrieved:', geoData);

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

            if (insertError) {
                console.error('❌ Insert error:', insertError);
                throw insertError;
            }

            console.log('💾 Visit saved successfully');

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Visit tracked',
                    location: geoData,
                    ip: clientIP
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
