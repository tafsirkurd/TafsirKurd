# Unified Profiles System

## Overview

All users (email and Google OAuth) share a single `profiles` table with automatic profile creation, default avatars, and conditional onboarding flow.

## Architecture

### Database Schema

**Table:** `public.profiles`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | User ID (FK to auth.users) |
| `email` | TEXT | User email |
| `full_name` | TEXT | Full name |
| `display_name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile picture URL |
| `registration_source` | TEXT | quran, tv, google, or email |
| `has_completed_signup` | BOOLEAN | Completed onboarding? |
| `first_login_at` | TIMESTAMP | First login timestamp |
| `preferences` | JSONB | User preferences |
| `created_at` | TIMESTAMP | Profile creation time |
| `updated_at` | TIMESTAMP | Last update time |

### Automatic Profile Creation

**Trigger:** `on_auth_user_created`

When a new user signs up (email or Google), a profile is automatically created with:
- User metadata (name, avatar)
- Registration source tracking
- Default preferences
- First login timestamp

### Registration Sources

| Source | Description | Complete Signup? |
|--------|-------------|------------------|
| `email` | Email/password signup | ✅ Yes (first time) |
| `google` | Google OAuth | ❌ No (has complete info) |
| `quran` | Registered via quran.html | ✅ Yes (first time) |
| `tv` | Registered via tv.html | ❌ No (skip onboarding) |

## User Flow

### Email Signup Flow

1. User enters name, email, password on login.html
2. OTP sent to email
3. User verifies OTP
4. Account created with `registration_source: 'email'`
5. Profile auto-created with `has_completed_signup: false`
6. User auto-signed in
7. Redirected to `/complete-signup.html` (first time only)
8. After completing signup, `has_completed_signup: true`
9. Future logins → go directly to `/quran.html`

### Google OAuth Flow

1. User clicks "Sign in with Google"
2. Google authentication
3. Account created with `registration_source: 'google'`
4. Profile auto-created with:
   - Name from Google
   - Avatar from Google
   - `has_completed_signup: true` (already complete)
5. Redirected directly to `/quran.html` (no onboarding)

### TV Registration

1. User registers via tv.html
2. Account created with `registration_source: 'tv'`
3. Profile auto-created with `has_completed_signup: true`
4. Skip complete-signup, go directly to content

## Default Avatars

Users without profile pictures get auto-generated avatars using:

```
https://api.dicebear.com/7.x/initials/svg?seed={displayName}
```

Example:
- User: "محەمەد ئەحمەد" → Avatar with initials "م ئ"
- User: "John Doe" → Avatar with initials "JD"

## Implementation

### Setup Database

Run in Supabase SQL Editor:

```bash
# From repo root
cat supabase-migrations/create-profiles-table.sql
```

Or manually:
1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Paste contents of `create-profiles-table.sql`
4. Run

### Frontend Integration

**Include auth-redirect.js:**

```html
<script src="/utils/auth-redirect.js" defer></script>
```

**After successful login:**

```javascript
if (window.authRedirect) {
    await window.authRedirect.handlePostLoginRedirect('/quran.html');
}
```

**In complete-signup.html:**

```javascript
// When user completes signup
await window.authRedirect.markSignupCompleted();
// Redirects to intended page
```

**Get user profile:**

```javascript
const profile = await window.authRedirect.getUserProfile();
console.log(profile.display_name);
console.log(profile.avatar_url); // With default if none
```

## API Functions

### `authRedirect.handlePostLoginRedirect(destination)`

Checks if user needs to complete signup and redirects accordingly.

```javascript
await window.authRedirect.handlePostLoginRedirect('/quran.html');
```

### `authRedirect.markSignupCompleted()`

Marks user as having completed signup and redirects to intended destination.

```javascript
await window.authRedirect.markSignupCompleted();
```

### `authRedirect.getUserProfile()`

Gets user profile with default avatar if needed.

```javascript
const profile = await window.authRedirect.getUserProfile();
// Returns: { id, email, full_name, display_name, avatar_url, ... }
```

### `authRedirect.checkSignupStatus()`

Checks if user needs to complete signup.

```javascript
const { needsCompletion, redirectUrl } = await window.authRedirect.checkSignupStatus();
```

## File Structure

```
src/
├── utils/
│   └── auth-redirect.js          # Auth redirect handler
├── login.html                     # Login/signup with OTP
├── complete-signup.html           # First-time onboarding
├── quran.html                     # Main app (checks signup status)
└── tv.html                        # TV app (skips onboarding)

supabase-migrations/
└── create-profiles-table.sql      # Database schema

netlify/functions/
└── verify-otp.js                  # Sets registration_source
```

## Testing

### Test Email Signup

1. Go to http://localhost:8000/login.html
2. Sign up with email
3. Verify OTP
4. Should see `/complete-signup.html`
5. Complete signup
6. Should go to `/quran.html`
7. Log out and log back in
8. Should go directly to `/quran.html` (no onboarding)

### Test Google Signup

1. Go to http://localhost:8000/login.html
2. Click "Sign in with Google"
3. Authenticate
4. Should go directly to `/quran.html` (no onboarding)
5. Profile should have Google avatar

### Test TV Registration

1. Register via tv.html
2. Should skip onboarding
3. Go directly to TV content

## Troubleshooting

### Profile not created

**Check trigger exists:**
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Manually create profile:**
```sql
SELECT public.handle_new_user();
```

### Always shows complete-signup

**Check profile status:**
```sql
SELECT email, has_completed_signup, registration_source
FROM profiles
WHERE email = 'user@example.com';
```

**Manually mark as completed:**
```sql
UPDATE profiles
SET has_completed_signup = true
WHERE email = 'user@example.com';
```

### No default avatar

**Check avatar URL:**
```sql
SELECT
    email,
    avatar_url,
    public.get_default_avatar(display_name) as default_avatar
FROM profiles;
```

## Security

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only view/update own profile
- ✅ Service role has full access
- ✅ Automatic timestamps
- ✅ Email uniqueness enforced
- ✅ Registration source validation

## Migration from Old System

If you have existing users without profiles:

```sql
-- Backfill profiles for existing users
INSERT INTO public.profiles (id, email, full_name, display_name, registration_source, has_completed_signup)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
    CASE
        WHEN raw_user_meta_data->>'provider' = 'google' THEN 'google'
        ELSE 'email'
    END,
    true  -- Mark existing users as completed
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.users.id
);
```

## Future Enhancements

- [ ] Profile picture upload
- [ ] Username uniqueness
- [ ] Bio/description field
- [ ] Social media links
- [ ] Email preferences
- [ ] Privacy settings
- [ ] Account deletion
