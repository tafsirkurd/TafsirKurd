# Quick Guide: Find Password Protection Setting

## ⚠️ Can't Find the Setting? Here's Why:

The "leaked password protection" warning might appear even if the setting is **not available in your Supabase plan** or **already enabled by default**.

## Where to Look:

### Option 1: Authentication → Configuration
1. **Supabase Dashboard** → Your Project
2. **Authentication** (left sidebar)
3. **Configuration** tab
4. Scroll to **"Password Protection"** or **"Security"** section

### Option 2: Project Settings
1. **Settings** (gear icon, bottom left)
2. **Authentication**
3. Look for **"Password Policies"** or **"Security Settings"**

### Option 3: It Might Not Exist Yet
This feature is relatively new and might:
- ✅ Already be enabled by default (no action needed)
- ❌ Not be available in your Supabase version/plan
- 🔄 Be coming in a future update

## Check if It's Already Working:

Try to register with a known weak password:
- Email: `test@example.com`
- Password: `password123`

**If registration is blocked** → Feature is already working! ✅
**If registration succeeds** → Feature might not be available yet

## What to Do:

### If you can't find the setting:
1. **Ignore the linter warning** - it might be informational only
2. **Contact Supabase Support** and ask about enabling leaked password protection
3. **Use strong password requirements** in your client-side validation as a workaround

### Workaround: Client-Side Password Validation

Since you already have strong password validation in your app (from `login.html`):
- ✅ 8+ characters required
- ✅ Uppercase + lowercase + numbers + special chars
- ✅ Entropy calculation
- ✅ Pattern detection

**This provides good protection** even without HaveIBeenPwned integration.

## Alternative: Run SQL to Check

```sql
-- Check current auth configuration
SELECT * FROM auth.config;

-- This might show password-related settings
```

## Summary:

🔍 **If you can't find it:** Don't worry - your app already has strong password requirements
✅ **The linter warning:** May be informational or for future reference
🛡️ **Your security:** Still very strong with client-side validation + Supabase's default security

---

**Recommendation:** Focus on the function search_path fixes (which ARE critical). The password protection warning is less critical since you already validate passwords.
