# TafsirKurd Release Guide

## Architecture Overview

Both Android and iOS are built from **one Capacitor codebase**. The `src/` directory is the single source of truth.

```
src/                          <-- You edit code here (Windows)
  ├── app/index.html          <-- Main app shell
  ├── app/app.js              <-- Core app logic
  ├── i18n/kmr.json           <-- All UI strings (edit this to change text)
  ├── i18n/i18n.js            <-- Translation loader
  ├── data/quran.json          <-- Quran data
  ├── data/kurdish_tafsir.json <-- Tafsir data
  └── ...                     <-- All other HTML, CSS, JS, fonts, images

npm run cap:sync              <-- Copies src/ to both platforms + verifies
  ├── android/app/src/main/assets/public/   (exact copy of src/)
  └── ios/App/App/public/                   (exact copy of src/)
```

After `cap sync`, a verification script (`scripts/verify-assets.js`) automatically:
1. Deletes any leftover `.gz` files from platform dirs
2. Compares SHA-256 hashes of critical files between `src/` and both platform copies
3. Fails with an error if any file is missing or mismatched

---

## Versioning Rules

Use the **same version string** for both platforms.

| Field | Format | Example | Where |
|-------|--------|---------|-------|
| Version string | semver (MAJOR.MINOR.PATCH) | `1.2.0` | Both platforms |
| Android `versionName` | Same as version string | `"1.2.0"` | `android/app/build.gradle` |
| Android `versionCode` | Integer, +1 each release | `3` | `android/app/build.gradle` |
| iOS `MARKETING_VERSION` | Same as version string | `1.2.0` | Xcode > General |
| iOS `CURRENT_PROJECT_VERSION` | Integer, +1 each release | `3` | Xcode > General |

**Rule:** `versionCode` and `CURRENT_PROJECT_VERSION` must always increment. They do NOT need to match each other (Android and iOS stores track independently), but keeping them in sync is simpler.

---

## Release Checklist

### On Windows (Development)

1. **Edit code** in `src/` (UI, features, fixes)
2. **Edit `src/i18n/kmr.json`** if any UI text changed
3. **Bump versions:**
   - `android/app/build.gradle`: increment `versionCode`, update `versionName`
   - iOS versions: will be set in Xcode on Mac
4. **Sync to both platforms:**
   ```
   npm run cap:sync
   ```
   This runs `npx cap sync` + `scripts/verify-assets.js`. Watch for the verification output — all files must show `OK`.

### Android Release

5. **Build signed AAB:**
   ```
   cd android
   JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab`

6. **Upload to Google Play Console:**
   - Go to Google Play Console > Your App > Production > Create new release
   - Upload `app-release.aab`
   - Add release notes
   - Submit for review

### iOS Release (on Mac)

7. **Push code to Git** (so you can pull on Mac)
8. **On Mac: pull latest code**, then:
   ```
   npm run cap:sync
   ```
9. **Open Xcode:**
   ```
   npx cap open ios
   ```
10. **Set version numbers** in Xcode:
    - Select `App` target > General tab
    - Set `Version` (MARKETING_VERSION) to match Android (e.g., `1.2.0`)
    - Set `Build` (CURRENT_PROJECT_VERSION) to next integer
11. **Select a real device or "Any iOS Device"** as build target
12. **Archive:** Product > Archive
13. **Distribute:** Window > Organizer > select archive > Distribute App > App Store Connect
14. **Submit for review** in App Store Connect

---

## Data Sync Summary

### Storage Architecture

All user data is stored in **localStorage** (WebView storage). This works identically on Android, iOS, and web — Capacitor's WebView preserves localStorage across app launches.

### What's Stored Locally

| Data | localStorage Key | Type |
|------|-----------------|------|
| Current surah | `currentSurah` | int |
| Current ayah | `currentAyah` | int |
| Scroll position | `scrollPosition` | int |
| Bookmarks | `bookmarks` | JSON array |
| Daily goal | `dailyGoal` | int |
| Monthly goal | `monthlyGoal` | int |
| Reading streak | `readingStreak` | int |
| Total ayahs read | `totalAyahsRead` | int |
| Completed surahs | `completedSurahs` | JSON array |
| Reading history | `readingHistory` | JSON array |
| Theme | `theme` | string |
| Font size | `fontSize` | string |
| Arabic font | `arabicFont` | string |
| Show translation | `showTranslation` | bool |
| Show tafsir | `showTafsir` | bool |
| Auto scroll | `autoScroll` | bool |
| Notifications enabled | `notificationsEnabled` | bool |
| Reminder times | `reminderTimes` | JSON array |

### Cloud Sync (Supabase)

**File:** `src/utils/cloud-sync.js`

- **Not logged in:** All data stays local only
- **Logged in:** `CloudSync` class syncs ALL of the above fields to/from the Supabase `user_data` table
- Sync is automatic on login and periodic during use
- Same code runs on both platforms — no platform-specific sync logic

---

## iOS App Store Requirements

### App Icon
- **Required:** 1024x1024 PNG (no transparency, no rounded corners, no alpha channel)
- Place in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Xcode generates all required sizes from this single image

### Background Audio (Quran/IslamVoice playback)
When ready to enable audio playback while the app is backgrounded:
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the `App` target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Background Modes**
6. Check **Audio, AirPlay, and Picture in Picture**

> Do NOT manually edit Info.plist for this. Use Xcode's Signing & Capabilities UI. Only enable after confirming it's needed via real-device testing.

### Push Notifications (future)
When ready to add push notifications:
1. In Xcode: Signing & Capabilities > + Capability > Push Notifications
2. Create an APNs key in Apple Developer Portal
3. Configure the key in your push notification service

### Privacy Policy
- Required by Apple for apps that collect any data or have login
- Already exists at: `src/privacy-policy.html` / `https://tafsirkurd.com/privacy-policy.html`
- Provide this URL in App Store Connect under "App Privacy"

### App Review Notes
- If login is required to access features: provide a demo account
  ```
  Email: demo@tafsirkurd.com
  Password: [your demo password]
  ```
- Mention that the app works offline and does not require login for core Quran reading

### Content Rights
- Apple may ask about content rights for religious text
- Quran text is public domain
- Tafsir/translation content: be prepared to confirm you have rights

---

## Platform Parity Checklist

Run through this checklist after every release to confirm iOS and Android are identical.

### Core Screens
- [ ] App opens to Quran tab (or onboarding on first launch)
- [ ] All 5 tabs visible: Quran, IslamVoice, Goals, Bookmarks, Settings
- [ ] Tab switching works

### Quran Reader
- [ ] Surah list loads with Arabic names + Kurdish translation
- [ ] Tap surah opens reader with Arabic text + Kurdish tafsir
- [ ] Scroll through ayahs works
- [ ] Audio playback works (play/pause/next)
- [ ] Bookmarking an ayah works

### IslamVoice
- [ ] Video/audio content loads from server
- [ ] Playback works

### Goals
- [ ] Create a new goal
- [ ] Mark goal progress
- [ ] Delete a goal
- [ ] Empty state shows correct text

### Bookmarks
- [ ] Saved bookmarks appear
- [ ] Tap bookmark navigates to ayah
- [ ] Delete bookmark works
- [ ] Empty state shows correct text

### Settings
- [ ] Dark mode toggle works
- [ ] Font size change works
- [ ] All settings labels show in Badini (from kmr.json)

### i18n / Text
- [ ] All UI text renders in Kurdish Badini
- [ ] No raw translation keys visible (e.g., `tabs.quran` showing instead of actual text)
- [ ] Toast messages appear in Badini
- [ ] Confirm dialogs appear in Badini

### Login / Profile
- [ ] Login flow works (Supabase auth)
- [ ] Profile shows user info
- [ ] Logout works
- [ ] Data syncs to cloud when logged in

### Offline
- [ ] Turn on airplane mode
- [ ] App still loads (service worker cache)
- [ ] Quran reading works offline
- [ ] Bookmarks accessible offline

### Platform-Specific
- [ ] StatusBar color matches app theme on both platforms
- [ ] No white flash on app launch (splash screen works)
- [ ] Back button works on Android (hardware back)
- [ ] Swipe back works on iOS
