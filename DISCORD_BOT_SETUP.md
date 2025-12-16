# Discord Bot Setup Guide

## Overview
This guide will help you set up Discord notifications AND interactive commands for your Tafsir Kurd admin panel. Discord provides rich embeds with better formatting, colors, thumbnails, and more detailed information compared to simple text notifications. Plus, you can now query platform stats directly from Discord using slash commands!

## Features
- 🎨 **Rich Embeds** - Beautiful formatted messages with colors and fields
- 📸 **Thumbnails** - User profile pictures displayed in notifications
- 🎯 **Color-Coded** - Different notification types have unique colors
- 📊 **Organized Fields** - User data displayed in structured format
- ⚡ **Real-time** - Instant notifications for all admin events
- 🤖 **Interactive Commands** - Query stats, users, and activity directly from Discord
- 📈 **Analytics on Demand** - Get platform insights with simple slash commands

## Notification Types
The bot sends notifications for:
- 🎉 **New Users** - When someone joins the platform (Green)
- 👤 **User Login** - When users sign in (Blue)
- 📧 **Contact Messages** - New contact form submissions (Orange)
- 🏆 **Quran Completions** - Achievement milestones (Gold)
- 📖 **Reading Activity** - User reading progress (Cyan)
- 🎯 **Goals** - Daily goal updates (Pink)
- 📍 **Regional Users** - Special alerts for Duhok/Kurdish regions (Lime Green)

## Available Slash Commands
Interact with your platform directly from Discord:

### `/stats` - Platform Statistics
Get a comprehensive overview of your platform:
- 👥 Total users
- ✨ Active users (last 7 days)
- 🆕 New users (last 30 days)
- 📖 Total ayahs read
- 🏆 Users who completed the Quran
- 📈 Completion rate percentage

### `/users` - Recent Users
View the 10 most recent users who joined:
- Full name
- Location (city, country)
- Join date
- Quick overview of latest signups

### `/activity` - Activity Report
Monitor platform engagement:
- 📅 New users today
- 📅 New users yesterday
- 📅 New users this week
- 📅 New users this month
- 🌍 Most active region
- 📊 Growth trend indicator

## Setup Instructions

There are two parts to setup:
1. **Part A: Webhook Notifications** (Easy - for receiving notifications)
2. **Part B: Interactive Bot** (Advanced - for slash commands)

---

## Part A: Webhook Notifications Setup (Required)

### Step 1: Create Discord Server & Channel
1. Open Discord and create a new server (or use an existing one)
2. Create a dedicated channel for notifications (e.g., `#admin-notifications`)
3. Right-click the channel → **Edit Channel** → **Integrations** → **Webhooks**
4. Click **New Webhook**
5. Give it a name (e.g., "Tafsir Kurd Admin Bot")
6. Optionally customize the avatar

### Step 2: Copy Webhook URL
1. Click **Copy Webhook URL**
2. The URL looks like: `https://discord.com/api/webhooks/1234567890/abcdefghijklmnop...`
3. ⚠️ Keep this URL secure - anyone with it can send messages to your channel

### Step 3: Configure Netlify Environment Variables
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (tafsirkurd)
3. Go to **Site Settings** → **Environment Variables**
4. Click **Add a variable**
5. Add the following:
   - **Key:** `DISCORD_WEBHOOK_URL`
   - **Value:** Your webhook URL from Step 2
6. Click **Save**

### Step 4: Redeploy Your Site
1. In Netlify, go to **Deploys**
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete (usually 1-2 minutes)

### Step 5: Enable Notifications in Admin Panel
1. Go to your admin panel at `https://tafsirkurd.com/admin.html`
2. Log in with your admin account
3. Click on the **Discord** card
4. Click **Enable Notifications** button
5. Click **Send Test Notification** to verify it works
6. Check your Discord channel - you should see a test message!

---

## Part B: Interactive Bot Setup (Optional - for slash commands)

This section enables `/stats`, `/users`, and `/activity` commands in Discord.

### Step 1: Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Give it a name (e.g., "Tafsir Kurd Admin")
4. Click **Create**

### Step 2: Get Application Credentials
1. In your application, go to **General Information**
2. Copy **APPLICATION ID** - save this for later
3. Go to **Bot** tab in the sidebar
4. Click **Reset Token** (or **Add Bot** if you haven't created one)
5. Copy the **BOT TOKEN** - save this securely (you can only see it once!)
6. Scroll down and enable **MESSAGE CONTENT INTENT** (important!)

### Step 3: Get Public Key
1. Go back to **General Information** tab
2. Copy **PUBLIC KEY** - save this for later

### Step 4: Invite Bot to Your Server
1. Go to **OAuth2** → **URL Generator**
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Embed Links
4. Copy the generated URL at the bottom
5. Open the URL in a browser and select your server
6. Click **Authorize**

### Step 5: Configure Netlify Environment Variables
Add these new variables to your Netlify site:
1. Go to **Netlify Dashboard** → **Site Settings** → **Environment Variables**
2. Add the following:
   - **Key:** `DISCORD_APP_ID`, **Value:** (Application ID from Step 2)
   - **Key:** `DISCORD_BOT_TOKEN`, **Value:** (Bot Token from Step 2)
   - **Key:** `DISCORD_PUBLIC_KEY`, **Value:** (Public Key from Step 3)
3. Click **Save**

### Step 6: Set Interaction Endpoint URL
1. Go back to Discord Developer Portal → Your Application → **General Information**
2. Find **Interactions Endpoint URL**
3. Enter: `https://tafsirkurd.com/.netlify/functions/discord-interactions`
4. Click **Save Changes**
5. Discord will verify the endpoint - wait for "All your edits have been carefully recorded."

### Step 7: Register Slash Commands
1. Open terminal/command prompt
2. Navigate to your project folder:
   ```bash
   cd C:\TafsirKurd
   ```
3. Set environment variables (Windows):
   ```bash
   set DISCORD_APP_ID=your_app_id_here
   set DISCORD_BOT_TOKEN=your_bot_token_here
   ```
   Or on Mac/Linux:
   ```bash
   export DISCORD_APP_ID=your_app_id_here
   export DISCORD_BOT_TOKEN=your_bot_token_here
   ```
4. Run the registration script:
   ```bash
   node scripts/register-discord-commands.js
   ```
5. You should see: "✅ Successfully registered slash commands!"

### Step 8: Test Slash Commands
1. Open your Discord server
2. Type `/` in any channel
3. You should see your commands: `/stats`, `/users`, `/activity`
4. Try each command to verify they work!

### Troubleshooting Slash Commands

#### Commands not showing up?
1. Wait a few minutes - Discord caches commands
2. Try leaving and rejoining the server
3. Make sure the bot has proper permissions
4. Verify the bot is online in your server

#### "This interaction failed" error?
1. Check Netlify function logs for errors
2. Verify `DISCORD_PUBLIC_KEY` is set correctly
3. Make sure the Interaction Endpoint URL is correct
4. Check that your site is deployed with latest code

#### Getting 401 Unauthorized?
1. The Discord PUBLIC_KEY might be wrong
2. Verify you copied the Public Key, not the Client Secret
3. Redeploy your site after updating environment variables

---

## Testing
After setup, test your notifications:
1. Send a test notification from admin panel
2. Try registering a new test user
3. Submit a contact form message
4. All should appear in your Discord channel with rich formatting

## Discord Embed Structure
Each notification includes:
- **Title** - Event type and summary
- **Description** - Main message
- **Fields** - Structured data (user info, location, reading stats, etc.)
- **Color** - Visual indicator of notification type
- **Thumbnail** - User profile picture (if available)
- **Footer** - "Tafsir Kurd Admin Bot" with logo
- **Timestamp** - When the event occurred

## Troubleshooting

### Not receiving notifications?
1. Check that `DISCORD_WEBHOOK_URL` is set correctly in Netlify
2. Verify you redeployed after adding the environment variable
3. Make sure notifications are enabled in admin panel
4. Check that webhook wasn't deleted in Discord

### Notifications work but no images?
- Profile pictures from Google need to be publicly accessible
- Some images may be blocked by privacy settings

### Want to change notification channel?
1. Create a new webhook in Discord
2. Update `DISCORD_WEBHOOK_URL` in Netlify
3. Redeploy your site

## Advanced Customization

### Changing Colors
Edit `netlify/functions/discord-notify.js`:
```javascript
const embedColors = {
    'new_user': 0x00FF00,      // Green
    'user_login': 0x0099FF,    // Blue
    'contact': 0xFF9900,       // Orange
    // ... customize these hex colors
};
```

### Changing Bot Name/Avatar
In the Discord webhook settings, you can customize:
- Bot display name
- Bot avatar image

### Adding More Notification Types
1. Edit `discord-notify.js` to handle new notification types
2. Add new color in `embedColors` object
3. Send notifications from your code with the new type

## Security Notes
- ⚠️ Never commit your webhook URL to Git
- Keep webhook URL in environment variables only
- Regularly rotate webhooks if compromised
- Limit channel permissions to admin-only

## Support
If you need help:
1. Check Netlify function logs for errors
2. Verify webhook URL is valid in Discord
3. Test webhook manually using curl:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content":"Test message"}'
   ```

## Migration from Telegram
The old Telegram bot has been replaced with Discord. Benefits of Discord:
- ✅ Better formatting with rich embeds
- ✅ More visual with colors and thumbnails
- ✅ Interactive slash commands for on-demand analytics
- ✅ Easier webhook setup (no bot tokens needed for notifications)
- ✅ More popular platform with better mobile/desktop apps
- ✅ Built-in media previews and link embeds
- ✅ Real-time platform statistics at your fingertips

## Quick Reference

### Environment Variables Needed
For notifications (Part A):
- `DISCORD_WEBHOOK_URL` - Webhook URL from Discord channel

For slash commands (Part B):
- `DISCORD_APP_ID` - Application ID from Discord Developer Portal
- `DISCORD_BOT_TOKEN` - Bot token from Discord Developer Portal
- `DISCORD_PUBLIC_KEY` - Public key from Discord Developer Portal
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` - Supabase API key

### Available Commands
- `/stats` - View comprehensive platform statistics
- `/users` - List 10 most recent users
- `/activity` - Get activity report (daily/weekly/monthly)

### Files Created
- `netlify/functions/discord-notify.js` - Webhook notification handler
- `netlify/functions/discord-interactions.js` - Slash command handler
- `scripts/register-discord-commands.js` - Command registration script

---

**Note:** The Discord bot has two modes:
1. **Webhook Mode** (Part A) - Simple one-way notifications using webhooks. No bot application needed.
2. **Interactive Mode** (Part B) - Full bot with slash commands requiring Discord Developer Portal setup. Allows querying platform stats from Discord.
