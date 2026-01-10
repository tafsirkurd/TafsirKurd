# Google Analytics API Setup Guide

## Step 1: Enable Google Analytics Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
2. Select your project
3. Click **"ENABLE"** button
4. Wait for confirmation

## Step 2: Create Service Account

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"+ CREATE SERVICE ACCOUNT"**
3. Enter details:
   - **Name:** `tafsirkurd-analytics`
   - **Description:** `Service account for TafsirKurd Google Analytics access`
4. Click **"CREATE AND CONTINUE"**
5. **Grant Role:** Select **"Viewer"** role
6. Click **"CONTINUE"** then **"DONE"**

## Step 3: Create and Download JSON Key

1. Find your new service account in the list
2. Click on the service account name
3. Go to **"KEYS"** tab
4. Click **"ADD KEY"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"CREATE"**
7. Save the downloaded JSON file securely (never commit this to git!)

The JSON file will look like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "tafsirkurd-analytics@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## Step 4: Get Your GA4 Property ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon at bottom left)
3. In the **Property** column, click **Property Settings**
4. Look for **"PROPERTY ID"** - it will be a number like `123456789`
5. Copy this number - you'll need it

## Step 5: Grant Service Account Access to GA4

1. Still in Google Analytics Admin
2. Go to **Property Access Management** (in Property column)
3. Click **"+"** (Add users)
4. Paste the **client_email** from your JSON file (e.g., `tafsirkurd-analytics@your-project.iam.gserviceaccount.com`)
5. Select role: **"Viewer"**
6. Uncheck **"Notify new users by email"**
7. Click **"Add"**

## Step 6: Add Credentials to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select **Workers & Pages**
3. Click on your **tafsirkurd** project
4. Go to **Settings** → **Environment variables**
5. Add these variables:

### Variable 1: GA_PROPERTY_ID
- **Name:** `GA_PROPERTY_ID`
- **Value:** Your GA4 Property ID (e.g., `123456789`)
- **Environment:** Both Production and Preview

### Variable 2: GA_SERVICE_ACCOUNT_EMAIL
- **Name:** `GA_SERVICE_ACCOUNT_EMAIL`
- **Value:** The `client_email` from your JSON
- **Environment:** Both Production and Preview

### Variable 3: GA_PRIVATE_KEY
- **Name:** `GA_PRIVATE_KEY`
- **Value:** The entire `private_key` value from your JSON (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
- **Environment:** Both Production and Preview

⚠️ **Important:** Make sure to copy the private key exactly as it appears in the JSON, including the `\n` characters or line breaks!

## Step 7: Deploy

Once you've added all environment variables, the analytics function will automatically fetch REAL data from Google Analytics!

## Verification

1. Open your admin panel at https://tafsirkurd.com/admin.html
2. Go to Analytics section
3. The data should now show real metrics from Google Analytics
4. Check browser console for any errors

## Troubleshooting

### Error: "PERMISSION_DENIED"
- Make sure you granted the service account Viewer access to your GA4 property
- Wait 5-10 minutes for permissions to propagate

### Error: "INVALID_ARGUMENT"
- Check that your Property ID is correct
- Make sure you're using GA4 (not Universal Analytics)

### No data showing
- Check Cloudflare Pages deployment logs
- Verify environment variables are set correctly
- Make sure private key includes all line breaks

## Security Notes

- ✅ Never commit the JSON credentials file to Git
- ✅ Store credentials only in Cloudflare environment variables
- ✅ Service account has read-only access
- ✅ Credentials are encrypted by Cloudflare
