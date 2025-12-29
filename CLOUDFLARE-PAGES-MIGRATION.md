# 🚀 Migrate from Netlify to Cloudflare Pages

## Why Cloudflare Pages?

✅ **100% FREE** - No credit card needed, unlimited bandwidth
✅ **Faster** - Better global CDN network
✅ **Unlimited builds** - No build minute limits
✅ **Better performance** - Faster than Netlify worldwide
✅ **Save $19/month** - Free forever vs Netlify Pro ($228/year savings)

---

## 📋 Migration Steps

### Step 1: Create Cloudflare Account (2 minutes)

1. Go to https://dash.cloudflare.com/sign-up
2. **Sign up** with your email
3. **Verify email** (check inbox)
4. Done!

---

### Step 2: Deploy to Cloudflare Pages (5 minutes)

1. **Go to Cloudflare Dashboard**: https://dash.cloudflare.com
2. Click **Workers & Pages** in left sidebar
3. Click **Create application** button
4. Click **Pages** tab
5. Click **Connect to Git**

#### GitHub Connection:

6. Click **GitHub** button
7. **Authorize Cloudflare Pages** (if asked)
8. **Select your repository**: `TafsirKurd` (or your GitHub username/TafsirKurd)
9. Click **Begin setup**

#### Build Configuration:

10. **Project name**: `tafsirkurd` (or any name you want)
11. **Production branch**: `main`
12. **Build settings**:
    - **Framework preset**: None
    - **Build command**: (leave empty - we have static HTML)
    - **Build output directory**: `src`
13. Click **Save and Deploy**

✅ **Your site will be live in 2-3 minutes at**: `tafsirkurd.pages.dev`

---

### Step 3: Add Environment Variables (5 minutes)

After deployment completes:

1. Go to **Settings** tab in your Cloudflare Pages project
2. Click **Environment variables** in left menu
3. Click **Add variable** for each of these:

#### Required Environment Variables:

**Supabase:**
```
SUPABASE_URL = https://nvwgepkhzobgwnzibpvq.supabase.co
SUPABASE_ANON_KEY = (get from Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY = (get from Supabase dashboard - DO NOT share!)
```

**Brevo (Email Service):**
```
BREVO_API_KEY = (your Brevo API key)
```

**Discord Webhooks:**
```
DISCORD_WEBHOOK_URL = (your Discord webhook URL)
DISCORD_WEBHOOK_STATS = (your stats webhook URL)
DISCORD_WEBHOOK_ZCEER = (your zceer webhook URL)
```

**Admin:**
```
ADMIN_PASSWORD_HASH = (your admin password hash)
CLOUDFLARE_TURNSTILE_SECRET = (get from Cloudflare Turnstile)
```

**IP Geolocation:**
```
IPGEOLOCATION_API_KEY = (your key if you have one)
```

**Google Search Console:**
```
GOOGLE_CLIENT_EMAIL = (from Google service account)
GOOGLE_PRIVATE_KEY = (from Google service account)
GOOGLE_PROPERTY_URL = https://tafsirkurd.com/
```

4. Click **Save** after adding each variable
5. **Deploy again** to apply variables

---

### Step 4: Migrate Netlify Functions to Cloudflare (10 minutes)

Cloudflare Pages Functions work almost the same as Netlify Functions!

#### Quick Migration:

1. Create `functions` folder in your project root (next to `src`)
2. Copy files from `netlify/functions/` to `functions/`
3. Update each function file:

**FROM (Netlify):**
```javascript
exports.handler = async (event, context) => {
    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Hello' })
    };
};
```

**TO (Cloudflare):**
```javascript
export async function onRequest(context) {
    return new Response(JSON.stringify({ message: 'Hello' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
}
```

#### Auto-Migration Script (I'll create this for you):

I can automatically convert all your Netlify functions to Cloudflare format. Just let me know!

**Your functions:**
- admin-auth.js
- config.js
- send-otp.js
- verify-otp.js
- discord-notify.js
- instagram-feed.js
- And 23 more...

---

### Step 5: Add Custom Domain (5 minutes)

#### Option A: Transfer Domain to Cloudflare (Recommended - FREE domain privacy)

1. In Cloudflare Dashboard, go to **Domain Registration**
2. Click **Transfer Domain**
3. Enter `tafsirkurd.com`
4. Follow transfer steps (takes 5-7 days, but domain stays live)

#### Option B: Keep Domain at Current Registrar (Add DNS)

1. In Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter `tafsirkurd.com`
4. Cloudflare will show you DNS records to add:
   ```
   CNAME @ tafsirkurd.pages.dev
   ```
5. Go to your domain registrar (where you bought the domain)
6. Add the CNAME record
7. Wait 5-10 minutes for DNS to propagate
8. ✅ Done! Your site is live at https://tafsirkurd.com

---

### Step 6: Test Everything (10 minutes)

1. Visit `https://tafsirkurd.pages.dev`
2. Test these pages:
   - Homepage (index.html)
   - Quran.html
   - TV.html
   - Login/Signup
   - Admin panel
3. Test functions:
   - Login (uses `auth.js` function)
   - Send OTP
   - Admin authentication
4. Check browser console for errors

---

### Step 7: Cancel Netlify Subscription (2 minutes)

**ONLY do this AFTER confirming Cloudflare works!**

1. Go to Netlify Dashboard
2. Click **Team settings** → **Billing**
3. Click **Change plan**
4. Select **Free** (or **Cancel subscription**)
5. Confirm cancellation
6. ✅ Save $19/month!

**Optional:** Delete the Netlify site to avoid confusion

---

## 📊 Comparison: Netlify vs Cloudflare Pages

| Feature | Netlify Free | Netlify Pro | Cloudflare Pages |
|---------|--------------|-------------|------------------|
| **Price** | $0 | $19/month | **$0 (forever)** |
| **Build minutes** | 300/month | 25,000/month | **Unlimited** |
| **Bandwidth** | 100GB/month | 1TB/month | **Unlimited** |
| **Functions** | 125k requests | 2M requests | **Unlimited** |
| **Build time** | ~2-3 min | ~2-3 min | **~1-2 min** |
| **CDN speed** | Good | Good | **Better (global)** |
| **Custom domain** | ✅ | ✅ | ✅ |
| **SSL** | ✅ | ✅ | ✅ |
| **Deploy previews** | ✅ | ✅ | ✅ |

---

## 🎯 Quick Start Commands

### Check Netlify Functions:
```bash
ls netlify/functions/
```

### Create Cloudflare Functions folder:
```bash
mkdir functions
```

### Push to GitHub (triggers Cloudflare deployment):
```bash
git add .
git commit -m "Migrate to Cloudflare Pages"
git push
```

---

## 🔧 Troubleshooting

### Issue: "Build failed"
**Solution:** Make sure **Build output directory** is set to `src` in Cloudflare Pages settings

### Issue: "Functions not working"
**Solution:**
1. Check environment variables are set correctly
2. Make sure functions are in `functions/` folder (not `netlify/functions/`)
3. Update function syntax from Netlify to Cloudflare format

### Issue: "Custom domain not working"
**Solution:**
1. Wait 10-15 minutes for DNS propagation
2. Check CNAME record is pointing to `tafsirkurd.pages.dev`
3. Make sure there's no conflicting A record

---

## 📞 Need Help?

If you get stuck at any step, just ask me and I'll help you through it!

---

## ✅ Migration Checklist

- [ ] Create Cloudflare account
- [ ] Deploy site to Cloudflare Pages
- [ ] Add environment variables
- [ ] Migrate functions (I can do this automatically)
- [ ] Test site thoroughly
- [ ] Add custom domain
- [ ] Verify everything works
- [ ] Cancel Netlify subscription
- [ ] Delete Netlify site (optional)
- [ ] 🎉 Celebrate saving $228/year!

---

**Ready to start? Let me know which step you want to do first!**
