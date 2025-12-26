# 🎬 TafsirKurd TV - YouTube Upload Guide

## ✨ Simple, FREE & Unlimited Video Hosting!

Your TV page now uses **YouTube embeds** - completely FREE with unlimited storage!

---

## 🎯 Why YouTube?

✅ **FREE** - No storage costs ever
✅ **UNLIMITED** - Upload files of any size
✅ **AUTO TRANSCODING** - YouTube creates 360p, 480p, 720p, 1080p, 4K automatically
✅ **GLOBAL CDN** - Fast playback worldwide
✅ **RELIABLE** - 99.9% uptime guaranteed by Google
✅ **MOBILE OPTIMIZED** - Works perfectly on all devices

---

## 📤 How to Upload Videos (3 Easy Steps)

### Step 1: Upload to YouTube

1. Go to **YouTube.com** and sign in
2. Click the **➕ Create** button → **Upload video**
3. Upload your Islamic video
4. While uploading, fill in:
   - **Title**: Same as you'll use on your site (or different)
   - **Description**: Optional
   - **Visibility**: Choose one:
     - 🔓 **Public** - Anyone can find it on YouTube
     - 🔗 **Unlisted** - Only people with link can watch (recommended!)
     - 🔒 **Private** - Only you can see it

   💡 **Tip**: Use **Unlisted** so videos are only accessible from your TafsirKurd site!

5. Click **Upload** and wait for processing

---

### Step 2: Get the Video ID

After your video finishes processing on YouTube:

1. Go to your video on YouTube
2. Look at the URL in your browser:
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
3. **Copy the Video ID** (the part after `v=`):
   ```
   dQw4w9WgXcQ
   ```

**That's it!** Just 11 characters.

---

### Step 3: Add to Your TV Page

1. Go to your TV page: **https://tafsirkurd.com/tv**
2. Scroll down to **"زێدەکرنا ڤیدیۆیا نوی"** (Upload section)
3. **Paste the Video ID** in the input field
   - You can paste the full URL or just the ID - it will auto-extract!
4. **Watch the preview appear** automatically
5. **Fill in the details**:
   - Title (Kurdish)
   - Description (optional)
   - Series (Tafsir, Ramadan, Stories, etc.)
   - Category (Tafsir, Hadith, Seerah, etc.)
6. Click **"تۆمارکرنا ڤیدیۆ"** (Save Video)

**Done!** Your video is now saved and ready to display.

---

## 💾 Where Are Videos Saved?

Videos are saved to your browser's **localStorage** by default. This means:

✅ **No database needed** - Works immediately
✅ **No costs** - Completely free
✅ **Private** - Only visible to you (admin)

### To Make Videos Public:

You have 2 options:

#### Option 1: Use Supabase Database (Recommended)
- Saves metadata only (title, description, video ID)
- **No file storage costs** - YouTube hosts the videos!
- All users can see the videos
- Videos persist across devices
- See `TV_UPLOAD_GUIDE.md` for setup instructions

#### Option 2: Manually Add to JavaScript
- Edit `tv-player.js` and add videos to the playlist array
- Simple for small sites
- No database needed

---

## 🎥 YouTube Upload Tips

### Best Practices:
1. **Upload in highest quality** you have (1080p or 4K)
   - YouTube will auto-create lower quality versions
2. **Use Unlisted visibility** for content exclusive to your site
3. **Add good titles** on YouTube for your own organization
4. **Create playlists** on YouTube to organize series

### Video Specs:
- **Format**: MP4, MOV, AVI (YouTube accepts most formats)
- **Max File Size**: 128GB or 12 hours (whichever is less)
- **Recommended**: 1080p, H.264 codec, AAC audio
- **Aspect Ratio**: 16:9 (standard widescreen)

### Processing Time:
- **SD (480p)**: Available immediately
- **HD (720p/1080p)**: 5-30 minutes
- **4K**: 30-60 minutes

---

## 🔐 Privacy Options Explained

### Public
- ✅ Anyone can find your video on YouTube search
- ✅ Shows up in your YouTube channel
- ❌ Can't control where people watch

**Use for**: General Islamic content you want to share widely

### Unlisted (RECOMMENDED)
- ✅ Only people with the link can watch
- ✅ Won't show up in YouTube search
- ✅ Perfect for site-exclusive content
- ✅ Can still embed on your site

**Use for**: TafsirKurd exclusive videos

### Private
- ❌ Only you can see it
- ❌ Won't work on your public site

**Don't use this** for public website videos.

---

## 📊 Viewing Your Saved Videos

### In Browser Console:
```javascript
// View all saved videos
console.log(JSON.parse(localStorage.getItem('tvEpisodes')));

// Count videos
const videos = JSON.parse(localStorage.getItem('tvEpisodes') || '[]');
console.log(`Total videos: ${videos.length}`);
```

### Export to File:
```javascript
// Copy all videos as JSON
const videos = localStorage.getItem('tvEpisodes');
console.log(videos);
// Then copy from console and save to file
```

---

## 🚀 Advanced: Display Videos on Your Page

To show saved videos on your TV page, add this to `tv-player.js`:

```javascript
// Load videos from localStorage
function loadLocalVideos() {
    const videos = JSON.parse(localStorage.getItem('tvEpisodes') || '[]');

    videos.forEach(video => {
        // Create episode card HTML
        const episodeCard = `
            <div class="episode-card" onclick="playYouTubeVideo('${video.videoId}', '${video.title}')">
                <div class="episode-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                    <div class="play-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="episode-info">
                    <h3 class="episode-title">${video.title}</h3>
                    <p class="episode-desc">${video.description || ''}</p>
                </div>
            </div>
        `;

        // Add to appropriate section based on series/category
        // (You can customize this logic)
        document.getElementById('latestEpisodes').innerHTML += episodeCard;
    });
}

// Play YouTube video in player
function playYouTubeVideo(videoId, title) {
    const player = document.getElementById('videoPlayer');
    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    document.getElementById('currentVideoTitle').textContent = title;
    document.getElementById('playerSection').scrollIntoView({ behavior: 'smooth' });
}

// Call on page load
loadLocalVideos();
```

---

## 🎨 Customization Ideas

### Add Categories Section:
Filter videos by category (Tafsir, Hadith, etc.)

### Add Series Pages:
Create dedicated pages for each series (Tafsir series, Ramadan series, etc.)

### Add Search:
Search through your video library

### Add Sorting:
Sort by date, views, rating, etc.

---

## ❓ Troubleshooting

### Video not appearing in preview?
- Check the video ID is exactly 11 characters
- Make sure video is not set to "Private" on YouTube
- Wait for YouTube processing to complete

### Video won't save?
- Check browser console for errors (F12 → Console)
- Make sure all required fields are filled
- Try clearing localStorage and trying again

### Want to delete a video?
```javascript
// In browser console:
let videos = JSON.parse(localStorage.getItem('tvEpisodes'));
videos = videos.filter(v => v.videoId !== 'VIDEO_ID_TO_DELETE');
localStorage.setItem('tvEpisodes', JSON.stringify(videos));
```

---

## 💡 Pro Tips

1. **Create a YouTube account** specifically for TafsirKurd content
2. **Use playlists** on YouTube to organize by series
3. **Set all to Unlisted** for site-exclusive content
4. **Add good thumbnails** on YouTube (they'll show on your site)
5. **Use YouTube Studio** to see analytics (views, watch time, etc.)
6. **No download limits** - Upload as many videos as you want!

---

## 🎉 You're All Set!

Your YouTube-only upload system is:
- ✅ FREE forever
- ✅ Unlimited storage
- ✅ No database needed (uses localStorage)
- ✅ Works right now

Just upload to YouTube, paste the video ID, and you're done!

**Live now at:** https://tafsirkurd.com/tv

---

## 📞 Need Help?

1. Check browser console for errors (F12)
2. Make sure video ID is correct (11 characters)
3. Verify video is not "Private" on YouTube
4. Test with a known public video first

Enjoy your FREE unlimited video hosting! 🚀
