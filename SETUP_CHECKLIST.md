# Discord Bot Setup Checklist

## ✅ Completed Steps
- [x] Created Discord Application (ID: 1450611096015605913)
- [x] Got Public Key
- [x] Generated OAuth2 invite URL
- [x] Pushed code changes to GitHub
- [x] Code deployed to Netlify

## 📋 Next Steps

### 1. Get Bot Token
- [ ] Go to Discord Developer Portal → Bot tab
- [ ] Click "Reset Token" (or "Copy" if visible)
- [ ] **COPY THE TOKEN IMMEDIATELY** (you can only see it once!)
- [ ] Save it securely (you'll need it for next steps)

### 2. Invite Bot to Server
- [ ] Open URL: https://discord.com/oauth2/authorize?client_id=1450611096015605913&permissions=18432&integration_type=0&scope=applications.commands+bot
- [ ] Select your server
- [ ] Click Authorize
- [ ] Verify bot appears in server member list

### 3. Add Environment Variables to Netlify
Go to: https://app.netlify.com/sites/tafsirkurd/settings/deploys#environment-variables

Add these variables:

- [ ] `DISCORD_WEBHOOK_URL` = (your webhook URL)
- [ ] `DISCORD_APP_ID` = `1450611096015605913`
- [ ] `DISCORD_PUBLIC_KEY` = `3391a2184965e514b9fcb879634ef74933c0b7001e0b2d3e7d5429786`
- [ ] `DISCORD_BOT_TOKEN` = (your bot token from step 1)

Click "Save" after adding all variables.

### 4. Wait for Netlify Deployment
- [ ] Go to: https://app.netlify.com/sites/tafsirkurd/deploys
- [ ] Wait for deployment to show "Published" status
- [ ] Takes about 1-2 minutes

### 5. Set Interaction Endpoint URL
**DO THIS AFTER DEPLOYMENT COMPLETES!**

- [ ] Go to Discord Developer Portal → General Information
- [ ] Find "Interactions Endpoint URL"
- [ ] Enter: `https://tafsirkurd.com/.netlify/functions/discord-interactions`
- [ ] Click "Save Changes"
- [ ] Wait for green checkmark ✅

If you get an error:
- Make sure deployment is complete
- Check DISCORD_PUBLIC_KEY is correct in Netlify
- Try again after waiting 1 minute

### 6. Register Slash Commands
Open terminal/command prompt and run:

**Windows (Command Prompt):**
```bash
cd C:\TafsirKurd
set DISCORD_APP_ID=1450611096015605913
set DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
node scripts/register-discord-commands.js
```

**Windows (PowerShell):**
```powershell
cd C:\TafsirKurd
$env:DISCORD_APP_ID="1450611096015605913"
$env:DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
node scripts/register-discord-commands.js
```

Expected output:
```
✅ Successfully registered slash commands!
📝 Registered 3 commands:
   - /stats - View platform statistics
   - /users - List the 10 most recent users
   - /activity - View platform activity report
🎉 Your Discord bot is ready to use!
```

### 7. Test Everything!

#### Test Notifications:
- [ ] Go to https://tafsirkurd.com/admin.html
- [ ] Click Discord card
- [ ] Click "Enable Notifications"
- [ ] Click "Send Test Notification"
- [ ] Check Discord - you should see a rich embed!

#### Test Slash Commands:
- [ ] Open Discord server
- [ ] Type `/` in any channel
- [ ] You should see: /stats, /users, /activity
- [ ] Try `/stats` - should show platform statistics
- [ ] Try `/users` - should list recent users
- [ ] Try `/activity` - should show activity report

---

## Troubleshooting

### Notifications not working?
- Check DISCORD_WEBHOOK_URL is correct in Netlify
- Verify notifications are enabled in admin panel
- Check webhook still exists in Discord

### Slash commands not showing?
- Wait a few minutes (Discord caches commands)
- Leave and rejoin the server
- Make sure bot has correct permissions
- Verify bot is online in server

### "This interaction failed" error?
- Check Netlify function logs
- Verify DISCORD_PUBLIC_KEY is correct
- Make sure Interaction Endpoint URL is set
- Ensure site is fully deployed

### 401 Unauthorized error?
- Double-check PUBLIC_KEY (not Client Secret!)
- Redeploy after updating environment variables
- Verify endpoint URL is exactly: `https://tafsirkurd.com/.netlify/functions/discord-interactions`

---

## Environment Variables Summary

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_APP_ID=1450611096015605913
DISCORD_PUBLIC_KEY=3391a2184965e514b9fcb879634ef74933c0b7001e0b2d3e7d5429786
DISCORD_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
```

## Quick Links
- [Discord Developer Portal](https://discord.com/developers/applications/1450611096015605913)
- [Netlify Environment Variables](https://app.netlify.com/sites/tafsirkurd/settings/deploys#environment-variables)
- [Netlify Deploys](https://app.netlify.com/sites/tafsirkurd/deploys)
- [Admin Panel](https://tafsirkurd.com/admin.html)
- [Full Documentation](DISCORD_BOT_SETUP.md)

---

**Current Status:** Setting up environment variables
**Next Action:** Get bot token and add all environment variables to Netlify
