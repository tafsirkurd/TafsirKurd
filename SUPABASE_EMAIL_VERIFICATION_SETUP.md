# Supabase Email Verification Setup Guide

## Overview
This guide explains how to configure Supabase to require email verification before users can sign in to TafsirKurd.

## Configuration Steps

### 1. Enable Email Confirmation

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `gijupzejtbpifjzwadee`
3. Navigate to **Authentication** → **Settings**
4. Under **Auth Settings**, find **"Enable email confirmations"**
5. **Enable** this setting
6. Click **Save**

### 2. Configure Email Templates

1. In the same **Authentication** → **Settings** page
2. Scroll to **Email Templates**
3. Click on **"Confirm signup"** template
4. Customize the email template:

```html
<h2>ب خێر بێی بۆ تەفسیر کورد!</h2>

<p>سلاڤ {{ .Name }},</p>

<p>سوپاس بۆ تۆمارکرنا خوە لە تەفسیر کورد. تکایە ئیمەیلەکەی خۆت پشتڕاست بکە بە کرتەکردن لەسەر لینکی خوارەوە:</p>

<p><a href="{{ .ConfirmationURL }}">پشتڕاستکردنەوەی ئیمەیل</a></p>

<p>ئەگەر تۆ ئەم هەژمارەت دروست نەکردووە، تکایە ئەم ئیمەیلە پشتگوێ بخە.</p>

<p>سوپاس,<br>تیمی تەفسیر کورد</p>
```

5. Click **Save**

### 3. Configure Redirect URLs

1. In **Authentication** → **URL Configuration**
2. Add the following to **Redirect URLs**:
   - `https://tafsirkurd.com/quran.html`
   - `https://www.tafsirkurd.com/quran.html`
   - `http://localhost:8000/quran.html` (for local development)
   - `http://localhost:8888/quran.html` (for Netlify dev)

3. Click **Save**

### 4. Configure Site URL

1. In the same **URL Configuration** section
2. Set **Site URL** to: `https://tafsirkurd.com`
3. Click **Save**

### 5. Password Reset Template (Optional)

1. Click on **"Reset password"** template
2. Customize:

```html
<h2>گۆڕینی پاسوۆرد</h2>

<p>سلاڤ,</p>

<p>داوای گۆڕینی پاسوۆردت کردووە بۆ هەژماری تەفسیر کوردەکەت.</p>

<p>بۆ گۆڕینی پاسوۆردەکەت، تکایە کرتە بکە لەسەر لینکی خوارەوە:</p>

<p><a href="{{ .ConfirmationURL }}">گۆڕینی پاسوۆرد</a></p>

<p>ئەگەر تۆ ئەم داواکارییەت نەکردووە، تکایە ئەم ئیمەیلە پشتگوێ بخە.</p>

<p>سوپاس,<br>تیمی تەفسیر کورد</p>
```

3. Click **Save**

## How It Works

### User Sign Up Flow

1. **User enters details** → Name, Email, Password
2. **System creates unverified user** → User exists in database but cannot sign in
3. **Email sent** → Verification email with confirmation link
4. **User clicks link** → Email is verified
5. **User can now sign in** → Authentication succeeds

### Important Notes

- ✅ Users **cannot sign in** until they verify their email
- ✅ The `data.session` will be `null` on signup (no automatic login)
- ✅ After verification, users can sign in normally
- ✅ Verification links expire after 24 hours (configurable)
- ✅ Users can request a new verification email

### Testing Email Verification

1. **Local Development:**
   - Supabase sends real emails even in development
   - Check your inbox for verification emails
   - Click the verification link
   - Try signing in with the verified email

2. **Check Verification Status:**
   - Go to Supabase Dashboard → Authentication → Users
   - Look at the **Email Verified** column
   - Should show ✅ after verification

### Security Features

1. **No hardcoded credentials** - All secrets fetched from environment variables
2. **Secure endpoint** - Auth config served via Netlify function
3. **CORS protection** - Only allowed origins can access auth config
4. **Email verification required** - Users must verify before signing in
5. **Rate limiting** - Supabase has built-in rate limiting for auth endpoints

## Environment Variables

Ensure these are set in Netlify:

```bash
SUPABASE_URL=https://gijupzejtbpifjzwadee.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting

### Email not received
- Check spam folder
- Verify email service is configured in Supabase
- Check Supabase logs in Dashboard → Logs

### Verification link doesn't work
- Check redirect URLs are configured correctly
- Ensure Site URL matches your domain
- Check browser console for errors

### User can't sign in after verification
- Verify the user's email is confirmed in Supabase Dashboard
- Check for any error messages in browser console
- Ensure password is correct (case-sensitive)

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Auth Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
