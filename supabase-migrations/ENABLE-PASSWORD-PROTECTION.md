# Enable Leaked Password Protection

## Issue

Supabase Auth can prevent users from using compromised passwords by checking against the HaveIBeenPwned.org database. This feature is currently **disabled**.

**Security Risk:**
- ❌ Users can set passwords that have been leaked in data breaches
- ❌ Accounts are vulnerable to credential stuffing attacks
- ❌ Weak security posture

## Solution

Enable leaked password protection in Supabase Auth settings.

**Security Benefits:**
- ✅ Blocks passwords found in known data breaches
- ✅ Prevents credential stuffing attacks
- ✅ Forces users to choose secure, unique passwords
- ✅ Complies with security best practices

## How to Enable (2 Steps)

### Step 1: Go to Auth Configuration

1. Open your **Supabase Dashboard**
2. Select your project
3. Click on **Authentication** in the left sidebar
4. Click on **Configuration** (NOT Policies)
5. Scroll down to find **"Auth Providers"** or **"Password settings"**

### Step 2: Enable Password Protection

Look for one of these settings:
- **"Password strength"** section
- **"Leaked password protection"**
- **"Check passwords against breached database"**
- Or a toggle for **"HaveIBeenPwned"**

**Turn it ON** ✅

### If You Still Can't Find It

The setting might be in:
- **Project Settings** → **Authentication** → **Password Policies**
- Or it might be automatically enabled and just not showing in the UI

Try searching for "password" in the Supabase Dashboard settings.

### Alternative Method (If not in UI)

If you can't find it in the UI, you can enable it via SQL:

```sql
-- This setting may be controlled by Supabase directly
-- Contact Supabase support if the UI option is not available
```

**Or via Supabase CLI:**

```bash
# Update your config.toml
[auth]
password_min_length = 8
enable_signup = true
enable_anonymous_users = false

# Add this line:
password_required_characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# Then push config
supabase db push
```

## Verification

After enabling:

1. Go to **Database** → **Database Linter**
2. The warning `auth_leaked_password_protection` should be **GONE** ✅

### Test It Works

Try to sign up with a known leaked password like:
- `password123`
- `qwerty`
- `123456`

**Expected:** Registration should be **rejected** with a message about the password being compromised.

## What This Does

When enabled, Supabase Auth will:
1. Hash the password using SHA-1
2. Send the **first 5 characters** of the hash to HaveIBeenPwned.org
3. Check if the full hash matches any leaked passwords
4. **Reject** registration if password is compromised

**Privacy:** Your actual password is NEVER sent to external services. Only a partial hash prefix is used for lookup.

## Reference

- [Supabase: Password Security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [HaveIBeenPwned](https://haveibeenpwned.com/)
- [Database Linter](https://supabase.com/docs/guides/database/database-linter)

---

**Status:** Pending manual configuration in Supabase Dashboard
**Security Level:** 🔥 HIGHLY RECOMMENDED
**Impact:** Zero downtime, only affects new user registrations and password changes
