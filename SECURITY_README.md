# Security Configuration Guide

## Environment Variables Required in Netlify

To keep your site secure, the following environment variables MUST be configured in Netlify Dashboard:

### Required Environment Variables

1. **SUPABASE_URL**
   - Value: `https://gijupzejtbpifjzwadee.supabase.co`
   - Description: Your Supabase project URL

2. **SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpanVwemVqdGJwaWZqendhZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NDAyOTcsImV4cCI6MjA3MTExNjI5N30.-d33o2dDpfD6ywubBcc51srvf1VUewAJwpnd0OOo51M`
   - Description: Your Supabase anonymous/public key

3. **BREVO_API_KEY**
   - Value: [Your Brevo API key - keep private]
   - Description: API key for Brevo email service

4. **TELEGRAM_BOT_TOKEN** (if using Telegram notifications)
   - Value: [Your Telegram bot token]
   - Description: Token for Telegram bot notifications

5. **TELEGRAM_CHAT_ID** (if using Telegram notifications)
   - Value: [Your Telegram chat ID]
   - Description: Chat ID for sending Telegram notifications

## How to Set Environment Variables in Netlify

1. Go to your Netlify Dashboard
2. Select your site (TafsirKurd)
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Enter the variable name and value
6. Click **Save**
7. **Important**: Redeploy your site after adding variables

## Security Features Implemented

### ✅ API Key Protection
- All sensitive API keys moved from code to environment variables
- Frontend uses secure `/netlify/functions/config` endpoint
- No hardcoded credentials in repository

### ✅ Offline Functionality
- Service worker caches all essential resources
- Works completely offline after first visit
- Automatic cache updates on deployment

### ✅ Security Headers (in netlify.toml)
- **HSTS**: Forces HTTPS for 1 year
- **CSP**: Prevents XSS and injection attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing

### ✅ Rate Limiting
- Config endpoint limited to 50 requests/minute per IP
- Prevents abuse and DDoS attempts

### ✅ Private Repository
- Sensitive data only in Netlify environment
- Safe to keep repository private
- GitHub Actions can deploy without exposing secrets

## Files Secured

1. **admin.html** - Now uses config endpoint
2. **settings.html** - Now uses config endpoint
3. **scheduled-daily-reminders.js** - Uses env vars
4. **test-daily-reminders.js** - Uses env vars
5. **All other functions** - Already using process.env

## Performance Optimizations

1. **Service Worker v362**
   - Improved caching strategy
   - Added footer-loader.js and images
   - Faster offline experience

2. **Smart Sync**
   - Timestamp-based data synchronization
   - Prevents data loss on conflicts

3. **Security Headers**
   - Optimized for speed and security
   - Proper caching for static assets

## Notes

- Google CLIENT_ID is intentionally public (required for OAuth)
- Supabase ANON_KEY is safe to expose (RLS policies protect data)
- Never commit BREVO_API_KEY or Telegram tokens to git
