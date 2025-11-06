# Telegram Notifications Setup Guide

This guide will help you set up Telegram notifications for the Tafsir Kurd admin panel.

## 📱 What You'll Get Notified About

Your Telegram bot will automatically send you notifications when:
- 🎉 **New Users** join the platform
- 📍 **Duhok Readers** - Special alerts for users from Duhok and Kurdish regions
- 📧 **New Messages** - Instant alerts for new contact messages
- 🏆 **Quran Completed** - Celebrate when users complete reading the Quran

## 🛠️ Setup Instructions

### Step 1: Create a Telegram Bot

1. Open Telegram on your phone
2. Search for **@BotFather**
3. Send the command `/newbot`
4. Follow the instructions:
   - Choose a name for your bot (e.g., "Tafsir Kurd Admin")
   - Choose a username (e.g., "tafsirkurd_admin_bot")
5. Copy the **Bot Token** (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
   - ⚠️ Keep this token secret!

### Step 2: Get Your Chat ID

1. Search for your bot in Telegram and start a conversation with `/start`
2. Search for **@userinfobot** and send `/start`
3. Copy your **Chat ID** (a number like: `123456789`)

### Step 3: Add to Netlify Environment Variables

1. Go to [Netlify Dashboard](https://app.netlify.com/sites/tafsirkurd/settings/deploys#environment)
2. Navigate to: **Site Settings → Environment Variables**
3. Add these two variables:
   ```
   Key: TELEGRAM_BOT_TOKEN
   Value: (paste your bot token from Step 1)

   Key: TELEGRAM_CHAT_ID
   Value: (paste your chat ID from Step 2)
   ```
4. Click **Save**
5. **Redeploy your site** for changes to take effect

### Step 4: Enable Notifications in Admin Panel

1. Go to your admin panel: https://tafsirkurd.com/admin
2. Click on the **📱 Telegram** tab
3. Click **Enable Notifications**
4. Click **🧪 Send Test Notification** to verify it's working

## ✅ Testing

After setup, you should:
1. Receive a test notification on your phone
2. See "✅ Enabled" status in the admin panel
3. Get real-time notifications as events happen

## 📋 Example Notification

When a new user from Duhok joins, you'll receive:

```
📍 Duhok Readers

3 users from Duhok are using the platform

ℹ️ Ahmad - 245 ayahs read • Sara - 156 ayahs read • Omar - 89 ayahs read

🕐 11/6/2025, 3:45 PM (Iraq Time)
```

## 🔧 Troubleshooting

**Problem:** Test notification fails
- Check that both environment variables are set correctly
- Make sure you started a conversation with your bot (`/start`)
- Verify you redeployed the site after adding environment variables

**Problem:** Not receiving notifications
- Check that notifications are enabled in the admin panel
- Verify your bot token is correct
- Make sure your Chat ID is correct (it's a number, not a username)

**Problem:** Notifications are delayed
- Telegram notifications are sent when you load the admin panel
- The admin panel checks for new events and sends notifications

## 🔐 Security

- **Never share your bot token** with anyone
- The bot token gives full control of your bot
- Only you (with your Chat ID) will receive notifications
- The token is stored securely in Netlify environment variables

## 💡 Tips

- You can disable notifications anytime from the admin panel
- Test notifications don't count towards notification limits
- You can use the same bot for multiple admins by adding multiple chat IDs (requires code modification)
- Telegram has no limits on bot messages for personal use

## 🆘 Need Help?

If you encounter any issues:
1. Check the browser console for errors (F12 → Console tab)
2. Verify environment variables are set in Netlify
3. Make sure the site was redeployed after adding variables
4. Test with the Send Test Notification button first
