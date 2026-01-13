# 🔐 Admin Authentication & Account Management Implementation Guide

**Complete secure multi-admin system with bcrypt hashing, session management, role-based access, and audit logging.**

---

## 📋 Overview

This implementation provides:

✅ **Secure Login** - Bcrypt password hashing, 3-attempt lockout (24h)
✅ **Session Management** - Database-backed sessions with automatic cleanup
✅ **Role-Based Access** - Super Admin, Editor, Analyst
✅ **Account Management** - Create, edit, disable, delete admin accounts
✅ **Audit Logging** - Track all login activity, account changes
✅ **IP-Based Rate Limiting** - Prevent brute force attacks

---

## 🗂️ Files Created

### Database Schema
- `database-admin-auth-schema.sql` - Database tables, indexes, RLS policies

### Backend Authentication
- `functions/admin-auth-v2.js` - Cloudflare Pages Function with bcrypt & database

### Frontend Pages
- `src/admin-login.html` - Login page (already exists, compatible)
- `src/admin-account-management.html` - Admin user management UI

### Client Utilities
- `src/utils/admin-auth.js` - Authentication utilities (already exists)

---

## 🚀 Implementation Steps

### Step 1: Run Database Schema

```bash
# Connect to your Supabase project SQL Editor
# Copy and paste the contents of database-admin-auth-schema.sql
# Execute the script
```

This creates:
- `admin_users` table
- `admin_sessions` table
- `admin_audit_logs` table
- `admin_login_attempts` table
- Indexes for performance
- RLS policies
- Helper functions and views

### Step 2: Create First Super Admin Account

You need to hash your password with bcrypt before inserting:

#### Option A: Use Online Tool
1. Go to https://bcrypt-generator.com/
2. Enter your desired password
3. Use rounds: 10
4. Copy the bcrypt hash (starts with `$2b$10$` or `$2a$10$`)

#### Option B: Use Node.js
```bash
npm install bcryptjs
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YOUR_PASSWORD', 10));"
```

#### Insert Super Admin
```sql
INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
VALUES (
    'tefsirkurd@gmail.com',
    '$2b$10$YourBcryptHashHere',  -- Replace with your actual hash
    'Super Admin',
    'super_admin',
    true
);
```

### Step 3: Install Dependencies (Cloudflare Pages)

Add to `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.36.0",
    "bcryptjs": "^2.4.3"
  }
}
```

Install:
```bash
npm install
```

### Step 4: Update Environment Variables

In Cloudflare Pages dashboard, add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** Use `SUPABASE_SERVICE_ROLE_KEY`, not the anon key. The service role key bypasses RLS policies (needed for backend auth operations).

### Step 5: Deploy New Auth Function

**Option A: Replace existing file**
```bash
# Backup old file
cp functions/admin-auth.js functions/admin-auth-old.js

# Replace with new version
mv functions/admin-auth-v2.js functions/admin-auth.js

# Deploy
git add functions/admin-auth.js
git commit -m "Upgrade to secure database-backed authentication"
git push
```

**Option B: Test alongside (recommended)**
```bash
# Keep both versions during migration
# Update login page to point to /admin-auth-v2 temporarily
# Test thoroughly
# Then replace once verified
```

### Step 6: Update Admin Navigation

Add Admin Accounts link to all admin pages:

```html
<div class="nav-section">
    <div class="nav-section-header">System</div>
    <!-- ... other links ... -->
    <a href="/admin-account-management.html" class="nav-item">
        <i data-lucide="user-cog"></i>
        <span class="nav-item-label">Admin Accounts</span>
    </a>
</div>
```

---

## 🔐 Security Features

### 1. **Password Hashing - Bcrypt**
- Uses bcrypt (10 rounds) for secure password storage
- SHA-256 replaced with industry-standard bcrypt
- Computationally expensive, resistant to brute force

### 2. **3-Attempt Lockout (24 Hours)**
- Maximum 3 failed login attempts
- Account locked for exactly 24 hours after 3rd failure
- Lock status stored in database (persistent)
- Clear error message: "Account locked. Try again in X hours."

### 3. **Database-Backed Sessions**
- Sessions stored in `admin_sessions` table
- Token: 32-byte cryptographically secure random string
- Automatic cleanup of old sessions
- Last activity tracking

### 4. **Audit Logging**
- Every login success/failure logged
- Account creation/deletion/modification logged
- IP address and User-Agent captured
- Searchable audit trail

### 5. **Role-Based Access Control**
- **Super Admin**: Full access, can manage accounts
- **Editor**: Content management only
- **Analyst**: View statistics only
- Roles enforced on both frontend and backend

### 6. **Session Security**
- 24-hour expiration
- Automatic logout on token expiration
- Force logout capability
- Session regeneration on login

---

## 👥 Role Permissions

| Feature | Super Admin | Editor | Analyst |
|---------|------------|--------|---------|
| Dashboard | ✅ | ✅ | ✅ |
| View Analytics | ✅ | ✅ | ✅ |
| Manage Content | ✅ | ✅ | ❌ |
| Manage Videos | ✅ | ✅ | ❌ |
| Manage Users (App Users) | ✅ | ✅ | ❌ |
| Manage Admin Accounts | ✅ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ |

---

## 📊 Admin Account Management

### Create New Admin
1. Navigate to `/admin-account-management.html`
2. Click "Create Account"
3. Fill in: Email, Full Name, Password (min 8 chars), Role
4. Password is hashed with bcrypt automatically
5. New admin can login immediately

### Edit Admin Account
- Change email, full name, role
- Enable/disable account
- Password change requires re-entering password

### Unlock Locked Account
- If admin is locked (3 failed attempts)
- Super Admin can manually unlock
- Resets failed attempts counter

### Delete Admin Account
- Permanent deletion
- Cascade deletes: sessions, audit logs preserved but user_id set to NULL
- Confirmation required

### Force Logout
- View active sessions in database:
```sql
SELECT * FROM active_admin_sessions;
```
- Delete specific session:
```sql
DELETE FROM admin_sessions WHERE id = <session_id>;
```

---

## 🔍 Monitoring & Maintenance

### View Active Sessions
```sql
SELECT * FROM active_admin_sessions;
```

### View Recent Login Activity
```sql
SELECT * FROM recent_login_activity;
```

### View Failed Login Attempts (Last 24h)
```sql
SELECT * FROM recent_failed_attempts;
```

### Clean Up Old Data (Run Weekly)
```sql
-- Clean expired sessions
SELECT cleanup_expired_admin_sessions();

-- Clean old login attempts (>7 days)
SELECT cleanup_old_login_attempts();
```

---

## 🐛 Troubleshooting

### Login Not Working

1. **Check password hash:**
```sql
SELECT email, password_hash FROM admin_users WHERE email = 'your@email.com';
```
Verify hash starts with `$2b$10$` or `$2a$10$`

2. **Check account status:**
```sql
SELECT email, is_active, is_locked, locked_until FROM admin_users WHERE email = 'your@email.com';
```

3. **Check environment variables:**
```bash
# In Cloudflare Pages dashboard
SUPABASE_URL (should exist)
SUPABASE_SERVICE_ROLE_KEY (should exist, not SUPABASE_ANON_KEY)
```

### "Account is disabled" Error

```sql
-- Re-enable account
UPDATE admin_users
SET is_active = true
WHERE email = 'your@email.com';
```

### Account Locked

```sql
-- Unlock and reset attempts
UPDATE admin_users
SET is_locked = false,
    locked_until = NULL,
    failed_attempts = 0
WHERE email = 'your@email.com';
```

### Password Reset

```bash
# Generate new hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('NEW_PASSWORD', 10));"
```

```sql
-- Update password
UPDATE admin_users
SET password_hash = '$2b$10$NewHashHere'
WHERE email = 'your@email.com';
```

---

## 🔄 Migration from Old System

If you have existing authentication:

### 1. Database Migration
```sql
-- Migrate existing admin data (if applicable)
-- Example: If you have an old admin table
INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
SELECT
    email,
    -- Note: Old SHA-256 hashes must be regenerated with bcrypt
    NULL as password_hash,  -- Will need to reset passwords
    name as full_name,
    'super_admin' as role,
    true as is_active
FROM old_admin_table;
```

### 2. Password Reset for Migrated Users
- All migrated users must reset their password
- Send password reset email or provide temporary password

### 3. Update Frontend References
- Search for `/admin-auth` in all files
- Verify all pages use new token verification

---

## 📈 Next Steps (Optional Enhancements)

### 1. **Two-Factor Authentication (2FA)**
- Add `totp_secret` column to `admin_users`
- Integrate authenticator app (Google Authenticator, Authy)

### 2. **Password Reset via Email**
- Create password reset token table
- Send reset link via email service

### 3. **Activity Dashboard**
- Real-time view of active sessions
- Login history visualization
- Failed attempt alerts

### 4. **IP Whitelist**
- Add `allowed_ips` column
- Restrict login to specific IP ranges

### 5. **CSRF Protection**
- Implement CSRF tokens for all state-changing requests

---

## ✅ Verification Checklist

- [ ] Database schema executed successfully
- [ ] First super admin account created and can login
- [ ] bcryptjs dependency installed
- [ ] Environment variables set in Cloudflare Pages
- [ ] New auth function deployed
- [ ] Login page working with new system
- [ ] Account lockout working (test with 3 wrong passwords)
- [ ] Admin account management page accessible to super admin only
- [ ] Sessions persisting correctly
- [ ] Audit logs recording activity
- [ ] Role permissions enforced

---

## 🆘 Support & Security

### Reporting Security Issues
- **DO NOT** open public GitHub issues for security vulnerabilities
- Email: security@tafsirkurd.com (if applicable)

### Best Practices
- Never commit password hashes to git
- Use strong passwords (min 12 characters, mixed case, numbers, symbols)
- Regularly review audit logs
- Rotate admin accounts quarterly
- Monitor for suspicious login patterns

---

**Implementation Complete!** 🎉

Your admin panel now has enterprise-grade security with proper authentication, authorization, and audit logging.
