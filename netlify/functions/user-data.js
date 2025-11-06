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
            // Check if this is a new user (first save)
            const { data: existingData } = await supabase
                .from('user_data')
                .select('data, created_at')
                .eq('user_id', userId)
                .single();

            const isNewUser = !existingData;

            const { error } = await supabase
                .from('user_data')
                .upsert({
                    user_id: userId,
                    data: data,
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

            // Send notifications for important events (don't await, run async)
            if (data) {
                // New user notification
                if (isNewUser) {
                    const userName = data.full_name || data.email || 'New User';
                    const location = data.city || data.region || data.country || 'Unknown';
                    const isDuhok = location.toLowerCase().includes('duhok') ||
                                   location.toLowerCase().includes('dihok');

                    sendTelegramNotification(
                        isDuhok ? 'duhok_user' : 'new_user',
                        isDuhok ? '📍 New User from Duhok!' : '🎉 New User Joined!',
                        `${userName} just joined the platform`,
                        `Location: ${location}`,
                        {
                            userName,
                            location,
                            email: data.email
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
