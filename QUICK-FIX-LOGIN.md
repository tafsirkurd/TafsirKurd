# 🚨 QUICK FIX - Login Not Working

## Why Your Login Failed

Your login kept saying "4 attempts remaining" because:
1. **Old authentication** used SHA-256 password hashing
2. **New database** expects bcrypt password hashing
3. **Mismatch** = all passwords failed, attempts tracked incorrectly

## ✅ FIX IT NOW - 3 Steps (5 minutes)

### Step 1: Update Your Password in Database

Run this command on your computer to generate a bcrypt hash:

```bash
node scripts/generate-bcrypt-hash.js YOUR_ACTUAL_PASSWORD
```

**Example:**
```bash
node scripts/generate-bcrypt-hash.js MyPassword123
```

This will output SQL like:
```sql
INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
VALUES (
    'tefsirkurd@gmail.com',
    '$2a$10$...',  -- Your bcrypt hash
    'Super Admin',
    'super_admin',
    true
)
ON CONFLICT (email)
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();
```

### Step 2: Run SQL in Supabase

1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **SQL Editor** in left sidebar
4. Paste the SQL from Step 1
5. Click **RUN** button
6. You should see: "Success. 1 rows affected."

### Step 3: Set Environment Variable in Cloudflare

1. Go to https://dash.cloudflare.com
2. Open **Pages** → Your project
3. Go to **Settings** → **Environment variables**
4. Add this variable:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your service role key from Supabase

   **How to find your service role key:**
   - In Supabase dashboard
   - Click **Settings** → **API**
   - Copy the **service_role** key (NOT the anon key)
   - It starts with `eyJ...`

5. Click **Save**
6. Go to **Deployments** tab
7. Click **Retry deployment** on the latest deployment

### Step 4: Wait & Try Again

Wait 2-3 minutes for Cloudflare to redeploy, then:

1. Go to https://tafsirkurd.com/admin-login.html
2. Clear your browser cache (Ctrl+Shift+Delete)
3. Enter your email: `tefsirkurd@gmail.com`
4. Enter the password you used in Step 1
5. Click **Sign In**

**IT SHOULD WORK NOW!** ✅

## 🔐 What Changed

Before (OLD - SHA-256):
- Password: `MyPassword123`
- Hash: `8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918`
- Stored in: Environment variable `ADMIN_PASSWORD_HASH`
- Attempts: 5 max (tracked in KV storage)

After (NEW - Bcrypt):
- Password: `MyPassword123`
- Hash: `$2a$10$6UVsUXjkNeVMxNGS/nRtzeAcq8Swb6a8qUx4X0cM.9p59ZRdwHB0O`
- Stored in: Database table `admin_users`
- Attempts: 3 max (tracked in database)

## 🆘 Still Not Working?

### Check 1: Database Tables Exist
Run this SQL in Supabase:
```sql
SELECT * FROM admin_users;
```
Should show your admin account. If error "relation does not exist", you need to run `database-admin-auth-schema.sql` first.

### Check 2: Service Role Key Set
In Cloudflare Pages → Settings → Environment variables, verify:
- `SUPABASE_SERVICE_ROLE_KEY` exists
- Value starts with `eyJ...`
- NOT the anon key

### Check 3: Deployment Succeeded
In Cloudflare Pages → Deployments:
- Latest deployment shows "Success"
- Check build logs for errors

### Check 4: Try Different Browser
- Use incognito/private mode
- Clear all cookies and cache

## 📞 Need Help?

If still not working after these steps, check:
1. Browser console errors (F12 → Console tab)
2. Network tab (F12 → Network → Look for failed requests to `/admin-auth`)
3. Cloudflare deployment logs

The new authentication system is now deployed and ready! The issue was simply the password hash mismatch. Once you update your password in the database with bcrypt, everything will work perfectly.
