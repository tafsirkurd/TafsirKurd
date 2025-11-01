# 🔐 Google OAuth Setup Guide - Fix "redirect_uri_mismatch" Error

## ❌ The Problem

Users see this error when trying to sign in with Google:
```
Access blocked: TafsirKurd Gmail Login's request is invalid
Error 400: redirect_uri_mismatch
```

This happens because your Google Cloud Console OAuth app doesn't have all the correct URIs configured.

## ✅ The Solution

Follow these steps to fix the Google OAuth configuration:

---

## Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (or create one if you haven't)
3. Make sure you're logged in with the Google account that owns the OAuth app

---

## Step 2: Navigate to OAuth Consent Screen

1. In the left sidebar, click **APIs & Services** → **OAuth consent screen**
2. Verify your app information:
   - **App name**: Tafsir Kurd (or TafsirKurd Gmail Login)
   - **User support email**: Your email
   - **Developer contact**: Your email

3. **Authorized domains** - Add these domains:
   ```
   tafsirkurd.com
   tafsirkurd.netlify.app
   ```

4. Click **Save and Continue**

---

## Step 3: Configure OAuth 2.0 Credentials

1. In the left sidebar, click **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID (the one starting with `510335424343-...`)
3. Click the **Edit** icon (pencil) next to it

---

## Step 4: Add Authorized JavaScript Origins

In the **Authorized JavaScript origins** section, add ALL of these URIs:

```
https://tafsirkurd.com
https://www.tafsirkurd.com
https://tafsirkurd.netlify.app
https://69068eab26707c60e22136b7--tafsirkurd.netlify.app
http://localhost:3000
http://localhost:5500
http://localhost:8000
http://localhost:8080
http://127.0.0.1:5500
http://127.0.0.1:8000
```

### Why These URIs?

- `https://tafsirkurd.com` - Your main production domain
- `https://www.tafsirkurd.com` - WWW subdomain (if used)
- `https://tafsirkurd.netlify.app` - Primary Netlify domain
- `https://[deploy-id]--tafsirkurd.netlify.app` - Deploy preview URLs
- `http://localhost:*` - Local development testing
- `http://127.0.0.1:*` - Alternative local development

---

## Step 5: Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, add ALL of these URIs:

```
https://tafsirkurd.com
https://tafsirkurd.com/login
https://tafsirkurd.com/complete-signup
https://tafsirkurd.com/onboarding
https://www.tafsirkurd.com
https://www.tafsirkurd.com/login
https://tafsirkurd.netlify.app
https://tafsirkurd.netlify.app/login
https://tafsirkurd.netlify.app/complete-signup
http://localhost:3000
http://localhost:3000/login
http://localhost:5500
http://localhost:5500/login.html
http://localhost:5500/login
http://localhost:8000/login
http://127.0.0.1:5500/login.html
http://127.0.0.1:5500/login
```

---

## Step 6: Save Changes

1. Click **Save** at the bottom
2. Wait 5-10 minutes for changes to propagate (Google's servers need time to update)

---

## Step 7: Test the Login

After waiting 5-10 minutes:

1. Open an incognito/private window
2. Go to: https://tafsirkurd.com/login
3. Click "Sign in with Google"
4. It should work now! ✅

---

## 🔍 Quick Checklist

Use this checklist to verify your setup:

- [ ] Google Cloud Console project exists
- [ ] OAuth consent screen configured
- [ ] Authorized domains include `tafsirkurd.com` and `tafsirkurd.netlify.app`
- [ ] OAuth 2.0 Client ID created
- [ ] Client ID matches in login.html: `510335424343-i42ua2q2718pg230e0kbrgha8edtmb14.apps.googleusercontent.com`
- [ ] All authorized JavaScript origins added
- [ ] All authorized redirect URIs added
- [ ] Changes saved
- [ ] Waited 5-10 minutes
- [ ] Tested in incognito mode

---

## 🐛 Still Having Issues?

### Issue: "redirect_uri_mismatch" still appears

**Solution**:
1. Check the error message carefully - it will tell you which URI is mismatched
2. Copy that exact URI and add it to the authorized redirect URIs
3. Save and wait 5-10 minutes

### Issue: "Access blocked" with different error

**Solution**:
1. Make sure your app is not in "Testing" mode (or add test users)
2. Go to OAuth consent screen → Publishing status
3. Click "Publish App" to make it public

### Issue: Works locally but not in production

**Solution**:
1. Double-check that `https://tafsirkurd.com` is in BOTH:
   - Authorized JavaScript origins
   - Authorized redirect URIs
2. Clear browser cache and cookies
3. Try incognito mode

---

## 📋 Current Configuration

Your current Google OAuth Client ID is:
```
510335424343-i42ua2q2718pg230e0kbrgha8edtmb14.apps.googleusercontent.com
```

**Location in code**: `src/login.html` line 749

---

## 🔄 If You Need to Create a New OAuth Client

If you need to start fresh:

1. **Go to Google Cloud Console** → APIs & Services → Credentials
2. **Click** "+ CREATE CREDENTIALS" → "OAuth client ID"
3. **Application type**: Web application
4. **Name**: Tafsir Kurd Login
5. **Authorized JavaScript origins**: Add all URIs from Step 4 above
6. **Authorized redirect URIs**: Add all URIs from Step 5 above
7. **Click** "Create"
8. **Copy** the Client ID
9. **Update** `src/login.html` line 749 with the new Client ID
10. **Update** `src/onboarding.html` and any other files using Google Sign-In

---

## 🎯 Best Practices

1. **Keep Client ID Secret-ish**: While the client ID isn't super sensitive, don't commit client secrets to Git
2. **Use Environment Variables**: Consider moving the client ID to environment variables for easier management
3. **Regular Testing**: Test Google Sign-In after any domain changes
4. **Monitor Console**: Check Google Cloud Console for any warnings or errors
5. **Add Backup Auth**: Always have email/password login as a backup

---

## 📞 Need Help?

If you're still stuck:

1. Check the browser console for detailed error messages
2. Check Network tab in DevTools to see the exact OAuth request
3. Copy the exact error message and search Google
4. Contact Google Cloud Support if the issue persists

---

**Last Updated**: 2025-01-02
**Status**: Configuration guide ready ✅

---

## Quick Reference: What Goes Where

### Authorized JavaScript Origins
These are the domains where your app runs:
```
https://tafsirkurd.com
https://tafsirkurd.netlify.app
http://localhost:5500
```

### Authorized Redirect URIs
These are the specific pages Google redirects to after login:
```
https://tafsirkurd.com/login
https://tafsirkurd.netlify.app/login
http://localhost:5500/login
```

**Remember**: After adding any new URI, wait 5-10 minutes before testing!
