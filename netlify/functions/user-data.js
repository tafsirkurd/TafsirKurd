// netlify/functions/user-data.js
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Helper function to send Telegram notifications
async function sendTelegramNotification(type, title, message, details, data) {
    try {
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return; // Telegram not configured, skip
        }

        const notificationData = {
            type,
            title,
            message,
            details,
            data
        };

        const response = await fetch('https://tafsirkurd.com/.netlify/functions/telegram-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notificationData)
        });

        if (!response.ok) {
            console.error('Failed to send Telegram notification');
        }
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
    }
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Verify Supabase config
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const body = JSON.parse(event.body || '{}');
        const { userId, action, data } = body;

        // Validate userId
        if (!userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'User ID required' })
            };
        }

        // SAVE user data
        if (action === 'save' && event.httpMethod === 'POST') {
            // Load existing data first to merge properly
            const { data: existingRecord } = await supabase
                .from('user_data')
                .select('data, created_at')
                .eq('user_id', userId)
                .single();

            const isNewUser = !existingRecord;
            const existingData = existingRecord?.data || {};

            // Deep merge function to preserve all existing data
            function deepMerge(target, source) {
                const output = { ...target };
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        output[key] = deepMerge(target[key] || {}, source[key]);
                    } else if (Array.isArray(source[key])) {
                        // For arrays, prefer source if it has data, otherwise keep target
                        output[key] = source[key].length > 0 ? source[key] : (target[key] || []);
                    } else {
                        // For primitives, prefer source if defined and not null, otherwise keep target
                        output[key] = (source[key] !== undefined && source[key] !== null) ? source[key] : target[key];
                    }
                }
                return output;
            }

            // Merge new data with existing data to prevent data loss
            let mergedData = deepMerge(existingData, data);

            // Critical data protection: Don't reset important fields to defaults
            if (!isNewUser) {
                // Protect reading position from being reset
                if (existingData.currentPosition && existingData.currentPosition.surah > 1) {
                    if (mergedData.currentPosition && mergedData.currentPosition.surah === 1 && mergedData.currentPosition.ayah === 1) {
                        console.log('⚠️ Prevented currentPosition reset to default');
                        mergedData.currentPosition = existingData.currentPosition;
                    }
                }

                // Protect streak from being reset to 0
                if (existingData.stats && existingData.stats.streak > 0) {
                    if (!mergedData.stats || !mergedData.stats.streak || mergedData.stats.streak === 0) {
                        console.log('⚠️ Prevented streak reset to 0');
                        mergedData.stats = mergedData.stats || {};
                        mergedData.stats.streak = existingData.stats.streak;
                    }
                }

                // Protect ayahsRead from decreasing
                if (existingData.stats && existingData.stats.ayahsRead > 0) {
                    if (!mergedData.stats || !mergedData.stats.ayahsRead || mergedData.stats.ayahsRead < existingData.stats.ayahsRead) {
                        console.log('⚠️ Prevented ayahsRead from decreasing');
                        mergedData.stats = mergedData.stats || {};
                        mergedData.stats.ayahsRead = Math.max(existingData.stats.ayahsRead, mergedData.stats.ayahsRead || 0);
                    }
                }

                // Protect level from decreasing
                if (existingData.stats && existingData.stats.level > 0) {
                    if (!mergedData.stats || !mergedData.stats.level || mergedData.stats.level < existingData.stats.level) {
                        console.log('⚠️ Prevented level from decreasing');
                        mergedData.stats = mergedData.stats || {};
                        mergedData.stats.level = Math.max(existingData.stats.level, mergedData.stats.level || 0);
                    }
                }

                // Merge readAyahs arrays (union)
                if (existingData.readAyahs && Array.isArray(existingData.readAyahs)) {
                    const existingSet = new Set(existingData.readAyahs);
                    const newSet = new Set(mergedData.readAyahs || []);
                    mergedData.readAyahs = Array.from(new Set([...existingSet, ...newSet]));
                }
            }

            const { error } = await supabase
                .from('user_data')
                .upsert({
                    user_id: userId,
                    data: mergedData,  // Use merged data instead of raw data
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) {
                console.error('Save error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }

            console.log(`✅ Saved user data with merge protection (isNewUser: ${isNewUser})`);
            if (!isNewUser) {
                console.log(`   Preserved: streak=${mergedData.stats?.streak}, position=${mergedData.currentPosition?.surah}:${mergedData.currentPosition?.ayah}`);
            }

            // Send notifications for important events (don't await, run async)
            if (data) {
                // New user notification
                if (isNewUser) {
                    const userName = data.full_name || data.email || 'New User';
                    const location = [data.city, data.region, data.country].filter(Boolean).join(', ') || 'Unknown';
                    const isDuhok = location.toLowerCase().includes('duhok') ||
                                   location.toLowerCase().includes('dihok');

                    sendTelegramNotification(
                        isDuhok ? 'duhok_user' : 'new_user',
                        isDuhok ? '📍 New User from Duhok!' : '🎉 New User Joined!',
                        `${userName} just registered`,
                        null,
                        {
                            userName: data.full_name || 'Not provided',
                            email: data.email || 'Not provided',
                            location: location,
                            city: data.city || 'Unknown',
                            region: data.region || 'Unknown',
                            country: data.country || 'Unknown',
                            dailyGoal: data.daily_goal || 'Not set',
                            currentSurah: data.current_surah || 'Not started',
                            currentAyah: data.current_ayah || '-',
                            totalRead: data.total_read || 0,
                            completion: data.completion || 0,
                            picture: data.picture || null, // Send actual URL instead of Yes/No
                            profilePicture: data.picture || null
                        }
                    ).catch(err => console.error('Notification error:', err));
                }

                // Quran completion notification
                if (data.completion >= 100 && (!existingData?.data?.completion || existingData.data.completion < 100)) {
                    const userName = data.full_name || 'A user';
                    sendTelegramNotification(
                        'quran_complete',
                        '🏆 Quran Completed!',
                        `${userName} has completed reading the entire Quran!`,
                        `Total ayahs read: ${data.total_read || 0}`,
                        {
                            userName,
                            ayahsRead: data.total_read
                        }
                    ).catch(err => console.error('Notification error:', err));
                }

                // Milestone notifications (every 1000 ayahs)
                if (data.total_read && existingData?.data?.total_read) {
                    const oldMilestone = Math.floor(existingData.data.total_read / 1000);
                    const newMilestone = Math.floor(data.total_read / 1000);
                    if (newMilestone > oldMilestone) {
                        const userName = data.full_name || 'A user';
                        sendTelegramNotification(
                            'milestone',
                            '⭐ Reading Milestone!',
                            `${userName} reached ${newMilestone * 1000}+ ayahs!`,
                            `Current progress: ${data.total_read} ayahs`,
                            {
                                userName,
                                ayahsRead: data.total_read
                            }
                        ).catch(err => console.error('Notification error:', err));
                    }
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Data saved successfully' })
            };
        }

        // LOAD user data
        if (action === 'load' && event.httpMethod === 'POST') {
            const { data: userData, error } = await supabase
                .from('user_data')
                .select('data')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('Load error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: userData ? userData.data : null
                })
            };
        }

        // DELETE user data (for account deletion)
        if (action === 'delete' && event.httpMethod === 'POST') {
            const { error } = await supabase
                .from('user_data')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error('Delete error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Data deleted successfully' })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid action' })
        };

    } catch (error) {
        console.error('User data function error:', error);
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
