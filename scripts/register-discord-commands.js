const https = require('https');

// Get environment variables
const DISCORD_APP_ID = process.env.DISCORD_APP_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
    console.error('❌ Missing required environment variables:');
    console.error('   - DISCORD_APP_ID');
    console.error('   - DISCORD_BOT_TOKEN');
    console.error('\nPlease set these in your .env file or environment');
    process.exit(1);
}

// Define slash commands
const commands = [
    {
        name: 'stats',
        description: 'View platform statistics (users, activity, completions)',
        type: 1
    },
    {
        name: 'users',
        description: 'List the 10 most recent users who joined',
        type: 1
    },
    {
        name: 'activity',
        description: 'View platform activity report (daily, weekly, monthly)',
        type: 1
    }
];

// Register commands with Discord
async function registerCommands() {
    console.log('🚀 Registering Discord slash commands...\n');

    const data = JSON.stringify(commands);

    const options = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/v10/applications/${DISCORD_APP_ID}/commands`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);

                    if (res.statusCode === 200) {
                        console.log('✅ Successfully registered slash commands!');
                        console.log(`\n📝 Registered ${response.length} commands:`);
                        response.forEach(cmd => {
                            console.log(`   - /${cmd.name} - ${cmd.description}`);
                        });
                        console.log('\n🎉 Your Discord bot is ready to use!');
                        console.log('   Try typing / in your Discord server to see the commands.\n');
                        resolve(response);
                    } else {
                        console.error('❌ Failed to register commands');
                        console.error(`Status: ${res.statusCode}`);
                        console.error(`Response: ${body}`);
                        reject(new Error(`Discord API error: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.error('❌ Error parsing response:', error.message);
                    console.error('Response body:', body);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// Main execution
registerCommands()
    .then(() => {
        console.log('✨ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed to register commands:', error.message);
        process.exit(1);
    });
