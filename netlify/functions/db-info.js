// netlify/functions/db-info.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Verify authorization
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Unauthorized' })
            };
        }

        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const dbInfo = {};

        // Check website_stats table
        const { data: stats, error: statsError } = await supabase
            .from('website_stats')
            .select('*')
            .limit(1);

        dbInfo.website_stats = {
            exists: !statsError,
            count: stats ? stats.length : 0,
            sample: stats ? stats[0] : null,
            error: statsError ? statsError.message : null
        };

        // Check contact_messages table
        const { data: messages, error: messagesError } = await supabase
            .from('contact_messages')
            .select('*')
            .limit(1);

        dbInfo.contact_messages = {
            exists: !messagesError,
            count: messages ? messages.length : 0,
            sample: messages ? messages[0] : null,
            error: messagesError ? messagesError.message : null
        };

        // Check featured_videos table
        const { data: videos, error: videosError } = await supabase
            .from('featured_videos')
            .select('*')
            .limit(1);

        dbInfo.featured_videos = {
            exists: !videosError,
            count: videos ? videos.length : 0,
            sample: videos ? videos[0] : null,
            error: videosError ? videosError.message : null
        };

        // Check daily_schedule table
        const { data: schedule, error: scheduleError } = await supabase
            .from('daily_schedule')
            .select('*')
            .limit(1);

        dbInfo.daily_schedule = {
            exists: !scheduleError,
            count: schedule ? schedule.length : 0,
            sample: schedule ? schedule[0] : null,
            error: scheduleError ? scheduleError.message : null
        };

        // Check website_content table
        const { data: content, error: contentError } = await supabase
            .from('website_content')
            .select('*')
            .limit(1);

        dbInfo.website_content = {
            exists: !contentError,
            count: content ? content.length : 0,
            sample: content ? content[0] : null,
            error: contentError ? contentError.message : null
        };

        // Get total counts
        const totals = {};
        for (const table of ['website_stats', 'contact_messages', 'featured_videos', 'daily_schedule', 'website_content']) {
            const { count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            totals[table] = count;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                tables: dbInfo,
                totals: totals,
                summary: {
                    totalTables: Object.keys(dbInfo).filter(k => dbInfo[k].exists).length,
                    tablesWithData: Object.keys(totals).filter(k => totals[k] > 0).length
                }
            })
        };

    } catch (error) {
        console.error('DB Info error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Failed to fetch database info',
                error: error.message
            })
        };
    }
};
