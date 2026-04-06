<div align="center">

<img src="src/assets/images/TafsirKurd.png" width="120" alt="TafsirKurd Logo" />

# TafsirKurd — تەفسیر کورد

**The complete Quran platform for Kurdish Muslims**

[![Version](https://img.shields.io/badge/version-2.0.0-1f5f4a?style=flat-square)](https://github.com/tafsirkurd/TafsirKurd)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-blue?style=flat-square)](https://tafsirkurd.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.x-119EFF?style=flat-square&logo=capacitor)](https://capacitorjs.com)
[![Cloudflare Pages](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-F38020?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)

[🌐 Website](https://tafsirkurd.com) · [📱 Android](https://play.google.com/store/apps/details?id=com.tafsirkurd.app) · [🍎 iOS](https://apps.apple.com/us/app/tafsirkurd/id6760433688) · [🔗 All Links](https://tafsirkurd.com/links)

</div>

---

## Overview

TafsirKurd is a full-featured Quran reading and learning app built specifically for Kurdish Muslims. It provides the complete Holy Quran with Kurdish Tafsir (interpretation), prayer times, Islamic content, and a rich multimedia experience — all in a fast, offline-capable hybrid app.

---

## Features

### Quran
- Complete Quran (114 Surahs, 6,236 verses)
- Kurdish Tafsir (تەفسیرا کوردی) for every verse
- Multiple Arabic reciters with audio playback
- Verse-by-verse navigation and bookmarks
- Copy with attribution, share, and notes
- Reading progress tracking across devices

### Prayer & Islamic Tools
- Accurate daily prayer times (GPS-based)
- Adhan (call to prayer) with multiple voice options
- Qibla direction
- Islamic calendar
- Dhikr & Dua library (Gencine)

### IslamVoice
- Kurdish Islamic video series and episodes
- Built-in video player with progress tracking
- Save episodes for later
- Series organized by category and speaker

### Platform
- **Native Android & iOS** via Capacitor 8
- **Progressive Web App** at tafsirkurd.com
- Offline-capable with smart caching
- RTL (right-to-left) layout throughout
- Dark mode support
- Push notifications (FCM)
- Deep link navigation from notifications

---

## Tech Stack

| Layer | Technology |
|---|---|
| App Framework | [Capacitor 8](https://capacitorjs.com) (hybrid native) |
| Frontend | Vanilla JS, HTML5, CSS3 — no framework |
| Backend | [Supabase](https://supabase.com) (Postgres + Auth + Storage) |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com) |
| Edge Functions | Cloudflare Pages Functions |
| Push Notifications | Firebase Cloud Messaging (FCM HTTP v1) |
| iOS CI/CD | [Codemagic](https://codemagic.io) |
| Android Build | Gradle + ADB |
| Fonts | Scheherazade New, custom Surah Name font |

---

## Project Structure

```
TafsirKurd/
├── src/                        # Web source (served by Cloudflare Pages)
│   ├── app/
│   │   ├── app.js              # Main app entry — all tab logic, state, routing
│   │   └── index.html          # App shell — splash, tabs, all inline CSS
│   ├── assets/
│   │   ├── images/             # Logo, favicons, social cards
│   │   └── videos/             # Splash animation
│   ├── data/
│   │   ├── quran.json          # Full Quran (114 surahs)
│   │   └── kurdish_tafsir.json # Kurdish interpretation data
│   ├── dhikr/                  # Dhikr & Dua (Gencine) module
│   ├── prayer/                 # Prayer times module (API, cache, UI)
│   ├── css/                    # Shared stylesheets
│   ├── utils/                  # Auth, translations, security helpers
│   └── admin-*.html            # Admin panel pages
├── functions/                  # Cloudflare Pages Functions (edge API)
│   ├── admin-notifications-api.js   # Push notification management
│   ├── push-notifications.js        # FCM broadcast endpoint
│   └── popup-config.js              # App config endpoint
├── android/                    # Android native project (Capacitor)
├── ios/                        # iOS native project (Capacitor)
├── scripts/                    # Build & release scripts
│   └── release-android.sh      # Android release + auto-notify
├── database/                   # SQL schemas and migrations
├── codemagic.yaml              # iOS CI/CD pipeline
└── wrangler.toml               # Cloudflare config
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  User Device                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Android  │  │   iOS    │  │ Browser  │  │
│  │   APK    │  │   IPA    │  │   PWA    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       └──────────────┴─────────────┘        │
│              Capacitor 8 WebView            │
└───────────────────┬─────────────────────────┘
                    │ HTTPS
        ┌───────────┴───────────┐
        │    Cloudflare Pages   │
        │  tafsirkurd.com       │
        │  + Edge Functions     │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │       Supabase        │
        │  Postgres + Auth      │
        │  + Storage + RLS      │
        └───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │  Firebase (FCM)       │
        │  Push Notifications   │
        └───────────────────────┘
```

---

## Admin Panel

A full-featured admin panel is included at `/admin-*` routes (access-controlled):

| Page | Purpose |
|---|---|
| `admin-dashboard` | Overview, stats, quick actions |
| `admin-notifications` | Send & schedule push notifications, templates |
| `admin-islamvoice-management` | Manage video series and episodes |
| `admin-gencine` | Manage Dhikr categories, Duas, and Hadiths |
| `admin-translations` | Live translation editing (i18n) |
| `admin-users` | User management |
| `admin-analytics` | App usage analytics |
| `admin-features` | Feature flags and app config |

---

## Push Notifications

Notifications are sent via FCM HTTP v1 API using a Google Service Account JWT, signed with `crypto.subtle` (no Node.js dependencies — runs natively on Cloudflare Workers).

**Flow:**
1. Admin creates notification in panel → stored in Supabase
2. Cloudflare Edge Function fetches tokens from `push_tokens` table
3. Signs JWT, gets OAuth2 access token from Google
4. Sends to all tokens in parallel via FCM
5. Stale tokens auto-removed on `NOT_FOUND` / `UNREGISTERED` responses

**Deep links** from notification taps navigate directly to:
- Specific Quran verse (`verse:surah:ayah`)
- IslamVoice episode
- Gencine book
- Prayer times
- App update prompt

---

## iOS Build

iOS builds are handled by **Codemagic** (cloud Mac):

```
codemagic.yaml → mac_mini_m1 instance
  → npm install (exact Capacitor 8 versions)
  → cap sync ios
  → Inject GoogleService-Info.plist
  → CocoaPods install
  → Xcode build + sign
  → Upload to App Store Connect (TestFlight)
```

---

## Android Release

```bash
bash scripts/release-android.sh
```

Builds release APK, pauses for Play Store upload, then sends push notification to all users announcing the update.

---

## Environment Variables

Set in Cloudflare Pages dashboard (secrets):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access to Supabase |
| `FCM_SERVICE_ACCOUNT` | Firebase service account JSON |
| `FCM_PROJECT_ID` | Firebase project ID |
| `PUSH_SECRET` | Shared secret for push endpoint auth |

---

## App Info

| | |
|---|---|
| Bundle ID | `com.tafsirkurd.app` |
| iOS App ID | `id6760433688` |
| Firebase Project | `tafsirkurd-13867` |
| Cloudflare Project | `tafsirkurd` |
| Team ID (Apple) | `8KA7UDSC9D` |

---

<div align="center">

Built with care for the Kurdish Muslim community 🕌

</div>
