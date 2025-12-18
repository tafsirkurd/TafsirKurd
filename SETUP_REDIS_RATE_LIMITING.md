# Setup Redis-Based Rate Limiting

**Date:** December 18, 2025
**Status:** OPTIONAL but RECOMMENDED for production

---

## Why Redis Rate Limiting?

Your site now uses **Redis-based rate limiting** powered by Upstash, which solves the critical serverless issue where in-memory rate limiting doesn't work across multiple function instances.

**Before (CRITICAL ISSUE):**
- ❌ In-memory Map resets on each new serverless instance
- ❌ No actual rate limit protection in production
- ❌ Vulnerable to DDoS and brute force attacks

**After (SECURE):**
- ✅ Redis persists rate limit data across all instances
- ✅ True rate limiting protection
- ✅ Automatic key expiry (no manual cleanup needed)
- ✅ Fallback to in-memory for local development

---

## Current Status

Rate limiting **works locally** using in-memory fallback, but for **production security**, you should set up Upstash Redis (free tier available).

---

## Setup Instructions

### Step 1: Create Free Upstash Redis Database

1. Go to: https://upstash.com
2. Click "Sign Up" (free account)
3. Click "Create Database"
4. Settings:
   - **Name:** tafsirkurd-ratelimit
   - **Type:** Regional (faster, free tier)
   - **Region:** Choose closest to your users (e.g., EU-West-1 or US-East-1)
   - **Eviction:** Enable (automatically remove old keys)
5. Click "Create"

### Step 2: Get Redis Credentials

After creating the database:

1. You'll see your database dashboard
2. Scroll down to **REST API** section
3. Copy these two values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

Example:
```
UPSTASH_REDIS_REST_URL=https://us1-xxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Add to Netlify Environment Variables

1. Go to Netlify Dashboard: https://app.netlify.com
2. Select your **tafsirkurd** site
3. Go to **Site settings** → **Environment variables**
4. Add two new variables:

**Variable 1:**
- Name: `UPSTASH_REDIS_REST_URL`
- Value: `https://us1-xxxxx.upstash.io` (your actual URL)

**Variable 2:**
- Name: `UPSTASH_REDIS_REST_TOKEN`
- Value: `AXXXXxxxxx...` (your actual token)

5. Click **Save**

### Step 4: Redeploy Your Site

1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete

---

## How It Works

The code automatically detects Redis credentials:

**With Redis (Production):**
```javascript
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Use Redis for rate limiting ✅
    redis = new Redis({ url, token });
}
```

**Without Redis (Development):**
```javascript
// Falls back to in-memory Map (local dev only)
const rateLimitStore = new Map();
```

---

## Testing Rate Limiting

### Test 1: Normal Request (Should Pass)
```bash
curl https://tafsirkurd.com/.netlify/functions/config
```
Expected: `200 OK` with Supabase configuration

### Test 2: Rapid Requests (Should Block)
```bash
for i in {1..60}; do
  curl -s https://tafsirkurd.com/.netlify/functions/config
done
```
Expected: First 50 succeed, then `429 Too Many Requests`

### Test 3: Check Redis (After Setup)
1. Go to Upstash dashboard
2. Click your database
3. Click "Data Browser"
4. You should see keys like: `ratelimit:123.456.789.10`

---

## Rate Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/config` | 50 requests | per minute |
| `/analytics` | 30 requests | per minute |
| `/auth` | 20 requests | per minute |
| Other endpoints | 100 requests | per minute |

---

## Free Tier Limits (Upstash)

Upstash free tier includes:
- ✅ 10,000 commands per day
- ✅ 256 MB storage
- ✅ Max 1000 concurrent connections
- ✅ No credit card required

This is **more than enough** for TafsirKurd's traffic.

---

## Monitoring

View rate limit activity in:
1. **Netlify Function Logs:** https://app.netlify.com/projects/tafsirkurd/logs/functions
2. **Upstash Dashboard:** https://console.upstash.com
3. **Redis Data Browser:** See live rate limit keys

---

## What Happens Without Redis?

Without Redis setup, your site will:
- ✅ Still work normally
- ✅ Use in-memory fallback for local testing
- ⚠️ Have less effective rate limiting in production
- ⚠️ Be more vulnerable to abuse/attacks

**Recommendation:** Set up Redis for production security (takes 5 minutes).

---

## Troubleshooting

### Issue: Rate limiting not working
**Check:**
1. Environment variables are set in Netlify
2. Site has been redeployed after adding variables
3. No typos in environment variable names

### Issue: Redis connection errors
**Check:**
1. Upstash database is active
2. REST API credentials are correct
3. No firewall blocking Upstash domain

### Issue: Too many requests blocked
**Solution:**
Increase rate limits in `netlify/functions/utils/security.js`:
```javascript
if (await checkRateLimit(clientIP, 100, 60000)) { // Increase from 50 to 100
```

---

## Summary Checklist

- [ ] Created Upstash Redis database
- [ ] Copied REST URL and token
- [ ] Added `UPSTASH_REDIS_REST_URL` to Netlify
- [ ] Added `UPSTASH_REDIS_REST_TOKEN` to Netlify
- [ ] Redeployed site
- [ ] Tested rate limiting
- [ ] Verified Redis keys in Upstash dashboard

---

**After completing this setup, your rate limiting will be 100% production-ready!** 🚀
