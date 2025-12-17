# Discord Webhook Troubleshooting - Channel Separation Not Working

## Problem
All notifications are going to a single "notifications" channel instead of being separated into 3 channels.

## Why This Happens
The Netlify environment variables `DISCORD_WEBHOOK_MESSAGES` and `DISCORD_WEBHOOK_VISITORS` are missing or not set correctly. When these are missing, the code falls back to `DISCORD_WEBHOOK_URL` for everything.

---

## Solution: Create & Add Missing Webhooks

### Step 1: Create Webhooks in Discord

#### A. Create Messages Channel Webhook
1. Open Discord → Your server
2. Go to **📧-messages** channel (or create it if it doesn't exist)
3. Click the ⚙️ gear icon next to the channel name
4. Click **Integrations** (left sidebar)
5. Click **Webhooks** → **New Webhook**
6. Name it: `Message Notifications`
7. **Copy the Webhook URL** (it looks like: `https://discord.com/api/webhooks/...`)
8. Click **Save Changes**

#### B. Create Visitors Channel Webhook
1. Go to **👥-visitors** channel (or create it if it doesn't exist)
2. Click the ⚙️ gear icon next to the channel name
3. Click **Integrations** (left sidebar)
4. Click **Webhooks** → **New Webhook**
5. Name it: `Visitor Tracking`
6. **Copy the Webhook URL**
7. Click **Save Changes**

---

### Step 2: Add Webhooks to Netlify

1. Go to **Netlify Dashboard** (app.netlify.com)
2. Select your site (TafsirKurd)
3. Go to **Site configuration** → **Environment variables**
4. Click **Add a variable** → **Add a single variable**

**Add these 2 new variables:**

#### Variable 1: DISCORD_WEBHOOK_MESSAGES
- **Key:** `DISCORD_WEBHOOK_MESSAGES`
- **Value:** Paste the webhook URL from your 📧-messages channel
- **Scopes:** All (Production, Deploy previews, Branch deploys)

#### Variable 2: DISCORD_WEBHOOK_VISITORS
- **Key:** `DISCORD_WEBHOOK_VISITORS`
- **Value:** Paste the webhook URL from your 👥-visitors channel
- **Scopes:** All (Production, Deploy previews, Branch deploys)

5. Click **Save**

---

### Step 3: Redeploy Your Site

After adding the environment variables, you MUST redeploy:

1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Deploy site**
3. Wait 2-3 minutes for deployment to complete

---

### Step 4: Test Again

After redeployment completes, test the notifications:

**Test 1: Visitor notification** (should go to 👥-visitors channel)
```bash
curl -X POST https://tafsirkurd.com/.netlify/functions/discord-notify -H "Content-Type: application/json" -d "{\"type\":\"visitor\",\"title\":\"Test Visitor\",\"message\":\"Testing visitor channel\",\"data\":{\"city\":\"Erbil\",\"country\":\"Iraq\"}}"
```

**Test 2: Message notification** (should go to 📧-messages channel)
```bash
curl -X POST https://tafsirkurd.com/.netlify/functions/discord-notify -H "Content-Type: application/json" -d "{\"type\":\"new_message\",\"title\":\"Test Message\",\"message\":\"Testing messages channel\",\"data\":{\"userName\":\"Test User\",\"email\":\"test@test.com\"}}"
```

**Test 3: Stats notification** (should go to stats channel)
```bash
curl -X POST https://tafsirkurd.com/.netlify/functions/discord-notify -H "Content-Type: application/json" -d "{\"type\":\"new_user\",\"title\":\"Test User\",\"message\":\"Testing stats channel\",\"data\":{\"userName\":\"Test User\"}}"
```

---

## Verification Checklist

After following these steps, verify:

- [ ] Created webhook in 📧-messages channel
- [ ] Created webhook in 👥-visitors channel
- [ ] Added DISCORD_WEBHOOK_MESSAGES to Netlify environment variables
- [ ] Added DISCORD_WEBHOOK_VISITORS to Netlify environment variables
- [ ] Redeployed site in Netlify
- [ ] Tested all 3 notification types
- [ ] Each notification goes to its correct channel:
  - Visitors → 👥-visitors channel
  - Messages → 📧-messages channel
  - User signups/completions/milestones → stats channel

---

## Quick Check: Current Environment Variables

Your Netlify should have **3 webhook variables**:

1. ✅ `DISCORD_WEBHOOK_URL` (stats channel) - Already set
2. ❓ `DISCORD_WEBHOOK_MESSAGES` (messages channel) - **MISSING - ADD THIS**
3. ❓ `DISCORD_WEBHOOK_VISITORS` (visitors channel) - **MISSING - ADD THIS**

Once all 3 are set and you redeploy, the channel separation will work!
