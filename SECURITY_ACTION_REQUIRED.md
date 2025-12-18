# 🚨 URGENT SECURITY ACTIONS REQUIRED 🚨

## CRITICAL: Your credentials have been exposed in git history

The code review revealed that Discord webhooks and Supabase API keys were hardcoded in batch files and committed to git. **Even though they've been removed, they're still in git history and must be regenerated immediately.**

---

## IMMEDIATE ACTIONS (Do this NOW!)

### 1. Regenerate All Discord Webhooks

**Why:** Old webhook URLs are compromised and visible in git history.

**How to regenerate:**

1. Go to your Discord server
2. For each channel (#-members, #-messages, #-zceer):
   - Right-click the channel → **Edit Channel**
   - Click **Integrations** → **Webhooks**
   - Find the old webhook → Click **Delete Webhook**
   - Click **New Webhook**
   - Set name (e.g., "Member Notifications")
   - **Copy the new Webhook URL**
   - Click **Save Changes**

**Affected channels:**
- ✅ #-members (for user signups, completions, milestones)
- ✅ #-messages (for contact form submissions)
- ✅ #-zceer (for daily dhikr messages)

---

### 2. Rotate Supabase API Keys

**Why:** Your `SUPABASE_ANON_KEY` was exposed in git history.

**How to rotate:**

1. Go to **https://supabase.com/dashboard**
2. Select your **TafsirKurd** project
3. Click **Settings** (left sidebar) → **API**
4. Scroll down to **Project API keys**
5. Click **Regenerate** next to the `anon/public` key
6. **Confirm the regeneration**
7. **Copy the new key immediately**

**⚠️ WARNING:** After regenerating:
- Your old key will stop working
- You need to update all places that use it

---

### 3. Update config.bat with New Credentials

**Location:** `C:\TafsirKurd\config.bat`

**Instructions:**

1. Open `config.bat` in a text editor
2. Replace ALL old webhook URLs with the new ones you just created
3. Replace the old `SUPABASE_ANON_KEY` with the new regenerated key
4. Save the file

**Example config.bat:**
```batch
@echo off

REM Supabase Configuration
set SUPABASE_URL=https://nvwgepkhzobgwnzibpvq.supabase.co
set SUPABASE_ANON_KEY=<YOUR_NEW_REGENERATED_ANON_KEY>

REM Discord Webhook URLs (NEW URLs after regeneration)
set DISCORD_WEBHOOK_URL=<NEW_MEMBERS_WEBHOOK_URL>
set DISCORD_WEBHOOK_MESSAGES=<NEW_MESSAGES_WEBHOOK_URL>
set DISCORD_WEBHOOK_VISITORS=<NEW_VISITORS_WEBHOOK_URL>
set DISCORD_WEBHOOK_ZCEER=<NEW_ZCEER_WEBHOOK_URL>
set DISCORD_WEBHOOK_STATS=<NEW_STATS_WEBHOOK_URL>
```

---

### 4. Update Netlify Environment Variables

**Why:** Netlify functions also use these credentials.

**How to update:**

1. Go to **https://app.netlify.com**
2. Select your **tafsirkurd** site
3. Go to **Site configuration** → **Environment variables**
4. **Update these variables** with your new regenerated values:
   - `SUPABASE_ANON_KEY` → New key from Supabase
   - `DISCORD_WEBHOOK_URL` → New #-members webhook
   - `DISCORD_WEBHOOK_MESSAGES` → New #-messages webhook
   - `DISCORD_WEBHOOK_VISITORS` → New #-visitors webhook (if used)

5. Click **Save** for each one

6. **Redeploy your site:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Wait for deployment to complete

---

## VERIFICATION

After completing all 4 steps above, **test that everything works:**

### Test Discord Notifications:

1. **Test Zceer (should still work with Task Scheduler):**
   - Wait for next scheduled zceer time OR
   - Run manually: `C:\TafsirKurd\send-random-zceer.bat`
   - ✅ Check Discord #-zceer channel for new message

2. **Test Website Notifications:**
   - Go to tafsirkurd.com
   - Submit a contact form message
   - ✅ Check Discord #-messages channel
   - Create a test user account
   - ✅ Check Discord #-members channel

### Test Website Functionality:

1. Go to **tafsirkurd.com**
2. Sign in with Google
3. Read some Quran pages
4. ✅ Verify reading progress saves correctly
5. ✅ Verify no console errors

---

## WHAT WAS FIXED

✅ **Removed hardcoded secrets** from all batch files
✅ **Created config.bat system** for local credential storage
✅ **Enhanced .env.example** with complete template
✅ **Added config.bat to .gitignore** so secrets are never committed again
✅ **Updated all batch files** to load credentials securely

---

## STILL TO DO (From Code Review)

**CRITICAL Issues Remaining:**
1. ⚠️ **Fix hardcoded admin password in auth.js** (next priority)
2. ⚠️ **Implement bcrypt password hashing** (plaintext passwords currently)
3. ⚠️ **Fix XSS vulnerabilities** in admin.html and Quran.html
4. ⚠️ **Add CSRF protection** to API endpoints
5. ⚠️ **Restrict CORS headers** (currently allows all origins)

**See full code review report above for complete list.**

---

## QUESTIONS?

If you encounter any issues:
1. Check that config.bat exists and has correct values
2. Verify Netlify environment variables are set
3. Confirm new webhooks work by testing manually
4. Check browser console for errors (F12)

---

## ⏰ TIMELINE

**Now (0-30 minutes):**
- ✅ Regenerate all Discord webhooks
- ✅ Rotate Supabase API key
- ✅ Update config.bat
- ✅ Update Netlify variables
- ✅ Redeploy site
- ✅ Test everything works

**Next Session:**
- Fix remaining CRITICAL security issues
- Implement password hashing
- Fix XSS vulnerabilities
- Add CSRF protection

---

**Last updated:** December 18, 2025
**Security Level:** CRITICAL → MEDIUM (after completing actions above)
