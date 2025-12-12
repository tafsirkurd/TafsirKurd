/**
 * Activity Feed Cleanup Function
 *
 * Automatically removes old activity feed entries based on priority and age
 * to prevent the database from growing too large.
 *
 * Scheduled to run daily at 2 AM (configured in netlify.toml)
 *
 * Retention policy:
 * - Dismissed events: 30 days
 * - Low priority: 60 days
 * - Normal priority: 90 days
 * - High/Urgent priority: 180 days
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    try {
        // Initialize Supabase client with service role key for admin operations
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY // Use service role key for full access
        );

        const now = new Date();

        // Calculate cutoff dates for each retention period
        const dismissedCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const lowPriorityCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const normalCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const highPriorityCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        let totalDeleted = 0;
        const deletionStats = {};

        // 1. Delete dismissed events older than 30 days
        const { data: dismissed, error: dismissedError } = await supabase
            .from('admin_activity_feed')
            .delete()
            .eq('is_dismissed', true)
            .lt('created_at', dismissedCutoff.toISOString());

        if (dismissedError) {
            console.error('Error deleting dismissed events:', dismissedError);
        } else {
            deletionStats.dismissed = dismissed?.length || 0;
            totalDeleted += deletionStats.dismissed;
            console.log(`✅ Deleted ${deletionStats.dismissed} dismissed events`);
        }

        // 2. Delete low priority events older than 60 days
        const { data: lowPriority, error: lowPriorityError } = await supabase
            .from('admin_activity_feed')
            .delete()
            .eq('priority', 'low')
            .lt('created_at', lowPriorityCutoff.toISOString())
            .eq('is_dismissed', false); // Don't double-delete dismissed ones

        if (lowPriorityError) {
            console.error('Error deleting low priority events:', lowPriorityError);
        } else {
            deletionStats.lowPriority = lowPriority?.length || 0;
            totalDeleted += deletionStats.lowPriority;
            console.log(`✅ Deleted ${deletionStats.lowPriority} low priority events`);
        }

        // 3. Delete normal priority events older than 90 days
        const { data: normal, error: normalError } = await supabase
            .from('admin_activity_feed')
            .delete()
            .eq('priority', 'normal')
            .lt('created_at', normalCutoff.toISOString())
            .eq('is_dismissed', false);

        if (normalError) {
            console.error('Error deleting normal priority events:', normalError);
        } else {
            deletionStats.normal = normal?.length || 0;
            totalDeleted += deletionStats.normal;
            console.log(`✅ Deleted ${deletionStats.normal} normal priority events`);
        }

        // 4. Delete high/urgent priority events older than 180 days
        const { data: highPriority, error: highPriorityError } = await supabase
            .from('admin_activity_feed')
            .delete()
            .in('priority', ['high', 'urgent'])
            .lt('created_at', highPriorityCutoff.toISOString())
            .eq('is_dismissed', false);

        if (highPriorityError) {
            console.error('Error deleting high/urgent priority events:', highPriorityError);
        } else {
            deletionStats.highPriority = highPriority?.length || 0;
            totalDeleted += deletionStats.highPriority;
            console.log(`✅ Deleted ${deletionStats.highPriority} high/urgent priority events`);
        }

        // Log final summary
        console.log('🧹 Activity feed cleanup completed');
        console.log(`📊 Total events deleted: ${totalDeleted}`);
        console.log('📅 Breakdown:', deletionStats);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Activity feed cleanup completed successfully',
                totalDeleted,
                breakdown: deletionStats,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('❌ Cleanup error:', error);
        console.error('Error stack:', error.stack);

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
