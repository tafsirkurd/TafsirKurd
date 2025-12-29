# AWS S3 Video Upload & Management System
## Complete Implementation Guide for TafsirKurd Admin Panel

---

## 📋 Table of Contents
1. [AWS S3 Setup](#aws-s3-setup)
2. [Database Setup](#database-setup)
3. [Admin Panel Integration](#admin-panel-integration)
4. [Features](#features)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 AWS S3 Setup

### Step 1: Create S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com)
2. Click **"Create bucket"**
3. Configure:
   - **Bucket name**: `tafsirkurd-videos` (or your choice)
   - **Region**: `eu-north-1` (Stockholm) - closest to Kurdistan
   - **Block Public Access**: Uncheck "Block all public access" (if you want public videos)
   - Click **Create bucket**

### Step 2: Configure CORS

1. Go to your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and paste:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://tafsirkurd.com", "http://localhost:*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

### Step 3: Create IAM User for Upload

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Add users**
3. Username: `tafsirkurd-video-uploader`
4. Select **Programmatic access**
5. Attach policy:
   - Click **Attach existing policies directly**
   - Search and select **AmazonS3FullAccess** (or create custom policy below)
6. Click **Next** → **Create user**
7. **SAVE THE CREDENTIALS!**
   - Access Key ID: `AKIA...`
   - Secret Access Key: `wJalr...`

#### Custom IAM Policy (Recommended):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::tafsirkurd-videos",
                "arn:aws:s3:::tafsirkurd-videos/*"
            ]
        }
    ]
}
```

### Step 4: Optional - CloudFront CDN (Faster Delivery)

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click **Create distribution**
3. Configure:
   - **Origin domain**: Select your S3 bucket
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Cache policy**: CachingOptimized
4. Click **Create distribution**
5. Note the **Distribution domain name**: `d123456abcdef.cloudfront.net`

---

## 💾 Database Setup

### Step 1: Run Database Migration

Go to **Supabase Dashboard** → **SQL Editor** → Run:

```bash
# File: supabase-migrations/create-tv-videos-table.sql
```

This creates:
- ✅ `tv_videos` table - stores video metadata
- ✅ `tv_video_series` table - organize videos into series
- ✅ RLS policies - public can view published videos
- ✅ Triggers - auto-update timestamps

### Step 2: Verify Tables Created

Run this query to verify:

```sql
SELECT * FROM tv_videos LIMIT 1;
SELECT * FROM tv_video_series LIMIT 1;
```

---

## 🎨 Admin Panel Integration

### Step 1: Add AWS SDK to admin.html

Add this in the `<head>` section of `admin.html`:

```html
<!-- AWS SDK for JavaScript v2 -->
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1519.0.min.js"></script>
```

### Step 2: Add Video Management HTML

In `admin.html`, find the **Videos Section** (`id="videosSection"`) and **REPLACE** or **ADD AFTER** the existing content with the content from:

```bash
File: admin-aws-video-upload.html
```

**Location to insert:** Around line 3315-3346

### Step 3: Add JavaScript Functions

Add the JavaScript functions **before the closing `</body>` tag** in `admin.html`:

```html
<script>
    // Paste the entire content of: admin-aws-video-functions.js
</script>
```

**Or** create a separate file and include it:

```html
<script src="/utils/admin-aws-video.js"></script>
```

---

## ✨ Features

### 1. AWS S3 Configuration
- ✅ Store AWS credentials securely in localStorage
- ✅ Test connection before uploading
- ✅ Support for multiple regions

### 2. Video Upload
- ✅ Drag & drop interface
- ✅ Real-time upload progress (percentage + speed)
- ✅ Automatic S3 key generation
- ✅ File size validation
- ✅ Video format validation

### 3. Video Metadata
- ✅ Title, description, category
- ✅ Resolution (1080p, 720p, 480p, 360p)
- ✅ Publish status (draft/published)
- ✅ Featured flag
- ✅ Auto-generated slug for URLs
- ✅ View count tracking
- ✅ Upload date/time

### 4. Video Management
- ✅ Grid view with thumbnails
- ✅ Search/filter videos
- ✅ Publish/unpublish toggle
- ✅ Delete from database
- ✅ View video stats
- ✅ Responsive design

### 5. Organization
- ✅ Categories (Tafsir, Lecture, Series, Other)
- ✅ Series support (link videos together)
- ✅ Tags for searching
- ✅ Display order control

---

## 🧪 Testing

### Test 1: AWS Connection

1. Go to Admin Panel → Videos Section
2. Fill in AWS Configuration:
   - Region: `eu-north-1`
   - Bucket Name: `tafsirkurd-videos`
   - Access Key ID: `AKIA...`
   - Secret Key: `wJalr...`
3. Click **"Test Connection"**
4. Should see: ✅ Connection successful!

### Test 2: Upload Small Video

1. Click the **upload zone** or drag a video file (< 100MB for first test)
2. Enter:
   - Title: "Test Video"
   - Description: "Testing upload"
   - Category: Tafsir
3. Click **"Upload Video to AWS S3"**
4. Watch the progress bar (should show %)
5. Should see: ✅ Video uploaded successfully!

### Test 3: Verify in AWS

1. Go to AWS S3 Console
2. Open your bucket: `tafsirkurd-videos`
3. Navigate to: `videos/2024/test-video-TIMESTAMP.mp4`
4. File should be there!

### Test 4: Verify in Database

Run this query in Supabase:

```sql
SELECT * FROM tv_videos ORDER BY created_at DESC LIMIT 5;
```

Should see your uploaded video metadata.

### Test 5: View on TV Page

1. Mark video as **Published**
2. Go to `tv.html`
3. Video should appear in the list
4. Click to play

---

## 🔧 Troubleshooting

### Error: "AccessDenied"

**Problem:** IAM user doesn't have permissions

**Solution:**
1. Check IAM policy includes `s3:PutObject`
2. Verify bucket name is correct
3. Check CORS configuration

### Error: "InvalidAccessKeyId"

**Problem:** Wrong AWS credentials

**Solution:**
1. Double-check Access Key ID
2. Make sure Secret Key is correct
3. Regenerate credentials if needed

### Error: "Failed to fetch"

**Problem:** CORS not configured

**Solution:**
1. Add CORS policy to S3 bucket (see Step 2 above)
2. Allow your domain in AllowedOrigins
3. Clear browser cache

### Upload Stuck at 0%

**Problem:** Large file or slow connection

**Solutions:**
1. Try smaller file first (< 100MB)
2. Check internet connection
3. Try different video format
4. Check browser console for errors

### Video Doesn't Play

**Problem:** Wrong video format or permissions

**Solutions:**
1. Convert to MP4 (H.264 codec)
2. Check S3 bucket permissions (public-read)
3. Use CloudFront URL instead of direct S3 URL

---

## 📊 Video Statistics

The system tracks:
- **View count**: Incremented when video is played
- **Upload date**: When video was uploaded
- **File size**: Size in bytes
- **Duration**: Video length (can be extracted)
- **Format**: Video MIME type

---

## 🎯 Best Practices

### 1. Video Formats
- **Recommended**: MP4 (H.264 video, AAC audio)
- **Also supported**: WebM, MOV
- **Max size**: 5GB per file
- **Resolution**: 1080p recommended, 720p minimum

### 2. Naming Convention
- Use descriptive titles
- System auto-generates clean URLs
- Example: "سوورەتی یاسین تەفسیر" → `videos/2024/swrty-yasin-tafsir-1234567890.mp4`

### 3. Organization
- Use categories to group videos
- Create series for multi-part content
- Add tags for better searchability

### 4. Security
- **Never commit AWS credentials to Git!**
- Use environment variables in production
- Rotate credentials regularly
- Use IAM policies (not full S3 access)

### 5. Performance
- Enable CloudFront for faster delivery
- Compress videos before upload
- Use appropriate resolution (don't upload 4K if not needed)

---

## 🔐 Security Notes

### Storing AWS Credentials

**Current implementation** (localStorage) is for **DEVELOPMENT ONLY**.

**For production**, use one of these:

#### Option 1: Netlify Functions (Recommended)

```javascript
// netlify/functions/get-aws-upload-url.js
exports.handler = async (event) => {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    // Generate presigned POST URL
    const params = {
        Bucket: 'tafsirkurd-videos',
        Fields: { key: `videos/${Date.now()}.mp4` },
        Expires: 3600
    };

    const presignedPost = s3.createPresignedPost(params);

    return {
        statusCode: 200,
        body: JSON.stringify(presignedPost)
    };
};
```

#### Option 2: Supabase Edge Functions

Store credentials in Supabase secrets and use Edge Functions to handle uploads.

---

## 📁 File Structure

```
TafsirKurd/
├── src/
│   ├── admin.html (modified - add AWS video section)
│   └── tv.html (will fetch videos from database)
│
├── supabase-migrations/
│   └── create-tv-videos-table.sql ✅
│
├── admin-aws-video-upload.html ✅ (HTML to add to admin.html)
├── admin-aws-video-functions.js ✅ (JavaScript functions)
└── AWS-S3-VIDEO-UPLOAD-GUIDE.md ✅ (this file)
```

---

## 🚀 Next Steps

1. ✅ Run database migration (create-tv-videos-table.sql)
2. ✅ Add AWS SDK to admin.html
3. ✅ Add upload UI (admin-aws-video-upload.html)
4. ✅ Add JavaScript functions (admin-aws-video-functions.js)
5. ⏳ Configure AWS S3 in admin panel
6. ⏳ Test upload with small video
7. ⏳ Update tv.html to fetch and display videos from database

---

## 💡 Tips

- Start with **small videos** for testing (< 100MB)
- Use **MP4 format** for best compatibility
- **Compress** large videos before upload
- Enable **CloudFront** for faster delivery worldwide
- Create **thumbnails** for better preview (future enhancement)
- Add **video duration** extraction (future enhancement)

---

**Status:** ✅ Ready for implementation
**Last Updated:** $(date +%Y-%m-%d)
