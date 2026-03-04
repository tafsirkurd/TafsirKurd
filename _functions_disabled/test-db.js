// Test database connection
import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Check environment variables
        const checks = {
            hasSupabaseUrl: !!env.SUPABASE_URL,
            hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
            supabaseUrl: env.SUPABASE_URL ? env.SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET'
        };

        if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
            return new Response(
                JSON.stringify({
                    error: 'Missing environment variables',
                    checks
                }),
                { status: 500, headers: corsHeaders }
            );
        }

        // Try to connect to database
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

        // Try to query admin_users table
        const { data, error, count } = await supabase
            .from('admin_users')
            .select('email, role, is_active', { count: 'exact' })
            .limit(5);

        if (error) {
            return new Response(
                JSON.stringify({
                    error: 'Database query failed',
                    details: error.message,
                    code: error.code,
                    checks
                }),
                { status: 500, headers: corsHeaders }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Database connection working!',
                checks,
                adminCount: count,
                sampleAdmins: data.map(a => ({ email: a.email, role: a.role, active: a.is_active }))
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({
                error: 'Exception occurred',
                message: error.message,
                stack: error.stack
            }),
            { status: 500, headers: corsHeaders }
        );
    }
}
