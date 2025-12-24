const https = require('https');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { type, title, message, details, data } = JSON.parse(event.body);

        // Get Discord webhook URL - ALL notifications go to ONE channel
        const webhookURL = process.env.DISCORD_WEBHOOK_URL;

        if (!webhookURL) {
            console.error('Missing Discord webhook URL');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Discord not configured' })
            };
        }

        // Parse webhook URL to get host and path
        const webhookUrl = new URL(webhookURL);

        // Determine embed color based on notification type
        const embedColors = {
            'new_user': 0x00FF00,       // Green
            'user_login': 0x0099FF,     // Blue
            'contact': 0xFF6B6B,        // Red (Messages)
            'new_message': 0xFF6B6B,    // Red (Messages)
            'visitor': 0x4ECDC4,        // Teal (Visitors)
            'page_view': 0x4ECDC4,      // Teal (Visitors)
            'duhok_visitor': 0xFFA500,  // Orange (Duhok visitors)
            'completion': 0xFFD700,     // Gold
            'daily': 0x9966FF,          // Purple
            'reading': 0x00FFFF,        // Cyan
            'goal': 0xFF1493,           // Pink
            'region': 0x32CD32,         // Lime Green
            'duhok_user': 0xFFA500,     // Orange (Duhok users)
            'milestone': 0xFF69B4,      // Hot Pink
            'quran_complete': 0xFFD700, // Gold
            'default': 0x5865F2         // Discord Blurple
        };

        const color = embedColors[type] || embedColors['default'];

        // Build embed fields
        const fields = [];

        if (data) {
            if (data.userName) {
                fields.push({
                    name: '👤 User Name',
                    value: data.userName,
                    inline: true
                });
            }
            if (data.email) {
                fields.push({
                    name: '✉️ Email',
                    value: data.email,
                    inline: true
                });
            }
            if (data.city) {
                fields.push({
                    name: '📍 City',
                    value: data.city,
                    inline: true
                });
            }
            if (data.region) {
                fields.push({
                    name: '🗺️ Region',
                    value: data.region,
                    inline: true
                });
            }
            if (data.country) {
                fields.push({
                    name: '🌍 Country',
                    value: data.country,
                    inline: true
                });
            }
            if (data.location) {
                fields.push({
                    name: '📌 Full Location',
                    value: data.location,
                    inline: false
                });
            }
            if (data.currentSurah) {
                let reading = `Surah ${data.currentSurah}`;
                if (data.currentAyah) reading += `:${data.currentAyah}`;
                fields.push({
                    name: '📖 Currently Reading',
                    value: reading,
                    inline: true
                });
            }
            if (data.totalRead) {
                fields.push({
                    name: '📚 Total Ayahs Read',
                    value: String(data.totalRead),
                    inline: true
                });
            }
            if (data.completion) {
                fields.push({
                    name: '📊 Quran Completion',
                    value: `${data.completion}%`,
                    inline: true
                });
            }
            if (data.dailyGoal) {
                fields.push({
                    name: '🎯 Daily Goal',
                    value: String(data.dailyGoal),
                    inline: true
                });
            }
            if (data.ayahsRead && !data.totalRead) {
                fields.push({
                    name: '📖 Ayahs Read',
                    value: String(data.ayahsRead),
                    inline: true
                });
            }
            if (data.surah && data.ayah && !data.currentSurah) {
                fields.push({
                    name: '📍 Current Position',
                    value: `Surah ${data.surah}, Ayah ${data.ayah}`,
                    inline: false
                });
            }
        }

        // Build the embed
        const embed = {
            title: title || 'Notification',
            description: message || null,
            color: color,
            fields: fields,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Tafsir Kurd Admin Bot',
                icon_url: 'https://tafsirkurd.com/logo192.png'
            }
        };

        // Add thumbnail if profile picture exists
        let photoUrl = data?.picture || data?.profilePicture;
        if (photoUrl && photoUrl.includes('googleusercontent.com')) {
            photoUrl = photoUrl.replace(/=s\d+-c/, '=s400-c');
        }
        if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
            embed.thumbnail = {
                url: photoUrl
            };
        }

        // Add details as additional field if provided
        if (details) {
            fields.push({
                name: '📝 Details',
                value: details,
                inline: false
            });
        }

        // Create the Discord payload
        const discordPayload = {
            username: 'Tafsir Kurd Admin',
            avatar_url: 'https://tafsirkurd.com/logo512.png',
            embeds: [embed]
        };

        console.log('📤 Sending Discord notification...');

        // Send to Discord
        const result = await sendDiscordWebhook(webhookUrl, discordPayload);
        console.log('✅ Discord notification sent successfully');

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Discord notification sent successfully',
                webhookResult: result
            })
        };

    } catch (error) {
        console.error('❌ Discord notification error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function sendDiscordWebhook(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);

        const options = {
            hostname: webhookUrl.hostname,
            port: 443,
            path: webhookUrl.pathname + webhookUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 204 || res.statusCode === 200) {
                    resolve({ success: true, status: res.statusCode });
                } else {
                    console.error('Discord API error:', body);
                    reject(new Error(`Discord API error: ${res.statusCode} - ${body}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}
