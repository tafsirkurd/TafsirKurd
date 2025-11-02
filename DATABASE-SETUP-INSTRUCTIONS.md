# Database Setup Instructions

## ⚠️ IMPORTANT: Run this BEFORE deploying!

Your user data is now backed up to Supabase database to prevent data loss when users clear their browser cache.

## Step 1: Create the Database Table

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase-migration-user-data.sql`
6. Click **Run** to execute the SQL

## Step 2: Verify the Table was Created

1. In Supabase Dashboard, click **Table Editor**
2. You should see a new table called `user_data`
3. Columns should be:
   - `id` (bigserial, primary key)
   - `user_id` (text, unique)
   - `data` (jsonb)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## Step 3: Deploy to Netlify

```bash
git push
netlify deploy --prod
```

## How It Works

### Data Flow:

```
User Reading → localStorage (instant) → Supabase (every 30s)
                     ↓
              Cloud Backup
                     ↓
User Clears Cache → Data Lost Locally
                     ↓
User Logs In → Load from Supabase → Restore to localStorage
                     ↓
              Data Restored! ✅
```

### Features:

- ✅ **Auto-sync every 30 seconds** while reading
- ✅ **Save on logout** - data backed up before logging out
- ✅ **Load on login** - checks cloud backup first
- ✅ **Survives cache clearing** - data restored from cloud
- ✅ **Offline-first** - localStorage for speed, cloud for safety
- ✅ **User-specific** - each user's data stored separately by Google ID

## Testing

After deployment, test the system:

1. **Test 1: Normal Usage**
   - Log in
   - Read some Quran
   - Check browser console: Should see "✅ Data backed up to cloud" every 30s
   - Log out
   - Log back in
   - Verify your data is still there

2. **Test 2: Cache Clearing**
   - Log in
   - Read some Quran and set a reading goal
   - Wait 30 seconds for cloud sync
   - Open browser DevTools → Application → Local Storage
   - Clear all localStorage data
   - Refresh page
   - Log in again
   - **Your data should be restored!** ✅

## Troubleshooting

### "Cloud backup failed" in console

Check:
1. Supabase table created correctly (see Step 1)
2. Environment variables set in Netlify:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Netlify function deployed: `/.netlify/functions/user-data`

### Data not restoring after cache clear

Check:
1. Browser console for errors
2. Supabase Dashboard → Table Editor → user_data table
3. Look for your user_id (Google ID) in the table
4. Check if data column has your information

## Database Management

### View all users' data:
```sql
SELECT user_id, created_at, updated_at
FROM user_data
ORDER BY updated_at DESC;
```

### View specific user's data:
```sql
SELECT * FROM user_data
WHERE user_id = 'YOUR_GOOGLE_USER_ID';
```

### Delete old/inactive data (optional cleanup):
```sql
-- Delete data older than 1 year
DELETE FROM user_data
WHERE updated_at < NOW() - INTERVAL '1 year';
```

## Support

If you encounter any issues:
1. Check Netlify function logs
2. Check Supabase logs
3. Check browser console for error messages
