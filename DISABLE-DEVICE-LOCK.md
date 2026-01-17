# Disable Device Lock for Admin Account

## Problem
Getting "🔒 This account is locked to a different device" even when you're sure nobody else is logged in.

## Why This Happens
Device fingerprint changes when:
- Using private/incognito mode
- Switching browsers
- Browser updates
- Privacy extensions enabled
- Screen resolution changes

## Solution Options

### Option 1: Self-Reset Device Lock (Quick Fix)

When you see the lock message, run this in your admin backend or Supabase SQL editor:

```sql
-- Reset device lock for your admin account
UPDATE admin_users
SET device_fingerprint = NULL,
    device_locked = false
WHERE email = 'your-email@example.com';
```

Replace `your-email@example.com` with your actual admin email.

### Option 2: Disable Device Locking Permanently

Run this SQL to disable device locking for your account:

```sql
-- Add a column to allow disabling device lock per user
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS disable_device_lock BOOLEAN DEFAULT false;

-- Disable device lock for your account
UPDATE admin_users
SET disable_device_lock = true,
    device_fingerprint = NULL,
    device_locked = false
WHERE email = 'your-email@example.com';
```

Then update the backend auth function to check this flag.

### Option 3: Use Less Strict Fingerprinting

Modify device-fingerprint.js to only use stable data:

```javascript
// Only use: timezone, language, platform
// Remove: canvas, webgl, screen (these change too often)
```

### Option 4: Allow Multiple Devices

Instead of locking to ONE device, allow a list of trusted devices:

```sql
-- Store multiple device fingerprints
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS trusted_devices TEXT[] DEFAULT '{}';
```

## Quick Manual Reset (No Code Needed)

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Open `admin_users` table
3. Find your row (your email)
4. Set `device_fingerprint` to NULL
5. Set `device_locked` to false
6. Click Save
7. Try logging in again

## Recommended Solution for Super Admin

Since you're the super admin and use multiple browsers/modes:

1. **Disable device lock for your account only**
2. **Keep it enabled for other admins** (Editors, Analysts)
3. **Use IP-based checks instead** (more flexible)

Would you like me to implement one of these solutions?

## Current Device Lock Status

Check your current lock status:

```sql
SELECT
    email,
    role,
    device_locked,
    device_fingerprint,
    last_login_at
FROM admin_users
WHERE email = 'your-email@example.com';
```

## Best Practice

For Super Admin (you):
- ✅ Disable device lock
- ✅ Use strong password + 2FA instead
- ✅ Monitor login activity

For Other Admins:
- ✅ Keep device lock enabled
- ✅ They request unlock from you if needed
