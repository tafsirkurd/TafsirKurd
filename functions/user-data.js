// DEPRECATED: This Cloudflare function used the old flat-column sync schema.
// The live app now syncs via Supabase user_data.app_data (JSONB blob) in app.js.
// This file is kept only as a historical reference and is no longer called.
// Cloudflare Pages Function - User Reading Data Sync
// Saves and loads Quran reading progress to/from database

export async function onRequest(context) {
    const { request, env } = context;

    // Allow web + Capacitor iOS/Android origins
    const origin = request.headers.get('Origin') || '';
    const ALLOWED_ORIGINS = ['https://tafsirkurd.com', 'capacitor://localhost', 'http://localhost'];
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://tafsirkurd.com';
    const corsHeaders = {
        'Access-Control-Allow-Origin': corsOrigin,
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

    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, '');

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(
            JSON.stringify({ error: 'Server configuration error' }),
            { status: 500, headers: corsHeaders }
        );
    }

    try {
        const body = await request.json();
        const { userId, action, data } = body;

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'User ID required' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify the request comes from an authenticated user owning this userId
        const authHeader = request.headers.get('Authorization') || '';
        const userToken = authHeader.replace('Bearer ', '');
        if (!userToken) {
            return new Response(
                JSON.stringify({ error: 'Authentication required' }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Verify the token belongs to the claimed userId via Supabase auth
        const authRes = await fetch(
            `${supabaseUrl}/auth/v1/user`,
            {
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${userToken}`
                }
            }
        );
        if (!authRes.ok) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: corsHeaders }
            );
        }
        const authUser = await authRes.json();
        if (!authUser || authUser.id !== userId) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: token does not match userId' }),
                { status: 403, headers: corsHeaders }
            );
        }

        // ===== LOAD USER DATA =====
        if (action === 'load') {
            const response = await fetch(
                `${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}&select=*`,
                {
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            const rows = await response.json();

            if (rows.length === 0) {
                return new Response(
                    JSON.stringify({ success: true, data: null }),
                    { status: 200, headers: corsHeaders }
                );
            }

            const userData = rows[0];

            // Convert database format to frontend format
            const frontendData = {
                stats: {
                    ayahsRead: userData.total_ayahs_read || 0,
                    streak: userData.reading_streak || 0
                },
                currentPosition: {
                    surah: userData.current_surah || 1,
                    ayah: userData.current_ayah || 1
                },
                bookmarks: userData.bookmarks || [],
                readAyahs: userData.completed_surahs?.readAyahs || [],
                ayahReadTimes: userData.reading_history?.ayahReadTimes || {}
            };

            return new Response(
                JSON.stringify({ success: true, data: frontendData }),
                { status: 200, headers: corsHeaders }
            );
        }

        // ===== SAVE USER DATA =====
        if (action === 'save') {
            if (!data) {
                return new Response(
                    JSON.stringify({ error: 'Data required for save' }),
                    { status: 400, headers: corsHeaders }
                );
            }

            // Extract data from frontend format
            const dbData = {
                user_id: userId,
                current_surah: data.currentPosition?.surah || 1,
                current_ayah: data.currentPosition?.ayah || 1,
                total_ayahs_read: data.stats?.ayahsRead || 0,
                reading_streak: data.stats?.streak || 0,
                bookmarks: data.bookmarks || [],
                completed_surahs: { readAyahs: data.readAyahs || [] },
                reading_history: { ayahReadTimes: data.ayahReadTimes || {} },
                updated_at: new Date().toISOString()
            };

            // Check if user record exists
            const checkResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}&select=id`,
                {
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`
                    }
                }
            );

            const existing = await checkResponse.json();

            let saveResponse;
            if (existing.length > 0) {
                // Update existing record
                saveResponse = await fetch(
                    `${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': supabaseServiceKey,
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(dbData)
                    }
                );
            } else {
                // Insert new record
                dbData.created_at = new Date().toISOString();
                saveResponse = await fetch(
                    `${supabaseUrl}/rest/v1/user_data`,
                    {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseServiceKey,
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(dbData)
                    }
                );
            }

            if (!saveResponse.ok) {
                const errText = await saveResponse.text();
                throw new Error(`Failed to save: ${errText}`);
            }

            return new Response(
                JSON.stringify({ success: true }),
                { status: 200, headers: corsHeaders }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Unknown action' }),
            { status: 400, headers: corsHeaders }
        );

    } catch (error) {
        console.error('User data error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
