# ⚡ Quick Start: Migrate to Cloudflare Pages (10 Minutes)

## What You'll Save:
- **$19/month** = **$228/year**
- Get **unlimited builds, bandwidth, and functions**
- **Faster** website performance worldwide

---

## 🚀 Steps (10 minutes total)

### 1️⃣ Sign Up for Cloudflare (2 min)

Go to: **https://dash.cloudflare.com/sign-up**

- Enter email & password
- Verify email
- Done!

---

### 2️⃣ Deploy Your Site (3 min)

1. Go to: **https://dash.cloudflare.com**
2. Click **Workers & Pages** (left sidebar)
3. Click **Create application**
4. Click **Pages** tab
5. Click **Connect to Git**
6. Click **GitHub**
7. Select repository: **TafsirKurd**
8. Click **Begin setup**
9. Configure:
   - **Project name**: `tafsirkurd`
   - **Production branch**: `main`
   - **Build output directory**: `src`
   - Leave everything else empty
10. Click **Save and Deploy**

✅ **Wait 2-3 minutes** - Your site will be live at `tafsirkurd.pages.dev`

---

### 3️⃣ Add Environment Variables (3 min)

After deployment:

1. Go to **Settings** → **Environment variables**
2. Click **Add variable** for each:

```
SUPABASE_URL = https://nvwgepkhzobgwnzibpvq.supabase.co
SUPABASE_ANON_KEY = [from Supabase dashboard]
SUPABASE_SERVICE_ROLE_KEY = [from Supabase dashboard]
BREVO_API_KEY = [your Brevo key]
DISCORD_WEBHOOK_URL = [your webhook]
ADMIN_PASSWORD_HASH = [your admin hash]
CLOUDFLARE_TURNSTILE_SECRET = [from Turnstile]
```

3. Click **Save and Deploy** again

---

### 4️⃣ Migrate Functions (2 min)

Run this command in your project:

```bash
node migrate-functions-to-cloudflare.js
```

This automatically converts all 29 Netlify functions to Cloudflare format!

Then:
```bash
git add functions/
git commit -m "Add Cloudflare Pages functions"
git push
```

✅ Functions are now live!

---

### 5️⃣ Test Everything (Optional but recommended)

Visit: `https://tafsirkurd.pages.dev`

Test:
- Homepage
- Login/Signup
- Quran.html
- TV.html
- Admin panel

---

### 6️⃣ Add Custom Domain (Optional - 5 min)

In Cloudflare Pages:

1. Go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `tafsirkurd.com`
4. Follow the DNS instructions shown

---

### 7️⃣ Cancel Netlify (After testing! - 1 min)

**ONLY after Cloudflare works:**

1. Go to Netlify Dashboard
2. **Team settings** → **Billing**
3. **Change plan** → **Free** (or Cancel)
4. Confirm

💰 **You just saved $228/year!**

---

## 🎉 You're Done!

Your site is now on Cloudflare Pages with:
- ✅ Unlimited builds
- ✅ Unlimited bandwidth
- ✅ Faster performance
- ✅ $0/month forever

---

## Need Help?

Just ask me if you get stuck on any step!
