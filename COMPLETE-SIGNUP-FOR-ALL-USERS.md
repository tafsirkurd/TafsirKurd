# Complete Signup Required for ALL Users

## 🎯 What Changed?

**Before:** Only Email and Quran users went through complete-signup.html. Google and TV users skipped it.

**Now:** **ALL new users** (Google, Email, Quran, TV) must go through complete-signup.html first.

---

## 🔄 The New Flow

### For Users Coming from Quran Page:

1. User visits `quran.html`
2. Clicks login → Redirected to `login.html` (referrer detected automatically)
3. Signs up or logs in
4. **Redirected to `complete-signup.html`** ✅
5. Completes profile (name, preferences) or clicks "Skip"
6. **Redirected BACK to `quran.html`** 🎯

### For Users Coming from TV Page:

1. User visits `tv.html`
2. Clicks login button → Redirected to `login.html?source=tv`
3. Signs up or logs in
4. **Redirected to `complete-signup.html`** ✅
5. Completes profile (name, preferences) or clicks "Skip"
6. **Redirected BACK to `tv.html`** 🎯

### For Google OAuth Users:

**New behavior:** Even though Google provides name and avatar, users still go to complete-signup.html to set preferences (dark mode, font size, notifications, etc.)

1. User clicks "Continue with Google"
2. Google authentication completes
3. **Redirected to `complete-signup.html`** ✅ (NEW!)
4. Profile pre-filled with Google name and avatar
5. User can adjust preferences
6. **Redirected to origin page** (quran or tv)

---

## 🛠️ Technical Implementation

### 1. Source Detection (login.html)

```javascript
// Detects where user came from
const urlParams = new URLSearchParams(window.location.search);
const source = urlParams.get('source'); // ?source=tv or ?source=quran
const referrer = document.referrer; // Fallback: check referrer

// Determines redirect destination
let redirectDestination = '/quran.html'; // Default
if (source === 'tv' || referrer.includes('/tv.html')) {
    redirectDestination = '/tv.html';
}

// Stores for later use
sessionStorage.setItem('login_redirect_destination', redirectDestination);
```

### 2. Smart Redirect (auth-redirect.js)

```javascript
// Before: Special handling for Google/TV
if (profile.registration_source === 'google' || profile.registration_source === 'tv') {
    // Skip complete-signup
}

// After: ALL users go to complete-signup
if (!profile.has_completed_signup) {
    return { needsCompletion: true, redirectUrl: '/complete-signup.html' };
}
```

### 3. Return to Origin (complete-signup.html)

```javascript
// After completing signup, redirects to stored destination
const redirectUrl = sessionStorage.getItem('post_signup_redirect') || '/quran.html';
window.location.href = redirectUrl; // Returns to quran.html or tv.html
```

### 4. Database Function (Supabase)

```sql
-- Before: Conditional has_completed_signup
CASE
    WHEN reg_source = 'google' THEN true
    WHEN reg_source = 'tv' THEN true
    ELSE false
END

-- After: ALL users start with false
false  -- ALL users must complete signup
```

---

## 📋 What You Need to Do

### Step 1: Run Database Migration

Open Supabase SQL Editor and run:

```bash
# File: supabase-migrations/update-all-users-need-complete-signup.sql
```

This updates the `handle_new_user()` function to set `has_completed_signup = false` for all new users.

### Step 2: Test the Flow

**Test from Quran Page:**
1. Go to quran.html (not logged in)
2. Click login (or open login.html directly)
3. Sign up with a new email
4. ✅ Should go to complete-signup.html
5. Click "Skip" or complete profile
6. ✅ Should return to quran.html

**Test from TV Page:**
1. Go to tv.html (not logged in)
2. Click the login icon button
3. Sign up with a new email
4. ✅ Should go to complete-signup.html
5. Click "Skip" or complete profile
6. ✅ Should return to tv.html

**Test with Google OAuth:**
1. Open login.html
2. Click "Continue with Google"
3. Complete Google authentication
4. ✅ Should go to complete-signup.html (NEW!)
5. Profile pre-filled with Google data
6. ✅ Should return to quran.html (default)

---

## ✅ Benefits of This Change

1. **Consistent Onboarding:** All users have the same experience
2. **Preference Collection:** Can ask Google users for preferences (dark mode, font, etc.)
3. **Better UX:** Users return to where they started (quran or tv)
4. **Future-Proof:** Easy to add more onboarding steps later
5. **Data Completeness:** All users have complete profiles

---

## 🔍 How It Detects Source

**Priority Order:**
1. **URL Parameter** (highest priority): `?source=tv` or `?source=quran`
2. **Referrer Header**: Checks if referrer contains `/tv.html` or `/quran.html`
3. **Default**: `/quran.html` if neither is detected

**Examples:**
- User clicks login from tv.html → Referrer detected → Returns to tv.html
- Direct link: `login.html?source=tv` → URL param → Returns to tv.html
- Direct visit to login.html → No source → Returns to quran.html (default)

---

## 🚨 Important Notes

- **Existing users** are not affected (they already have `has_completed_signup = true`)
- **Only NEW signups** will go through this flow
- **Skip button** still works - users can skip complete-signup if they want
- **Backward compatible** - defaults to quran.html if source is unknown

---

## 🎯 Current Status

✅ **Code:** Fully implemented and committed
✅ **Database:** Migration ready to run
⏳ **Testing:** Needs manual testing
⏳ **Deployment:** Needs database migration execution

---

**Last Updated:** $(date +%Y-%m-%d)
**Status:** Ready for Testing
