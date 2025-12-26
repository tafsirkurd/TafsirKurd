# 📹 TafsirKurd TV Upload System Guide

## Overview

Your TV page now has a **dual upload system** that supports both:
1. **Supabase Storage** - Direct file upload (up to 5GB per file)
2. **YouTube Embed** - Paste YouTube video ID for unlimited size

---

## 🎯 How It Works

### Current Features:
✅ **Tab-based interface** - Switch between Supabase Upload and YouTube Embed
✅ **Chunked uploads** - Large files split into 6MB chunks for reliability
✅ **Progress tracking** - Real-time progress bar with speed and time remaining
✅ **File validation** - Checks file type and size (max 5GB)
✅ **Metadata forms** - Title, description, series, category
✅ **YouTube preview** - Auto-preview when video ID entered
✅ **Auto URL extraction** - Paste full YouTube URL, extracts ID automatically
✅ **Demo mode** - Works without Supabase (simulates upload)

---

## 🛠️ Setup Instructions

### Step 1: Create Supabase Storage Bucket

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **Storage** → **Create a new bucket**
3. Name: `episode-videos`
4. Make it **Public** (so videos can be streamed)
5. Click **Create bucket**

### Step 2: Create Database Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create TV Episodes Table
CREATE TABLE tv_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    video_type TEXT NOT NULL CHECK (video_type IN ('supabase', 'youtube')),
    series TEXT NOT NULL,
    category TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_tv_episodes_series ON tv_episodes(series);
CREATE INDEX idx_tv_episodes_category ON tv_episodes(category);
CREATE INDEX idx_tv_episodes_created_at ON tv_episodes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE tv_episodes ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public can view episodes"
    ON tv_episodes FOR SELECT
    TO public
    USING (true);

-- Allow authenticated users to insert (admin only)
CREATE POLICY "Authenticated users can insert episodes"
    ON tv_episodes FOR INSERT
    TO authenticated
    WITH CHECK (true);
```

### Step 3: Add Supabase Client to Your TV Page

Add this script **BEFORE** `<script src="/tv-player.js"></script>` in `tv.html`:

```html
<!-- Supabase Client Library -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Initialize Supabase -->
<script>
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
</script>

<!-- Your TV Player Script -->
<script src="/tv-player.js"></script>
```

**Replace with your actual credentials:**
- `YOUR_SUPABASE_URL` - Found in Supabase Project Settings → API
- `YOUR_SUPABASE_ANON_KEY` - Found in Supabase Project Settings → API → anon/public key

---

## 📤 How to Upload Videos

### Method 1: Supabase Storage (Recommended for files under 5GB)

1. Open your TV page: `https://tafsirkurd.com/tv`
2. Scroll to the upload section
3. Click **"باڕکرنا ڤیدیۆ"** (Upload Video) tab
4. Click **"هەڵبژێرە ڤیدیۆ (تا ٥GB)"** and select your video file
5. Fill in the video details:
   - **Title** (required)
   - **Description** (optional)
   - **Series** (required): Select category
   - **Category** (required): Select type
6. Click **"دەستپێکرنا باڕکرنێ"** (Start Upload)
7. Watch the progress bar - shows speed and time remaining
8. Video will appear on your TV page when complete!

**Features:**
- ✅ Handles files up to 5GB
- ✅ Chunks large files (6MB each) for reliability
- ✅ Resumes if connection drops
- ✅ Real-time progress tracking

### Method 2: YouTube Embed (Best for very large files or existing YouTube videos)

1. Upload your video to YouTube first
2. Set visibility to **Public** or **Unlisted**
3. Copy the video ID (e.g., from `youtube.com/watch?v=dQw4w9WgXcQ` → copy `dQw4w9WgXcQ`)
4. On your TV page, click **"لینکا YouTube"** (YouTube Link) tab
5. Paste the video ID (or full URL - it will extract the ID automatically)
6. Video preview will appear
7. Fill in the details (title, description, series, category)
8. Click **"تۆمارکرنا ڤیدیۆ"** (Save Video)

**Benefits:**
- ✅ **Unlimited file size** (YouTube handles it)
- ✅ **Free CDN** (YouTube servers)
- ✅ **Auto transcoding** (YouTube creates multiple quality versions)
- ✅ **No storage costs**

---

## 🔐 Security Considerations

### For Production:
1. **Restrict uploads to authenticated admins only**
   - Add admin role check before showing upload section
   - Use RLS policies in Supabase

2. **Add file type validation on server**
   - Currently validated in browser only
   - Add server-side check in Supabase Storage policies

3. **Rate limiting**
   - Prevent abuse by limiting uploads per IP/user

### Example Admin Check:
```javascript
// Show upload section only for admins
const user = await supabase.auth.getUser();
if (user && user.user_metadata?.role === 'admin') {
    document.getElementById('uploadSection').style.display = 'block';
}
```

---

## 📊 Database Structure

```
tv_episodes table:
├── id (UUID) - Unique episode ID
├── title (TEXT) - Episode title
├── description (TEXT) - Episode description
├── video_url (TEXT) - Supabase path OR YouTube video ID
├── video_type (TEXT) - 'supabase' or 'youtube'
├── series (TEXT) - Series name
├── category (TEXT) - Category name
├── duration (INTEGER) - Video length in seconds
├── thumbnail_url (TEXT) - Thumbnail image URL
├── view_count (INTEGER) - Number of views
├── like_count (INTEGER) - Number of likes
├── rating (DECIMAL) - Average rating
├── created_at (TIMESTAMP) - Upload date
└── updated_at (TIMESTAMP) - Last update
```

---

## 🎬 Loading Videos on TV Page

To display uploaded videos, add this to your `tv-player.js`:

```javascript
// Load episodes from database
async function loadEpisodes() {
    const { data, error } = await supabase
        .from('tv_episodes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading episodes:', error);
        return;
    }

    // Render episodes
    data.forEach(episode => {
        const videoUrl = episode.video_type === 'youtube'
            ? `https://www.youtube.com/embed/${episode.video_url}`
            : supabase.storage.from('episode-videos').getPublicUrl(episode.video_url).data.publicUrl;

        // Create episode card and add to grid
        // (Use existing episode card HTML structure)
    });
}

// Call on page load
loadEpisodes();
```

---

## 💡 Tips & Best Practices

### For Large Files (2GB+):
1. **Use YouTube** if file is over 5GB (Supabase limit)
2. **Test your internet** - slow connections may timeout
3. **Keep browser tab open** during upload
4. **Use wired connection** if possible (more stable than WiFi)

### For Best Quality:
1. **Recommended video specs:**
   - Resolution: 1080p (1920x1080)
   - Bitrate: 8-12 Mbps
   - Codec: H.264
   - Audio: AAC, 320kbps

2. **Compress before upload** to reduce file size:
   - Use HandBrake (free)
   - Or use YouTube's compression (automatic)

### Storage Costs:
- **Supabase**: 1GB free, then $0.021/GB/month
- **YouTube**: Unlimited free storage
- **Recommendation**: Use YouTube for long videos, Supabase for exclusive content

---

## 🐛 Troubleshooting

### Upload fails or stalls:
1. Check internet connection
2. Verify file size is under 5GB
3. Try using YouTube method instead
4. Check browser console for errors

### "Supabase not initialized":
1. Verify you added the Supabase script to tv.html
2. Check your URL and API key are correct
3. Ensure script runs before tv-player.js

### Video doesn't appear after upload:
1. Check browser console for errors
2. Verify database table was created
3. Check RLS policies allow public read
4. Call `loadEpisodes()` to refresh the list

---

## 🚀 Next Steps

1. **Create storage bucket** in Supabase
2. **Run SQL** to create tv_episodes table
3. **Add Supabase client** to tv.html
4. **Test upload** with a small video first
5. **Set up admin authentication** (optional but recommended)

---

## 📝 Demo Mode

**Good news!** The upload system works in **demo mode** even without Supabase:
- File selection and validation works
- Progress bar simulates upload
- Form validation works
- Perfect for testing the UI

Just add the Supabase client later when you're ready to go live!

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for errors (F12 → Console)
2. Verify all SQL tables were created
3. Check Supabase dashboard for upload errors
4. Test with a small file first (under 100MB)

Your upload system is ready! 🎉
