# Update Netlify Environment Variables

**Date:** December 18, 2025
**Status:** ACTION REQUIRED - Update credentials immediately

---

## Why This Is Critical

Your old Supabase keys and Discord webhooks were exposed in git history. Even though we removed them from the code, anyone with access to your GitHub repository history can still see them. You've now generated new credentials, and they need to be updated in Netlify for your deployed site to work properly.

---

## Step-by-Step Instructions

### 1. Go to Netlify Dashboard

1. Open your browser and go to: https://app.netlify.com
2. Log in with your Netlify account
3. Click on your **TafsirKurd** site

### 2. Open Environment Variables Settings

1. Click **Site settings** (in the top navigation)
2. In the left sidebar, click **Environment variables**
3. You'll see a list of all your current environment variables

### 3. Update Supabase Configuration

**Update SUPABASE_URL:**
- Click on `SUPABASE_URL`
- Click **Edit** or the pencil icon
- Change the value to:
  ```
  https://gijupzejtbpifjzwadee.supabase.co
  ```
- Click **Save**

**Update SUPABASE_ANON_KEY:**
- Click on `SUPABASE_ANON_KEY`
- Click **Edit** or the pencil icon
- Change the value to:
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M
  ```
- Click **Save**

### 4. Update Discord Webhook URLs

**Update or Add DISCORD_WEBHOOK_URL:**
- If it exists, click on it and edit. If not, click **Add a variable**
- Variable name: `DISCORD_WEBHOOK_URL`
- Value:
  ```
  https://discord.com/api/webhooks/1451127799489364033/ecmzUU1jf2mbsnPx22L1VMGLLeZeQW5JvyYE2Mht2aqD1mSOOtNTGWwHN_AVRwTszksN
  ```
- Same value applies to: `DISCORD_WEBHOOK_VISITORS` and `DISCORD_WEBHOOK_STATS`

**Update or Add DISCORD_WEBHOOK_MEMBERS:**
- Variable name: `DISCORD_WEBHOOK_MEMBERS`
- Value:
  ```
  https://discord.com/api/webhooks/1451128066045771847/ypHo4c80MzPczr8JdWuUxMl0oNloG1gfDa35dZi8363IdyDtnfPFjLaWx3wG7BQVd1Qs
  ```

**Update DISCORD_WEBHOOK_MESSAGES:**
- Variable name: `DISCORD_WEBHOOK_MESSAGES`
- Value:
  ```
  https://discord.com/api/webhooks/1451128239195033733/4F54qxgUe-6TQ4oniZZtmMVAzMD8XKtAOMY2yPAo-dT8M6GhOcDaF4bHTBtVeF8LeQDy
  ```

**Update DISCORD_WEBHOOK_ZCEER:**
- Variable name: `DISCORD_WEBHOOK_ZCEER`
- Value:
  ```
  https://discord.com/api/webhooks/1451128446192451746/UWkNzC59g02R6VIqiJUoUAoaF75wpuGQ5RYo3f2x2PDjXCaU9yO8h8wbjOK16n41ibR3
  ```

### 5. Trigger a Redeploy

After updating all environment variables:

1. Go back to your site's main dashboard
2. Click **Deploys** tab
3. Click **Trigger deploy** button (top right)
4. Select **Deploy site**
5. Wait for the deployment to complete (usually 1-2 minutes)

---

## What Each Webhook Does

| Variable | Channel | Purpose |
|----------|---------|---------|
| `DISCORD_WEBHOOK_URL` | #📢-notification | General notifications, stats |
| `DISCORD_WEBHOOK_VISITORS` | #📢-notification | Visitor tracking (currently disabled) |
| `DISCORD_WEBHOOK_STATS` | #📢-notification | Statistical updates |
| `DISCORD_WEBHOOK_MEMBERS` | #👥-members | New user signups |
| `DISCORD_WEBHOOK_MESSAGES` | #📧-messages | Contact form submissions |
| `DISCORD_WEBHOOK_ZCEER` | #🤲-zceer | Daily dhikr/zceer posts |

---

## Testing After Update

Once the deployment is complete, test each notification type:

### Test Member Signup:
1. Go to your website
2. Sign up with a new test account
3. Check #👥-members channel in Discord - you should see a notification

### Test Contact Message:
1. Go to your website homepage
2. Submit a test message via the contact form
3. Check #📧-messages channel in Discord - you should see the message

### Test Zceer (Manual):
Run this command on your PC:
```cmd
cd C:\TafsirKurd
send-random-zceer.bat
```
Check #🤲-zceer channel in Discord - you should see a zceer post

---

## Summary Checklist

- [ ] Updated `SUPABASE_URL` in Netlify
- [ ] Updated `SUPABASE_ANON_KEY` in Netlify
- [ ] Updated `DISCORD_WEBHOOK_URL` in Netlify
- [ ] Updated or added `DISCORD_WEBHOOK_MEMBERS` in Netlify
- [ ] Updated `DISCORD_WEBHOOK_MESSAGES` in Netlify
- [ ] Updated `DISCORD_WEBHOOK_ZCEER` in Netlify
- [ ] Triggered a manual redeploy
- [ ] Tested member signup notification
- [ ] Tested contact message notification
- [ ] Tested zceer notification

---

## Important Notes

1. **Local config.bat is already updated** - Your local Windows batch files will use the new credentials
2. **Don't commit credentials** - Never commit config.bat to git (it's in .gitignore)
3. **Old webhooks still in git history** - The old compromised webhooks are still visible in your GitHub history. Consider deleting them in Discord to prevent abuse:
   - Go to Discord > Server Settings > Integrations > Webhooks
   - Delete the old webhooks from December 17-18

---

**After completing these steps, your site will be fully secured with new credentials!**
