# Database Setup Guide for TafsirKurd

**Issue:** Admin panel showing "Error loading videos" and other data loading errors.

**Root Cause:** Database tables don't exist or have incorrect RLS (Row Level Security) policies.

---

## Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **gijupzejtbpifjzwadee**
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Database Schema

1. Open the file: `database-schema.sql` (in this directory)
2. **Copy ALL the SQL code** from that file
3. **Paste it** into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Tables Created

After running the SQL, you should see:
```
Success. No rows returned
```

Then check that tables exist:
1. Click **Table Editor** in the left sidebar
2. You should see these tables:
   - ✅ user_data
   - ✅ contact_messages
   - ✅ featured_videos (this fixes "Error loading videos")
   - ✅ social_stats
   - ✅ features
   - ✅ schedule
   - ✅ kurdish_translations
   - ✅ background_images
   - ✅ admin_activity_feed
   - ✅ location_tracking

### Step 4: Test Admin Panel

1. Go back to https://tafsirkurd.com/admin.html
2. **Hard refresh** the page (Ctrl+F5 or Cmd+Shift+R)
3. Login with your admin credentials
4. All sections should now load without errors

---

## What the SQL Script Does

### Tables Created:
1. **user_data** - Stores user reading progress and preferences
2. **contact_messages** - Stores messages from contact form
3. **featured_videos** - Stores YouTube video URLs for homepage
4. **social_stats** - Instagram/TikTok follower counts
5. **features** - Website features section content
6. **schedule** - Daily schedule section content
7. **kurdish_translations** - Kurdish UI text translations
8. **background_images** - Background images for different pages
9. **admin_activity_feed** - Activity log for admin panel
10. **location_tracking** - Visitor location analytics

### Security Policies (RLS):
- Enabled Row Level Security on all tables
- Created public read/write policies for anon key
- All tables accessible via admin panel

### Performance Indexes:
- Added indexes on commonly queried columns
- Optimized for dashboard loading speed

---

## Troubleshooting

### "Error loading videos" persists
**Check:** Does `featured_videos` table exist?
```sql
SELECT * FROM featured_videos LIMIT 1;
```

**Fix:** If table doesn't exist, re-run the SQL script

### "Row Level Security policy violation"
**Check:** Are RLS policies created?
```sql
SELECT * FROM pg_policies WHERE tablename = 'featured_videos';
```

**Fix:** Run the RLS section of the SQL script again

### "Cannot read properties of null"
**Check:** Is Supabase initialized?
- Open browser console (F12)
- Look for "✅ Supabase initialized securely"
- If missing, refresh the page

### Tables exist but no data shows
**Solution:** Tables are empty - this is normal for a new setup
- Videos section: Click "Add Video" to add your first video
- Social Stats: Will auto-populate from Instagram/TikTok APIs
- Users: Will populate as people use the website

---

## Adding Initial Data (Optional)

### Example: Add a test video
```sql
INSERT INTO featured_videos (video_url, position) VALUES
    ('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1);
```

### Example: Add social stats
```sql
INSERT INTO social_stats (key, value, display_order, icon) VALUES
    ('instagram_followers', '10000', 1, 'fa-instagram'),
    ('tiktok_followers', '5000', 2, 'fa-tiktok'),
    ('total_views', '100000', 3, 'fa-eye'),
    ('videos_published', '50', 4, 'fa-video');
```

---

## Migration from Old Database (If Applicable)

If you have data in an old Supabase project that you want to migrate:

### Option 1: Export/Import via Supabase Dashboard
1. Old project → Table Editor → Export as CSV
2. New project → Table Editor → Import CSV

### Option 2: SQL Dump
1. Old project → SQL Editor → Run:
   ```sql
   SELECT * FROM featured_videos;
   ```
2. Copy the data
3. New project → Insert the data

---

## Next Steps After Setup

1. ✅ Verify all admin panel sections load
2. ✅ Add your first featured video
3. ✅ Configure social stats
4. ✅ Add background images
5. ✅ Test contact form submission

---

## Support

If you encounter any errors:
1. Check the browser console (F12) for detailed error messages
2. Check Supabase logs: Dashboard → Logs
3. Verify environment variables are set on Netlify
4. Ensure you're using the correct Supabase URL and anon key

**Current Supabase Project:**
- URL: `https://gijupzejtbpifjzwadee.supabase.co`
- Check this matches your `.env` and Netlify env vars
