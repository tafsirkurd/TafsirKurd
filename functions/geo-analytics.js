// Cloudflare Pages Function - Geo Analytics
// Returns geographic analytics data from location_tracking table

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    // Require admin token — location data is private
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: corsHeaders }
        );
    }

    try {
        // Initialize Supabase client
        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Verify token is a valid active admin session
        const { data: session } = await supabase
            .from('admin_sessions')
            .select('user_id')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Fetch location tracking data — limit to last 30 days with row cap
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: locations, error } = await supabase
            .from('location_tracking')
            .select('*')
            .gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: false })
            .limit(10000);

        if (error) throw error;

        // Aggregate data by country, region, city
        const countryMap = {};
        const regionMap = {};
        const cityMap = {};

        locations.forEach(loc => {
            // Country aggregation
            if (loc.country) {
                if (!countryMap[loc.country]) {
                    countryMap[loc.country] = { name: loc.country, visits: 0 };
                }
                countryMap[loc.country].visits++;
            }

            // Region aggregation
            if (loc.region) {
                const regionKey = `${loc.country || 'Unknown'} - ${loc.region}`;
                if (!regionMap[regionKey]) {
                    regionMap[regionKey] = {
                        name: loc.region,
                        country: loc.country || 'Unknown',
                        visits: 0
                    };
                }
                regionMap[regionKey].visits++;
            }

            // City aggregation
            if (loc.city) {
                const cityKey = `${loc.country || 'Unknown'} - ${loc.city}`;
                if (!cityMap[cityKey]) {
                    cityMap[cityKey] = {
                        name: loc.city,
                        country: loc.country || 'Unknown',
                        region: loc.region || 'Unknown',
                        visits: 0,
                        latitude: loc.latitude,
                        longitude: loc.longitude
                    };
                }
                cityMap[cityKey].visits++;
            }
        });

        // Convert maps to sorted arrays
        const countries = Object.values(countryMap).sort((a, b) => b.visits - a.visits);
        const regions = Object.values(regionMap).sort((a, b) => b.visits - a.visits);
        const cities = Object.values(cityMap).sort((a, b) => b.visits - a.visits);

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    countries,
                    regions,
                    cities,
                    totalVisits: locations.length,
                    lastUpdated: new Date().toISOString()
                }
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Geo analytics error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                data: {
                    countries: [],
                    regions: [],
                    cities: [],
                    totalVisits: 0
                }
            }),
            { status: 500, headers: corsHeaders }
        );
    }
}
