// Admin Users Data API - Fetch profiles and user_data with service role
import { createClient } from '@supabase/supabase-js';

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

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    try {
        const body = await request.json();
        const { action, token } = body;

        if (!token) {
            return jsonResponse({ error: 'No token provided' }, 401, corsHeaders);
        }

        // Verify the requesting user is an admin
        const { data: session } = await supabase
            .from('admin_sessions')
            .select('user_id, admin_users(role, email)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session || !session.admin_users) {
            return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403, corsHeaders);
        }

        const role = session.admin_users.role;

        // Only super_admin and analyst can view user data
        if (role !== 'super_admin' && role !== 'analyst') {
            return jsonResponse({ error: 'Unauthorized. Insufficient permissions.' }, 403, corsHeaders);
        }

        // ===== GET ALL USERS =====
        if (action === 'get_users') {
            // Fetch profiles (all registered users)
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileError) {
                console.error('Error fetching profiles:', profileError);
                return jsonResponse({ error: 'Failed to fetch profiles: ' + profileError.message }, 500, corsHeaders);
            }

            // Fetch user_data (reading progress)
            const { data: userData, error: userError } = await supabase
                .from('user_data')
                .select('*');

            if (userError) {
                console.error('Error fetching user_data:', userError);
                // Continue without user_data - it's optional
            }

            // Merge profiles with user_data
            const users = (profiles || []).map(profile => {
                const readingData = (userData || []).find(u => u.user_id === profile.id) || {};
                return {
                    id: profile.id,
                    name: profile.full_name || profile.display_name || profile.name || 'Unknown User',
                    email: profile.email || 'No email',
                    avatar: profile.avatar_url || null,
                    registration_source: profile.registration_source || 'unknown',
                    created_at: profile.created_at,
                    last_sign_in: profile.updated_at || profile.created_at,
                    // Reading progress
                    current_surah: readingData.current_surah || 0,
                    current_ayah: readingData.current_ayah || 0,
                    total_ayahs_read: parseInt(readingData.total_ayahs_read) || 0,
                    reading_streak: readingData.reading_streak || 0,
                    last_active: readingData.updated_at || readingData.lastActive || profile.updated_at || profile.created_at,
                    bookmarks: readingData.bookmarks || [],
                    daily_goal: readingData.daily_goal || 0,
                    monthly_goal: readingData.monthly_goal || 0
                };
            });

            return jsonResponse({
                success: true,
                users,
                total: users.length
            }, 200, corsHeaders);
        }

        // ===== GET READING STATS =====
        if (action === 'get_reading_stats') {
            // Fetch profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, display_name, email, avatar_url, created_at');

            if (profileError) {
                console.error('Error fetching profiles:', profileError);
                return jsonResponse({ error: 'Failed to fetch profiles: ' + profileError.message }, 500, corsHeaders);
            }

            // Fetch user_data
            const { data: userData, error: userError } = await supabase
                .from('user_data')
                .select('*');

            if (userError) {
                console.error('Error fetching user_data:', userError);
            }

            // Merge and calculate stats
            const totalAyahsInQuran = 6236;
            const users = (profiles || []).map(profile => {
                const reading = (userData || []).find(u => u.user_id === profile.id) || {};
                return {
                    id: profile.id,
                    name: profile.full_name || profile.display_name || profile.email?.split('@')[0] || 'Unknown',
                    email: profile.email || '',
                    avatar: profile.avatar_url,
                    ayahsRead: parseInt(reading.total_ayahs_read) || 0,
                    currentSurah: reading.current_surah || 0,
                    currentAyah: reading.current_ayah || 0,
                    readingStreak: reading.reading_streak || 0,
                    lastActive: reading.updated_at || reading.lastActive || profile.updated_at || profile.created_at,
                    created: profile.created_at
                };
            });

            const totalReaders = users.length;
            const totalAyahsRead = users.reduce((sum, u) => sum + u.ayahsRead, 0);
            const avgProgress = totalReaders > 0 ? (totalAyahsRead / (totalReaders * totalAyahsInQuran) * 100).toFixed(1) : 0;
            const completedReaders = users.filter(u => u.ayahsRead >= totalAyahsInQuran).length;
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const activeReaders = users.filter(u => new Date(u.lastActive) > sevenDaysAgo).length;

            // Calculate progress distribution
            const ranges = [0, 10, 25, 50, 75, 90, 100];
            const distribution = ranges.slice(0, -1).map((r, i) => {
                const nextRange = ranges[i + 1];
                return users.filter(u => {
                    const progress = (u.ayahsRead / totalAyahsInQuran) * 100;
                    return progress >= r && progress < nextRange;
                }).length;
            });

            return jsonResponse({
                success: true,
                stats: {
                    totalReaders,
                    avgProgress: parseFloat(avgProgress),
                    completedReaders,
                    activeReaders,
                    distribution
                },
                users: users.sort((a, b) => b.ayahsRead - a.ayahsRead).slice(0, 50)
            }, 200, corsHeaders);
        }

        return jsonResponse({ error: 'Unknown action' }, 400, corsHeaders);

    } catch (error) {
        console.error('Admin users data error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), { status, headers });
}
