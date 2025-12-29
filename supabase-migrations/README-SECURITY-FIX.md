# Security Fix: SECURITY DEFINER View Issue

## Problem

The Supabase Security Linter detected that the view `public.profiles_with_avatar` was using `SECURITY DEFINER`, which is a security vulnerability.

### Why is this a problem?

- **SECURITY DEFINER** views run with the privileges of the view creator (usually the database owner)
- This **bypasses Row Level Security (RLS)** policies
- Users could potentially access data they shouldn't be able to see
- Reference: [Supabase Database Linter - 0010_security_definer_view](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)

## Solution

The view has been recreated with `security_invoker = true`, which ensures:
- ✅ The view runs with the permissions of the **querying user**, not the creator
- ✅ RLS policies on the underlying `public.profiles` table are **enforced**
- ✅ Users can only see their own profile data
- ✅ Complies with Supabase security best practices

## How to Apply the Fix

### ⚠️ IMPORTANT: Which File to Run

**ONLY run this file:**
- ✅ `fix-profiles-view-security.sql` - **This is the file you need**

**DO NOT run:**
- ❌ `create-profiles-table.sql` - This creates the entire table (already exists in your DB)

### Option 1: Run the Migration SQL (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-migrations/fix-profiles-view-security.sql`
4. **Copy ALL the contents** (entire file)
5. **Paste into SQL Editor**
6. Click **Run**

**Expected output:**
```
✅ Fixed profiles_with_avatar view - now using SECURITY INVOKER
✅ RLS policies on public.profiles will now be enforced for this view
✅ Users can only see their own profile through this view
```

### Option 2: Manual Fix via SQL Editor

Run this SQL in the Supabase SQL Editor:

```sql
-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_with_avatar;

-- Recreate with security_invoker
CREATE VIEW public.profiles_with_avatar
WITH (security_invoker = true) AS
SELECT
    p.*,
    COALESCE(p.avatar_url, public.get_default_avatar(p.display_name)) as avatar
FROM public.profiles p;

-- Grant permissions
GRANT SELECT ON public.profiles_with_avatar TO authenticated;
```

## Verification

After applying the fix, verify it worked:

1. Go to **Database** → **Database Linter** in Supabase Dashboard
2. The warning about `profiles_with_avatar` should be **gone**
3. Check that the security linter shows **0 issues** for view security

### Test RLS is Working

Run this query to verify RLS is enforced:

```sql
-- Should only return the current user's profile
SELECT * FROM public.profiles_with_avatar;
```

## What Changed

### Before (Insecure)
```sql
CREATE OR REPLACE VIEW public.profiles_with_avatar AS
SELECT p.*, COALESCE(...) as avatar FROM public.profiles p;
```
❌ Used implicit SECURITY DEFINER - bypassed RLS

### After (Secure)
```sql
CREATE VIEW public.profiles_with_avatar
WITH (security_invoker = true) AS
SELECT p.*, COALESCE(...) as avatar FROM public.profiles p;
```
✅ Uses SECURITY INVOKER - respects RLS policies

## Files Modified

1. ✅ `supabase-migrations/fix-profiles-view-security.sql` - **Migration to fix the issue**
2. ✅ `supabase-migrations/create-profiles-table.sql` - **Updated to prevent future issues**

## Impact

- **No breaking changes** - The view still returns the same data
- **Security improved** - RLS policies now properly enforced
- **User data protected** - Users can only access their own profiles
- **Zero downtime** - Can be applied without service interruption

## Next Steps

1. ✅ Run the migration SQL in Supabase Dashboard
2. ✅ Verify the linter warning is gone
3. ✅ Test that the application still works correctly
4. ✅ Monitor for any RLS-related errors in production

---

**Security Level**: 🔥 CRITICAL FIX
**Applied**: Pending manual execution in Supabase
**Status**: Ready to deploy
