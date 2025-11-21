# Google Search Console API Setup Guide

This guide will help you set up Google Search Console API integration so your admin panel can display search queries, rankings, impressions, and clicks.

---

## 📋 Prerequisites

- ✅ Google Search Console verified (you already have this!)
- ✅ Google account with access to Search Console
- ⏱️ 10-15 minutes to complete setup

---

## 🚀 Step-by-Step Setup

### **Step 1: Enable Google Search Console API**

1. **Go to Google Cloud Console**:
   ```
   https://console.cloud.google.com/
   ```

2. **Create a new project** (or select existing):
   - Click "Select a project" at the top
   - Click "NEW PROJECT"
   - Name it: `Tafsir Kurd Search Console`
   - Click "CREATE"

3. **Enable Search Console API**:
   - Go to: https://console.cloud.google.com/apis/library
   - Search for: `Google Search Console API`
   - Click on it
   - Click **"ENABLE"**

---

### **Step 2: Create OAuth 2.0 Credentials**

1. **Go to Credentials page**:
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **Configure OAuth Consent Screen** (if not done):
   - Click **"OAuth consent screen"** in left menu
   - Select **"External"** (for personal use)
   - Click "CREATE"
   - Fill in:
     - App name: `Tafsir Kurd Admin`
     - User support email: Your email
     - Developer contact: Your email
   - Click "SAVE AND CONTINUE"
   - Skip "Scopes" (click "SAVE AND CONTINUE")
   - Add test users: Your email
   - Click "SAVE AND CONTINUE"

3. **Create OAuth Client ID**:
   - Click **"Credentials"** in left menu
   - Click **"+ CREATE CREDENTIALS"**
   - Select **"OAuth client ID"**
   - Application type: **"Web application"**
   - Name: `Tafsir Kurd Search Console Client`
   - **Authorized redirect URIs**: Add:
     ```
     https://tafsirkurd.com
     http://localhost:8888
     ```
   - Click **"CREATE"**

4. **Copy your credentials**:
   - You'll see a popup with:
     - **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-abcd1234...`)
   - **SAVE THESE!** You'll need them later

---

### **Step 3: Get Refresh Token**

Now we need to get a refresh token to access the API.

1. **Create a temporary HTML file** on your computer (e.g., `oauth.html`):

```html
<!DOCTYPE html>
<html>
<head>
    <title>Get Google Refresh Token</title>
</head>
<body>
    <h1>Get Google Search Console Refresh Token</h1>
    <button onclick="authorize()">1. Click to Authorize</button>
    <div id="result"></div>

    <script>
        const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; // Paste your Client ID
        const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE'; // Paste your Client Secret
        const REDIRECT_URI = 'http://localhost:8888';
        const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

        function authorize() {
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${CLIENT_ID}&` +
                `redirect_uri=${REDIRECT_URI}&` +
                `response_type=code&` +
                `scope=${SCOPE}&` +
                `access_type=offline&` +
                `prompt=consent`;

            window.location.href = authUrl;
        }

        // After authorization, you'll be redirected back with a code
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            document.getElementById('result').innerHTML = `
                <h2>Step 2: Exchange code for refresh token</h2>
                <p>Authorization code: <code>${code}</code></p>
                <p>Now run this curl command in your terminal (replace YOUR_CODE, YOUR_CLIENT_ID, YOUR_CLIENT_SECRET):</p>
                <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">
curl -X POST https://oauth2.googleapis.com/token \\
  -d "code=${code}" \\
  -d "client_id=${CLIENT_ID}" \\
  -d "client_secret=${CLIENT_SECRET}" \\
  -d "redirect_uri=${REDIRECT_URI}" \\
  -d "grant_type=authorization_code"
                </pre>
                <p>The response will include your <strong>refresh_token</strong>. Save it!</p>
            `;
        }
    </script>
</body>
</html>
```

2. **Replace the placeholders**:
   - Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID
   - Replace `YOUR_CLIENT_SECRET_HERE` with your actual Client Secret

3. **Open the file** in your browser

4. **Click "Click to Authorize"**

5. **Sign in with Google** and grant permissions

6. **Copy the curl command** shown on the page

7. **Run the curl command** in your terminal (Windows users: use Git Bash or WSL)

8. **Copy the refresh_token** from the response (looks like: `1//abc123...`)

---

### **Step 4: Add Environment Variables to Netlify**

1. **Go to Netlify Dashboard**:
   ```
   https://app.netlify.com
   ```

2. **Select your site** (tafsirkurd.com)

3. **Go to Site Configuration → Environment Variables**

4. **Add these three variables**:

   **Variable 1:**
   - Key: `GOOGLE_CLIENT_ID`
   - Value: Your Client ID from Step 2

   **Variable 2:**
   - Key: `GOOGLE_CLIENT_SECRET`
   - Value: Your Client Secret from Step 2

   **Variable 3:**
   - Key: `GOOGLE_REFRESH_TOKEN`
   - Value: Your Refresh Token from Step 3

5. **Click "Save"**

6. **Trigger a new deployment** (or wait for next deploy)

---

## ✅ Verification

After deployment, test the integration:

1. Go to your admin panel: `https://tafsirkurd.com/admin.html`

2. Click on **"SEO & Search Console"** section (new section will be added)

3. You should see:
   - Total clicks
   - Total impressions
   - Average CTR
   - Average position
   - Top search queries
   - Top performing pages

---

## 🔄 Alternative Method: Using OAuth Playground

If the HTML method above doesn't work, use Google's OAuth Playground:

1. Go to: https://developers.google.com/oauthplayground/

2. Click the gear icon (⚙️) in top right

3. Check **"Use your own OAuth credentials"**

4. Enter your **Client ID** and **Client Secret**

5. In left sidebar, find **"Google Search Console API v1"**

6. Check: `https://www.googleapis.com/auth/webmasters.readonly`

7. Click **"Authorize APIs"**

8. Sign in and grant permissions

9. Click **"Exchange authorization code for tokens"**

10. **Copy the refresh_token**

---

## 📊 What You'll See in Admin

Once configured, your admin panel will show:

### **Summary Stats:**
- **Total Clicks**: Number of clicks from Google search
- **Total Impressions**: How many times your site appeared in search
- **Average CTR**: Click-through rate percentage
- **Average Position**: Your average ranking position

### **Top Search Queries:**
- List of keywords people searched for
- Clicks and impressions for each query
- CTR and average position

### **Top Pages:**
- Your best performing pages
- Performance metrics for each page

---

## ⏱️ When Will Data Appear?

- **First 24-48 hours**: No data (normal for new sites)
- **After 3-7 days**: First impressions appear
- **After 1-2 weeks**: Search queries and clicks appear
- **After 1 month**: Full data and trends available

---

## 🔒 Security Notes

- ✅ Refresh tokens are stored as environment variables (secure)
- ✅ Never commit tokens to Git
- ✅ Tokens have read-only access (safe)
- ✅ You can revoke access anytime in Google Cloud Console

---

## 🛠️ Troubleshooting

### **"Google Search Console API not configured"**
- You haven't set up environment variables yet
- Follow Step 4 above

### **"Authentication token expired"**
- Your refresh token expired (rare)
- Repeat Step 3 to get a new refresh token

### **"No search data available yet"**
- This is NORMAL for newly verified sites
- Wait 3-7 days for data to appear
- The integration is working correctly!

### **API Error 403**
- Make sure you enabled the Search Console API in Step 1
- Check that your Google account has access to Search Console

---

## 📝 Summary

**What you need:**
1. ✅ Client ID
2. ✅ Client Secret
3. ✅ Refresh Token
4. ✅ Add all three to Netlify environment variables

**Setup time:** 10-15 minutes

**Data availability:** 3-7 days after site verification

---

**Once setup is complete, your admin panel will automatically display Search Console data!** 🎉

---

*Last Updated: 2025-11-21*
*For support, check the console in your admin panel for detailed error messages.*
