# Convert TV System to AWS S3

## Quick Solution: Support Both YouTube & S3

Instead of removing all YouTube code, we'll make it support BOTH:
- Existing YouTube videos (video_url = YouTube ID)
- New S3 videos (video_url = full S3 URL)

## Changes Needed:

### 1. Admin Panel - Add S3 URL Field
In `admin-tv-management.html`, add option to paste S3 URL:

```html
<div class="form-group">
    <label>Video Source</label>
    <select id="video-source-type">
        <option value="youtube">YouTube</option>
        <option value="s3">AWS S3 (Direct URL)</option>
    </select>
</div>

<div id="youtube-input">
    <label>YouTube Video ID</label>
    <input type="text" id="episode-video-url" placeholder="dQw4w9WgXcQ">
</div>

<div id="s3-input" style="display:none;">
    <label>S3 Video URL</label>
    <input type="text" id="episode-s3-url" placeholder="https://your-bucket.s3.amazonaws.com/video.mp4">
</div>
```

### 2. Database - Add video_type Column
Run in Supabase:

```sql
ALTER TABLE tv_episodes 
ADD COLUMN IF NOT EXISTS video_type VARCHAR(20) DEFAULT 'youtube';
```

### 3. Update Play Function
In tv-player.js, update playYouTubeVideo to detect URL vs ID:

```javascript
window.playYouTubeVideo = function(videoId, title, episodeId) {
    // Check if it's a full URL (S3) or YouTube ID
    if (videoId.startsWith('http')) {
        // It's an S3 URL - use native player
        playNativeVideo(videoId, title, episodeId);
    } else {
        // It's YouTube ID - use existing YouTube player
        // ... existing YouTube code ...
    }
};

function playNativeVideo(videoUrl, title, episodeId) {
    const player = document.getElementById('videoPlayer');
    player.src = videoUrl;
    player.play();
    // Hide YouTube player, show native player
    const ytPlayer = document.getElementById('youtubePlayer');
    if (ytPlayer) ytPlayer.style.display = 'none';
    player.style.display = 'block';
}
```

## OR: Clean Slate (Remove YouTube Completely)

If you want to ONLY use S3:

1. Remove YouTube API script from tv.html
2. Replace entire YouTube player section with native HTML5
3. Update all database queries to not filter by video_type
4. Admin accepts only S3 URLs

Which approach do you prefer?
