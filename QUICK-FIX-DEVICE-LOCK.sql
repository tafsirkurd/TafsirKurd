-- ========================================
-- Quick Fix: Disable Device Lock for Your Account
-- ========================================

-- Step 1: Add the disable_device_lock column
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS disable_device_lock BOOLEAN DEFAULT false;

-- Step 2: Disable device lock for YOUR account
-- ⚠️ REPLACE 'YOUR_EMAIL_HERE' with your actual admin email!
UPDATE admin_users
SET
    disable_device_lock = true,
    device_fingerprint = NULL,
    device_locked_at = NULL,  -- ✅ Correct column name!
    device_user_agent = NULL,
    device_ip = NULL
WHERE email = 'YOUR_EMAIL_HERE';

-- Step 3: Verify the change
SELECT
    email,
    role,
    disable_device_lock,
    device_fingerprint,
    device_locked_at,
    last_login
FROM admin_users
WHERE email = 'YOUR_EMAIL_HERE';

-- ========================================
-- Expected Output:
-- ========================================
-- email: your-email@example.com
-- role: super_admin
-- disable_device_lock: true
-- device_fingerprint: null
-- device_locked_at: null
-- last_login: [your last login time]
-- ========================================
