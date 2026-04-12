# TafsirKurd — System Technical Documentation

> **Living document.** Every bug fix, feature, or refactor must be reflected here.
> Update the relevant section AND append an entry to Section 9 (Change Log).
>
> Last updated: 2026-04-06 (sections 10–15 added)

---

## Table of Contents

1. [App Architecture Overview](#1-app-architecture-overview)
2. [Core Systems](#2-core-systems)
3. [Data Flow](#3-data-flow)
4. [APIs and Services](#4-apis-and-services)
5. [State Management](#5-state-management)
6. [Lifecycle Flows](#6-lifecycle-flows)
7. [High-Risk Areas](#7-high-risk-areas)
8. [Known Safeguards Already in Place](#8-known-safeguards-already-in-place)
9. [Change Log](#9-change-log)
10. [Critical Files Map](#10-critical-files-map)
11. [Feature Ownership Map](#11-feature-ownership-map)
12. [Known Production Dependencies](#12-known-production-dependencies)
13. [Manual QA Checklist](#13-manual-qa-checklist)
14. [Removed / Deprecated Systems](#14-removed--deprecated-systems)
15. [Platform Notes](#15-platform-notes)

---

## 1. App Architecture Overview

### Platform
- **Capacitor 8.x** hybrid Android app (also targets iOS)
- Vanilla JavaScript, no framework, no build step
- RTL layout (`dir="rtl"`) — CSS flexbox first-child = rightmost
- Primary entry: `src/app/index.html` + `src/app/app.js`
- All code runs inside a single IIFE in `app.js` wrapped in `(function(){ 'use strict'; })()`

### How the App Boots

```
index.html loads
  │
  ├── Anti-flash script (inline in <head>): reads theme from localStorage,
  │   sets --bg CSS var before any render to prevent white flash
  │
  ├── Scripts loaded in order:
  │     supabase-js CDN
  │     i18n/kmr-bundled.js     ← bundled translations (offline-safe)
  │     i18n/i18n.js            ← window.t() translation function
  │     prayer/prayer.cache.js
  │     prayer/prayer.logic.js
  │     prayer/prayer.api.js
  │     prayer/prayer.notifications.android.js
  │     prayer/prayer.ui.js
  │     dhikr/dhikr.js          ← GencineUI
  │     quran/search.js         ← QuranSearch
  │     rating.js               ← AppRating
  │     app.js                  ← main app, calls init() at bottom
  │
  └── DOMContentLoaded → init() runs
```

**`init()` sequence (app.js line ~570):**
1. `_loadBookmarks()` — loads bookmark map into memory before any render
2. Version check (`app_v === '3'`) — migrates stale font-size caches if upgrading
3. Audio element listeners set once (`ended`, `error`, `waiting`, `playing`, `pause`)
4. `applyTheme()` + `applySizes()` + `applyKeepAwake()`
5. `initTodayVerses()` — builds today's read-ayah Set from localStorage
6. `AppRating.init()` — increments launch counter
7. `renderSurahGrid()` + `renderContinue()` — first visible render
8. Pull-to-refresh setup for all 7 panels
9. `loadQuranData()` — fetches `/data/quran.json`
10. `loadTafsirData()` — fetches `/data/kurdish_tafsir.json`
11. `initSupabase(cb)` — fetches config, creates Supabase client, checks auth session
12. Capacitor `appStateChange` listener registered (background/foreground handler)
13. Deep link handler (`appUrlOpen`) for iOS widget tap → prayer tab
14. LocalNotification tap handler → deep link to ayah or video
15. Startup background tasks (delayed):
    - 400ms: `initScheduleOnStart()` — athan scheduling
    - 800ms: `ForceUpdate.check()` — update banner
    - 1200ms: `initDailyVerse()`, `scheduleStreakReminder()`
    - 2000ms: `prefetchAllCities()` — cache all cities' prayer times
    - 3500ms: `PrayerUI.preloadAthanVoices()`

### How Tabs / Navigation Work

**Tab bar:** 6 primary tabs — `quran`, `prayer`, `gencine`, `islamvoice`, `settings`, plus virtual tabs `bookmarks` and `goals` (share the quran tab button).

**`App.tab(name)` — tab switch logic:**
1. `tapGuard('tab', 200)` — debounce, ignores double-taps within 200ms
2. **Same tab re-tap behavior:**
   - Quran: if inside surah → scroll to top, second tap → back to grid
   - IslamVoice: if inside series → scroll to top, second tap → back to home
   - Gencine: if inside sub-view → scroll to top, second tap → go home
   - Others: scroll to top
3. **Different tab:**
   - End read session if leaving quran mid-surah
   - Stop prayer countdown + pause sky animations if leaving prayer
   - Clear quran search, disconnect badge observer if leaving quran
   - Force-close all position:fixed overlays: tasbih picker, rec-picker, About sheet, Reader settings
   - Update `S.tab`, push old tab to `S.tabHistory`
   - Hide all `.panel` elements, show target panel (cached NodeList)
   - Update tab button active states (cached)
4. **Lazy renders with hash guards (`_renderHash`):**
   - bookmarks, goals, islamvoice, settings only rebuild when their hash changes
   - Prayer: deferred behind `requestAnimationFrame` (heavy DOM)
   - Gencine: hash-guarded

**Hash system:** Each tab has a `_tabHash(name)` function that serialises the state that would affect rendering. If hash matches `_renderHash[name]`, skip rebuild.

### Global State (S)

`S` is a plain object defined at the top of app.js (line ~529). It is the single source of runtime truth. Anything that should survive app restart is mirrored in localStorage; anything runtime-only lives only in `S`.

Full breakdown in [Section 5](#5-state-management).

### Rendering Flow

Most renders follow this pattern:

```
User action / tab switch
  │
  ├── Check _renderHash — if unchanged, skip
  │
  ├── Read from S.* / localStorage
  │
  ├── Build DOM using pure DOM methods (no innerHTML — security policy)
  │   el(), on(), icon(), clear() helper functions
  │
  └── Append to container, update _renderHash
```

**No virtual DOM, no diffing.** Renders are full re-builds of the target container, protected by hash guards to avoid unnecessary work.

---

## 2. Core Systems

### 2.1 Quran + Tafsir System

**Data files (bundled in app assets):**
- `/data/quran.json` — Object with string keys `{"1":[...], "2":[...]}`, each value is an array of ayah objects: `{a: ayahNum, ar: arabicText, ku: kurdishText}`
- `/data/kurdish_tafsir.json` — Either flat array (`{surah, ayah, kurdish_tafsir}`) or pre-grouped array of `{verses:[]}`. Normalised by `groupTafsirBySurah()` into a 0-indexed array where index 0 = Surah 1.

**Load sequence:**
- Both files fetched at startup via `fetch()` (no cache header — Capacitor serves from bundled assets)
- Stored in `S.quranData` and `S.tafsirData`
- `_dataReady` flags (`quran`, `tafsir`) gate functions that need both

**Surah rendering — two modes:**
1. **List mode** (`#ayahList`) — default. Renders ayahs as a scrollable list with Arabic text, Kurdish translation, tafsir toggle.
2. **Mushaf mode** (`#mushafView`) — page-by-page Quran layout using QCF fonts. Font loaded dynamically from Al-Quran Foundation GitHub raw files per-page.

**Read progress tracking:**
- Per-surah: `surah_read_v3_{n}` in localStorage — Set of ayah numbers read in the current session
- `S.todayVerses` — Set of `surah:ayah` strings read today (for daily goal counting)
- `_progressCleanup` — IntersectionObserver watches ayahs scrolling past 60% viewport height → marks as read

**Tafsir access:**
- `getAyahTafsirText(surahNum, ayahNum)` — canonical function. Reads from `S.tafsirData[surahNum-1].verses`, finds matching verse. Used by both list mode and mushaf tafsir sheet.
- Cross-surah mushaf tafsir correctly uses this function (fixed in stability audit).

**Audio system:**
- Single `<audio id="audioEl">` element set up once at init
- Reciter URLs: `https://cdn.alquran.cloud/media/audio/ayah/{reciterId}/{surahNum}{ayahNum3digit}.mp3` format (varies by reciter)
- Prefetch: `_pfCache` — looks ahead 3 ayahs using XHR, creates object URLs
- Blob URLs revoked on play (`_blobToRevoke`)
- Repeat modes: `single` (repeat surah), `verse` (repeat single ayah N times), `none`

**Search:**
- Handled by `src/quran/search.js` → `window.QuranSearch`
- Index built once at startup via `setTimeout(0)` — precomputes normalised Arabic + Kurdish for all 6236 verses
- `query(q, quranData)` — returns ranked results in <5ms on mid-range Android
- Supports: Arabic text, Kurdish text, surah name aliases (EN/transliteration), direct references (`2:255`, `2/255`, `baqarah 255`)
- Called from `App.onSearch()` with 150ms debounce

### 2.2 Prayer System

**Files:**
- `prayer/prayer.cache.js` — localStorage read/write/metadata
- `prayer/prayer.api.js` — fetch, validate, background refresh
- `prayer/prayer.logic.js` — time parsing, next prayer, countdown format
- `prayer/prayer.notifications.android.js` — athan scheduling, channel management
- `prayer/prayer.ui.js` — panel rendering, countdown, settings sheet

**Data source:**
- Primary: `tafsirkurd.com/prayer-kurd?city=X&year=Y&month=M` (CF function proxying amozhgary.tv — official Kurdistan timetable)
- Fallback: `api.aladhan.com/v1/timings/{ts}?...&method=13` (Diyanet, per-day, not cached)

**Cache:**
- Key: `prayer-kurd2:{city}:{year}:{month}` in localStorage
- Value: `{ days: { 1:{Fajr,Sunrise,...}, 2:{...}, ... }, _meta: { fetchedAt, source, city, year, month } }`
- One entry covers a full month — at most 1 network request per city per month
- No TTL — entries expire naturally as month key changes
- `_meta.fetchedAt` used for stale detection (threshold: 6 hours)

**Fetch flow:**
1. Check localStorage for month key
2. Cache hit → return `days[today]` immediately
3. Cache miss → fetch from CF function → validate (≥80% days must have valid HH:MM) → write with metadata → return today's data
4. Fetch fail → fall through to Aladhan fallback

**Background refresh (`PrayerAPI.backgroundRefresh`):**
- Called after every fast-path cache render
- If `_meta.fetchedAt` age > 6 hours: fires a silent fetch
- In-flight guard (`_bgInFlight[mkey]`) — only one fetch per month key at a time
- If today's timings changed: updates cache, rebuilds UI panel, reschedules athan
- If unchanged: updates `fetchedAt` silently, no UI change

**Next-month prefetch:**
- `_prefetchNextMonthIfNearEnd(city, year, month, day)` — triggered after any successful primary fetch
- If `day >= 25` and next month not cached: fire-and-forget fetch + write
- Also handled by `prefetchAllCities()` in `prayer.ui.js` for all 20 cities

**Athan scheduling (`prayer.notifications.android.js`):**
- Schedules **7 days × 5 prayers = up to 35 notifications** at once
- ID formula: `100 + (dayOffset × 5) + PRAYER_IDX[name]` → IDs 100–134
- One Android notification channel per athan voice (`athan_{voiceId}`) pointing to `res/raw/athan_{voiceId}.mp3`
- Mutex: `withSchedulingLock` — prevents concurrent cancel+schedule races
- `_doSchedule` guard: checks `prayerAthanEnabled` before proceeding (catches toggled-off during mutex queue)
- `initScheduleOnStart()` rate-limited to once per 15 minutes (via `prayerLastScheduleTs`)

**Debug info stored in localStorage:**
- `lastPrayerFetchAt` — timestamp of last successful fetch
- `lastPrayerSource` — `kurd`, `kurd-bg`, `kurd-prefetch`, or `aladhan`
- `lastPrayerMonthKey` — e.g. `prayer-kurd2:Duhok:2026:4`
- `prayerLastScheduleDate`, `prayerLastScheduleCount`, `prayerLastScheduleCity`
- `prayerAthanFireLog` — JSON array of scheduled notification details

**Time handling:**
- All times from API are Baghdad local (UTC+3, no DST)
- Parsed as `new Date(dateISO + 'T' + HH + ':' + MM + ':00+03:00')`
- "Today" always computed as Baghdad date: `new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Baghdad'})`
- Countdown uses `Date.now()` (device clock) — no server time dependency

### 2.3 Tasbih / Dhikr System (GencineUI)

**File:** `src/dhikr/dhikr.js` — single `GencineUI` object, IIFE

**Sections rendered by `GencineUI._draw()`:**
- `home` — section picker grid
- `adhkar` — morning/evening/sleep/etc. dhikr cards
- `dua` — duas list
- `tasbih` — counter with voice recognition
- `asma` — 99 names of Allah
- `books` — PDF/audio books

**Tasbih counter:**
- State: `_tasbihCount`, `_tasbihTarget` (33/99/100/infinite), `_tasbihDhikrIdx`
- Ring: SVG circle with `stroke-dashoffset` driven by `_updateRing()`
- Tap button: `_tasbihTap()` → increment + haptic + save state
- Picker sheet: `position:fixed`, `opacity:0/pointer-events:none` base (NOT translateY — uses overlay approach), `.on` class shows it
- Picker list scroll: set via `pickerList.scrollTop` before adding `.on` (no document scroll jump)

**Voice recognition:**
- Uses `window.SpeechRecognition` / `window.webkitSpeechRecognition`
- `continuous:true`, `interimResults:true`, `lang:'ar-SA'`
- Count matching via `_countMatches(transcript)`:
  - Pre-check: long dhikrs (≥4 words) require a non-common word from the second half to be present — prevents counting on partial speech
  - S0: `dhikr.key` exact word match (most distinctive word)
  - S1: full phrase match
  - S2: no-space full phrase match (handles merged ASR transcripts)
  - S3: min-count across all keywords (complete repetitions)
  - S4: longest single keyword — only for single-keyword dhikrs
  - S5: majority keywords (≥70%) present → at least 1 count
- Debounce: `_voiceDebounceMs = 1200ms` between counts
- Auto-restart: `rec.onend` restarts after 300ms if `_voiceActive` still true

**Sheet lifecycle:**
- `_activeSheet` reference stored on GencineUI
- `GencineUI.closeSheet()` removes `.on` from active sheet
- `App.tab()` calls `GencineUI.closeSheet()` when leaving gencine tab
- `GencineUI._draw()` resets `_activeSheet = null` before DOM teardown

**Data sources:**
- `_getTasbih()` — returns `_dbTasbih` (from Supabase) or `DHIKR_LIST` (hardcoded fallback)
- Gencine content (hadith, duas, categories) fetched from Supabase with 6h localStorage cache keys: `gencine_cats_v5`, `gencine_duas_v1`, `gencine_hadiths_v1`

### 2.4 Auth System (Supabase)

**Initialisation (`initSupabase`):**
1. Read cached config from `localStorage('supa_cfg')`
2. If cached: create Supabase client immediately → `checkAuthSession()` (enables offline auth recovery)
3. Background fetch `tafsirkurd.com/config` → refresh config cache
4. If no cached config and fetch fails: app runs without auth

**Auth state machine:**
- `checkAuthSession()` calls `supabase.auth.getSession()` + registers `onAuthStateChange` listener
- `SIGNED_IN` event → `setUserFromSession()` → `startCloudSync()` → re-render settings
- `SIGNED_OUT` event → clear `S.user` → `stopCloudSync()` → re-render settings

**User object (`S.user`):**
```js
{
  id:       string,   // Supabase UUID
  email:    string,
  name:     string,   // from user_metadata.full_name
  avatar:   string|null,
  provider: string    // 'email' | 'google'
}
```

**Cloud sync (`syncToCloud` / `loadFromCloud`):**
- Triggered: on app background, on data changes, on sign-in
- Rate-limited: max once per 5 seconds (`S.lastSyncTime`)
- Guard: `S.isSyncing` flag prevents concurrent syncs
- Retry: exponential backoff starting at 2s, capped at 60s
- Data stored in Supabase `user_data` table as a single JSON blob (`app_data` column), keyed by `user_id`
- Merge strategies:
  - **Bookmarks**: union by `surah:ayah`, newest note wins on conflict
  - **readLog**: per-date max (keep highest ayah count)
  - **lastRead**: `FURTHEST` — take whichever is further in the Quran
  - **Settings**: LWW (last-write-wins based on `_syncTime`)

**Realtime sync:**
- `subscribeRealtime()` opens a Supabase Postgres changes channel for the user's row
- On remote update: echo detection (skip if `_syncTime` matches own last push), merge, apply, re-render current tab, show "synced" toast

**Account switch guard (`_clearUserLocalData`):**
- Clears all SYNC_SIMPLE_KEYS from localStorage
- Clears all `surah_progress_*`, `surah_scroll_*`, `surah_read_v3_*` keys
- Cancels scheduled notifications (reminder IDs 10–16, verse IDs 20–26, streak ID 30)
- Resets `S.*` in-memory state to defaults

### 2.5 Notifications System

**Notification ID allocation (no overlaps):**

| IDs | Purpose |
|-----|---------|
| 1 | (reserved) |
| 10–16 | Daily Quran reminder (7 days rolling) |
| 20–26 | Daily verse notification (7 days rolling) |
| 30 | Streak reminder |
| 50 | Force-update notification |
| 100–134 | Athan (7 days × 5 prayers) |
| 200 | Test notification |
| 1000+ | Foreground push re-display |

**Daily reminder (`scheduleReminder`):**
- Cancels IDs 10–16 first, then schedules 7 daily notifications at the user's chosen time
- Channel: `reminder` (importance 4, default notification sound)
- Extra: `{type:'verse', s, a}` → tap opens that ayah

**Daily verse (`scheduleDailyVerse`):**
- Waits for `S.quranData` + `S.tafsirData` to be ready (polls every 1.2s if not ready)
- Picks a weighted-random ayah from a curated set
- Schedules 7 days ahead, IDs 20–26
- Guarded by `dailyVerseScheduledDate` — skips if already scheduled today

**Athan:** See [Section 2.2 Prayer System](#22-prayer-system)

**Push notifications (Supabase + Capacitor):**
- Push tokens stored in `push_tokens` Supabase table
- Foreground pushes re-displayed as local notifications (IDs 1000+)
- Topics: `new_video`, `new_book`

### 2.6 Search System

**File:** `src/quran/search.js` → `window.QuranSearch`

**Index:** Built once at startup (`setTimeout(0)`) over all 6236 verses — precomputes normalised Arabic (`arN`) and Kurdish (`kuN`) for each verse.

**Query pipeline:**
1. `parseRef(q)` — detect direct references: `2:255`, `2/255`, `"baqarah 255"`
2. If surah name alias match → return surah result
3. Score all 6236 verses via `scoreVerse(q, verse)`:
   - Arabic exact phrase match (highest)
   - Arabic starts-with match
   - Arabic token match
   - Kurdish match
4. Filter `score > 0`, sort descending, return top results
5. Debounce at call site: 150ms (`App.onSearch`)

**State:** `S.search` — current query string. Cleared on tab leave.

**UI:** `#searchBar` (toggle), `#searchInput`, `#searchResults`. Hidden when not on Quran tab.

### 2.7 Bookmarks / Progress Tracking

**Bookmarks storage:**
- localStorage key: `app_bookmarks` — JSON array of `{surah, ayah, note, ts, color}`
- In-memory map: `_bmMap` — keyed by `surah:ayah` for O(1) lookup during surah render
- Cloud synced via `user_data.app_data.app_bookmarks` (union merge)

**Read progress:**
- `surah_progress_{n}` — scroll position (ayah index) for each surah
- `surah_read_v3_{n}` — Set of ayah numbers read this session (for progress bar)
- `lastRead` — `{surah, ayah, ts}` — most recently read position (shown in "Continue" card)

**Daily goals:**
- `readingGoal` — number of ayahs to read per day
- `readLog` — JSON object `{"YYYY-MM-DD": count}` — ayahs read per day
- `readAyahsToday` — integer counter for today
- `S.todayVerses` — runtime Set of `surah:ayah` read today (prevents double-counting)
- `readSessions` — array of `{start, end, surah, ayahsRead}` — reading session history

**Streaks:**
- `bestStreak`, computed from `readLog`
- `scheduleStreakReminder()` — fires ID 30 if user hasn't read today, at 9pm

---

## 3. Data Flow

### Where data comes from

| Data | Source | Format |
|------|--------|--------|
| Quran text | Bundled `/data/quran.json` | Object `{"1":[ayahs], ...}` |
| Tafsir | Bundled `/data/kurdish_tafsir.json` | Array, grouped by surah |
| Prayer times | `tafsirkurd.com/prayer-kurd` (primary) / Aladhan (fallback) | Monthly `{days:{...}}` |
| Gencine content | Supabase tables | Fetched + cached 6h in localStorage |
| Translations | `kmr-bundled.js` (bundled) + Supabase `translations` table | Key-value map |
| User data | Supabase `user_data` table | Single JSON blob per user |
| Site settings | Supabase `site_settings` table | Key-value, cached in `_ssMemory` |
| Videos | Supabase `islamvoice` tables | Fetched on-demand, cached per session |
| App config | `tafsirkurd.com/config` | JSON, cached in `supa_cfg` |

### How it is cached

| Data | Cache location | Key | TTL |
|------|---------------|-----|-----|
| Prayer times | localStorage | `prayer-kurd2:{city}:{year}:{month}` | None (month key changes) |
| Prayer metadata | localStorage | Same key `._meta` | Checked against 6h threshold |
| Gencine categories | localStorage | `gencine_cats_v5` | 6 hours |
| Gencine duas | localStorage | `gencine_duas_v1` | 6 hours |
| Gencine hadiths | localStorage | `gencine_hadiths_v1` | 6 hours |
| Supabase config | localStorage | `supa_cfg` | Refreshed on every startup |
| Update config | localStorage | `tk_update_cfg_v2` | Refreshed on every foreground |
| Quran data | `S.quranData` (runtime only) | — | Session |
| Tafsir data | `S.tafsirData` (runtime only) | — | Session |
| Site settings | `_ssMemory` (module-level) | — | Session |
| Translation overrides | localStorage | `i18n_kmr_{hash}` | Version-keyed |

### How it updates

- **Prayer times:** Background refresh every 6h+ (silent, no spinner)
- **Gencine content:** Checked on every section open; fetches if TTL expired
- **User data:** Real-time Supabase channel + manual sync on background
- **Quran/Tafsir:** Never re-fetched in session (bundled assets)
- **Translations:** Checked against remote on startup; bundled fallback always available

### How UI gets updated

1. **Direct re-render:** `renderBookmarks()`, `renderGoals()`, `renderSettings()` etc. rebuild their container
2. **Hash-guard:** Only re-renders when `_tabHash()` changes
3. **In-place update:** Prayer countdown (`tickCountdown`), ring SVG (`_updateRing`), audio icon (`setAudioIcon`)
4. **Realtime:** `applySyncData()` → `renderCurrentTab()` on Supabase push

---

## 4. APIs and Services

### tafsirkurd.com (Cloudflare Functions — your own)

| Endpoint | Called when | Cached | Fallback |
|----------|------------|--------|---------|
| `/config` | App startup (initSupabase) | `supa_cfg` in localStorage | Use cached |
| `/prayer-kurd?city&year&month` | Prayer tab open, month cache miss, background refresh | localStorage per month | Aladhan API |
| `/update-config` | Every foreground resume (debounced 30s) | `tk_update_cfg_v2` | Use cached |
| `/get-location` | Location tracking (analytics) | One-time per session | None |
| `/track-location` | After geolocation acquired | No | None |
| `/google-analytics` | Admin dashboard only | Server-side | None |
| `/search-console` | Admin dashboard only | No | None |
| `/geo-analytics` | Admin dashboard only | No | None |
| `/delete-account` | Account deletion flow | No | None |

### Supabase

| Usage | Called when | Notes |
|-------|------------|-------|
| `auth.getSession()` | App startup | JWT from localStorage |
| `auth.onAuthStateChange` | Continuous listener | Sign in/out events |
| `user_data` upsert | App background, data changes | Max once per 5s |
| `user_data` select | Sign-in | Load + merge cloud data |
| Realtime channel | After sign-in | Echo-detected, merged |
| `site_settings` | Settings tab, About sheet | Cached in `_ssMemory` |
| Gencine tables | Section open | 6h localStorage cache |
| `functions/v1/delete-account` | Delete account flow | — |

### api.aladhan.com

- Called only as **prayer times fallback** when primary CF function fails
- Per-day request, not cached
- Method 13 = Diyanet (Turkish Religious Affairs)
- Uses hardcoded lat/lon per city

### Google APIs (admin only)

- YouTube Data API v3: playlist import, video duration batch fetch
- Google OAuth: login with Google
- Google Analytics: via your CF proxy

### Cloudflare Services

- **Turnstile:** Admin login bot protection
- **R2:** Profile picture / image storage

### CDN Dependencies

| Resource | URL | Loaded |
|----------|-----|--------|
| supabase-js | cdn.jsdelivr.net | At startup |
| Chart.js | cdn.jsdelivr.net | Admin only |
| Lucide icons | unpkg.com | Admin only |
| CropperJS | cdn.jsdelivr.net | Admin image upload |
| Quranic fonts | raw.githubusercontent.com/alquran-foundation | On mushaf page open |
| Google Fonts (Inter) | fonts.googleapis.com | Page load |

### Capacitor Native Plugins

| Plugin | Used for | Notes |
|--------|---------|-------|
| LocalNotifications | Athan, daily reminder, verse, streak, update, push re-display | IDs 10-16, 20-26, 30, 50, 100-134, 1000+ |
| App | foreground/background state, URL open | `appStateChange`, `appUrlOpen` |
| StatusBar | Theme-aware status bar color | Set on every theme change |
| Browser | Open external links | Capacitor in-app browser |
| PushNotifications | Receive push tokens | Token stored in Supabase |
| InAppReview | Smart review prompt | Rate-limited by AppRating |
| Haptics | Feedback on taps, counters | `haptic([ms,...])` |

---

## 5. State Management

### S.* — All Major Fields

```js
// Navigation
S.tab            // string: 'quran'|'prayer'|'gencine'|'islamvoice'|'settings'|'bookmarks'|'goals'
S.tabHistory     // array: stack of previous tab names

// Quran
S.surah          // null | number: currently open surah
S.mushafMode     // bool: page-mode vs list-mode (persisted)
S.quranData      // null | Object: loaded quran.json {"1":[...], ...}
S.tafsirData     // null | Array: 0-indexed array of {verses:[{verse,text}]}
S.showTafsir     // bool: show/hide tafsir below ayahs (persisted)
S.glyphVerses    // Object: mushaf glyph data per page (mushaf mode)
S.readerFont     // string: 'hafs'|'warsh'|... (persisted)
S.mushafFont     // string: 'qcf1'|'qcf4' (persisted)
S.mushafFontSize // number (persisted per font)
S.mushafLineH    // number (persisted)
S.copy           // {surah, ayah, rangeFmt}: copy/share state

// Audio
S.audio = {
  el,            // HTMLAudioElement ref
  playing,       // bool
  surah,         // number
  ayah,          // number
  speed,         // float (persisted: app_speed)
  repeatMode,    // 'none'|'single'|'verse' (persisted: app_repeat)
  repeatCount,   // number (persisted: app_repeatCount)
  currentRepeat  // runtime counter
}

// Repeat mode state
S.rm = {
  mode, playCount, verseRepeat, delay, isPlaying, currentPlay
}

// UI
S.sidebar        // bool: sidebar open
S.sidebarMode    // 'surah'|'bookmark'|...
S.search         // string: current search query (runtime)

// Bookmarks view
S.bmSort         // 'newest'|'oldest'|'surah'
S.bmSearch       // string

// Goals
S.goalYear, S.goalMonth  // calendar state

// Settings
S.theme          // 'light'|'dark'|'sakina'|'noor' (persisted)
S.arSize         // float: Arabic font size (persisted: app_arSize)
S.tfSize         // float: tafsir font size (persisted: app_tfSize)
S.lineH          // float: line height (persisted: app_lineH)
S.bgAudio        // bool: keep audio in background (persisted)
S.keepAwake      // bool: prevent screen sleep (persisted)
S.autoAdvance    // bool: auto-next surah on audio end (persisted)
S.scrollFollowsAudio // bool (persisted)
S.hapticFeedback // bool (persisted)

// Notifications
S.dailyReminder  // bool (persisted)
S.reminderTime   // 'HH:MM' (persisted)
S.dailyVerse     // bool (persisted)
S.dailyVerseTime // 'HH:MM' (persisted)

// Prayer
S.prayerCity     // string (persisted)
S.prayerMethod   // int, ignored (kept for compat) (persisted)
S.prayerAthanEnabled // bool (persisted)
S.prayerToggles  // Object {Fajr:bool, ...} (persisted)

// IslamVoice
S.ivSupabase     // Supabase client for islamvoice (different credentials)
S.ivSeries       // null | Array: loaded series
S.ivEpisodes     // null | Array: loaded episodes
S.ivCurrentSeries // null | object: series being viewed
S.ivLoading      // bool
S.ivInited       // bool
S.ivSearchQuery  // string
S.ivSpeakerFilter // null | string

// Auth / Cloud sync
S.supabase       // Supabase client instance
S.user           // null | {id, email, name, avatar, provider}
S.syncInterval   // setInterval ID
S.isSyncing      // bool: cloud sync in progress
S.lastSyncTime   // timestamp: last sync
S.realtimeChannel // Supabase realtime channel

// Reading session
S.readSession    // null | {start, surah}
S.todayVerses    // null | Set of 'surah:ayah' strings

// Wizard (onboarding)
S.wizardStep     // int
S.wizardData     // Object
```

### Persisted (localStorage) — Key Reference

| localStorage key | S.* field | Notes |
|-----------------|-----------|-------|
| `theme` | `S.theme` | |
| `mushafMode` | `S.mushafMode` | |
| `showTafsir` | `S.showTafsir` | |
| `bgAudio` | `S.bgAudio` | |
| `keepAwake` | `S.keepAwake` | |
| `autoAdvance` | `S.autoAdvance` | |
| `scrollFollowsAudio` | `S.scrollFollowsAudio` | |
| `hapticFeedback` | `S.hapticFeedback` | |
| `app_arSize` | `S.arSize` | |
| `app_tfSize` | `S.tfSize` | |
| `app_lineH` | `S.lineH` | |
| `app_speed` | `S.audio.speed` | |
| `app_repeat` | `S.audio.repeatMode` | |
| `app_repeatCount` | `S.audio.repeatCount` | |
| `app_reciter` | — | reciter ID |
| `app_bookmarks` | — | JSON array |
| `lastRead` | — | `{surah, ayah, ts}` |
| `prayerCity` | `S.prayerCity` | |
| `prayerAthanEnabled` | `S.prayerAthanEnabled` | |
| `prayerToggles` | `S.prayerToggles` | JSON |
| `dailyReminder` | `S.dailyReminder` | |
| `reminderTime` | `S.reminderTime` | |
| `dailyVerse` | `S.dailyVerse` | |
| `dailyVerseTime` | `S.dailyVerseTime` | |
| `surah_progress_{n}` | — | scroll position |
| `surah_read_v3_{n}` | — | read ayahs Set |
| `readingGoal` | — | int |
| `readLog` | — | `{"YYYY-MM-DD": count}` |
| `readAyahsToday` | — | int |
| `supa_cfg` | — | Supabase credentials |
| `_lastSyncTime` | — | ISO string |
| `prayer-kurd2:*` | — | Monthly prayer cache |
| `lastPrayerFetchAt` | — | debug |
| `lastPrayerSource` | — | debug |
| `lastPrayerMonthKey` | — | debug |
| `prayerLastScheduleTs` | — | athan rate limit |
| `prayerLastScheduleDate` | — | debug |
| `athanChannelVer` | — | channel version |

### Runtime-Only (S.* — not persisted)

- `S.quranData`, `S.tafsirData` — loaded from assets each session
- `S.supabase`, `S.user` — recreated from localStorage JWT each session
- `S.isSyncing`, `S.lastSyncTime`, `S.realtimeChannel`
- `S.ivSeries`, `S.ivEpisodes`, `S.ivCurrentSeries`, `S.ivLoading`
- `S.sidebar`, `S.search`, `S.wizardStep`, `S.wizardData`
- `S.todayVerses`, `S.readSession`
- `S.audio.el`, `S.audio.playing`, `S.audio.currentRepeat`
- `S.tabHistory`, `S.copy`

---

## 6. Lifecycle Flows

### App Startup

```
Cold start
  │
  ├── Anti-flash (inline CSS sets theme background)
  ├── Scripts load sequentially
  ├── init() runs:
  │     _loadBookmarks()
  │     applyTheme / applySizes
  │     renderSurahGrid() ← first frame visible
  │     loadQuranData() + loadTafsirData() ← async, background
  │     initSupabase() ← async, background
  │
  ├── 400ms: initScheduleOnStart() ← athan scheduling
  ├── 800ms: ForceUpdate.check()
  ├── 1200ms: initDailyVerse(), scheduleStreakReminder()
  ├── 2000ms: prefetchAllCities()
  └── 3500ms: preloadAthanVoices()
```

### Tab Switch

```
User taps tab
  │
  ├── tapGuard(200ms) — ignore rapid taps
  ├── Same tab? → scroll/back logic only
  ├── Different tab:
  │     End read session (if on quran)
  │     Stop prayer countdown / sky animations (if leaving prayer)
  │     Clear search (if leaving quran)
  │     Close all position:fixed overlays
  │     S.tab = name, S.tabHistory.push(old)
  │     Panel DOM show/hide (cached NodeLists)
  │     Tab button active state update
  │     Hash check → rebuild if stale
  └── Tab-specific init (PrayerUI.render, GencineUI.render, etc.)
```

### Background → Foreground

```
Capacitor appStateChange {isActive: true}
  │
  ├── ForceUpdate.check()
  ├── initTodayVerses() ← refresh date-based Set
  ├── PrayerUI.initScheduleOnStart() ← reschedule athan if >15min
  ├── PrayerUI.render() (if on prayer tab) ← fixes overnight stale date
  ├── PrayerUI.pushWidgetIfStale()
  ├── pushGoalDataToWidget()
  ├── syncWidgetTranslations()
  ├── initDailyVerse()
  ├── scheduleStreakReminder()
  ├── checkNewVideoNotif()
  ├── checkNewBookNotif()
  └── prefetchAllCities() ← retry any missing caches
```

### Login

```
User signs in (email or Google)
  │
  ├── Supabase auth.onAuthStateChange fires: SIGNED_IN
  ├── setUserFromSession(session) → S.user populated
  ├── _renderHash.settings = null → force settings re-render
  ├── startCloudSync():
  │     loadFromCloud() ← download + merge remote data
  │     applySyncData(merged) ← write to localStorage + S.*
  │     renderCurrentTab()
  │     subscribeRealtime() ← open Postgres changes channel
  │     Start sync interval (30s)
  └── If on settings tab: renderSettings()
```

### Logout / Account Switch

```
User signs out or different account detected
  │
  ├── Supabase auth.onAuthStateChange fires: SIGNED_OUT
  │   OR: new user's ID differs from stored data
  │
  ├── _clearUserLocalData():
  │     Remove all SYNC_SIMPLE_KEYS
  │     Remove surah_progress_*, surah_read_v3_*
  │     Cancel notifications (IDs 10-16, 20-26, 30)
  │     Reset S.* defaults
  │
  ├── S.user = null
  ├── stopCloudSync() + unsubscribeRealtime()
  └── Re-render settings
```

### Data Refresh

```
Pull-to-refresh on any tab
  │
  ├── Prayer tab → PrayerUI.refresh():
  │     Clears monthly cache
  │     Keeps current display alive (stale-while-revalidate)
  │     Fetches fresh data → rebuilds panel
  │     Does NOT reschedule athan (initScheduleOnStart owns that)
  │
  ├── Quran tab → renderSurahGrid() + renderContinue()
  ├── Bookmarks → renderBookmarks()
  ├── Goals → renderGoals()
  ├── IslamVoice → App.ivRefresh()
  ├── Settings → renderSettings()
  └── Gencine → GencineUI.refresh()
```

---

## 7. High-Risk Areas

### Async Races

| Risk | Location | Mitigation |
|------|---------|-----------|
| Two athan schedules racing: cancel while second hasn't started yet | `prayer.notifications.android.js` | `withSchedulingLock` mutex |
| Background refresh + initScheduleOnStart overlap | `prayer.api.js` + `prayer.ui.js` | Mutex queues second caller |
| Multiple `backgroundRefresh` calls for same month | `prayer.api.js` | `_bgInFlight[mkey]` in-flight guard |
| Supabase config not ready when first tab renders | `app.js initSupabase` | `supa_cfg` localStorage allows immediate client creation |
| `scheduleDailyVerse` called before quranData loaded | `app.js` | Polls every 1.2s until `S.quranData && S.tafsirData` |
| Cloud sync triggered while already syncing | `syncToCloud` | `S.isSyncing` guard |
| Realtime echo triggering unnecessary re-render | `subscribeRealtime` | `_syncTime` echo detection |

### Event Listener Leaks

| Risk | Location | Mitigation |
|------|---------|-----------|
| `#ayahList` click handlers accumulating on re-open | `app.js` | `list._clickSetup` flag — attaches once |
| `_attachSheetDrag` touchstart on closed sheet | `app.js` | `if(!sheet.classList.contains('open')) return` guard |
| `appStateChange` listener added multiple times | `app.js init()` | Only called once at startup inside `init()` |
| Voice recognition `onresult` accumulating | `dhikr.js` | Old `rec` object replaced by `self._recognition = null` + `abort()` |

### Observer Leaks

| Risk | Location | Mitigation |
|------|---------|-----------|
| `_progressCleanup` IntersectionObserver not disconnected | `app.js` | Disconnected in `_progressCleanup()` on surah close |
| `_surahBadgeObs` running while off quran tab | `app.js` | Disconnected in `App.tab()` when leaving quran |
| `_mushafLazyObs` not disconnected on navigation | `app.js` | Disconnected in mushaf cleanup path |

### Overlays / Bottom Sheets

All `position:fixed` sheets that were previously hidden via `translateY(100%)` have been migrated to `display:none` base + `slideUp` animation on open. This fixes Android WebView hit-testing (layout box, not transform position).

**Current sheet inventory:**

| Sheet | Element | Hidden by | Opened by |
|-------|---------|-----------|-----------|
| Audio full player | `#fullPlayer` | `display:none` | `App.openFP()` |
| Reciter picker | `#recPicker` | `display:none` + inline | `App.openRecPicker()` |
| Reader settings | `#qsSheet` | `display:none` + inline | `App.openReaderSettings()` |
| About sheet | `#cfgSheet` (dynamic) | `display:none` + inline | `openAboutSheet()` |
| Tasbih picker | `.tasbih-picker-sheet` | `opacity:0; pointer-events:none` | `openSheet()` in GencineUI |
| Prayer settings | `.prayer-settings-overlay` | `visibility:hidden` | PrayerUI |
| Mushaf tafsir | `#mushafTafsirSheet` (dynamic) | Created+removed | mushaf ayah tap |
| Mushaf settings | `#mushafSettingsSheet` (dynamic) | Created+removed | `App.openMushafSettings()` |
| IV speaker picker | `.iv-spk-overlay` (dynamic) | Created+removed | `App.showIvSpeakerPicker()` |

**All dynamic overlays** (mushaf tafsir, mushaf settings, IV speaker picker) are created and removed from the DOM on each open/close — no persistent ghost element.

### Other Risks

- **`scrollIntoView` inside position:fixed sheets** — scrolls the document body, not the sheet container. All instances must use `container.scrollTop = ...` instead.
- **`translateY(100%)` on minimal-height elements** — if element has no content yet, 100% is nearly 0px. All sheets must use `display:none` as the hidden state.
- **Audio blob URLs** — `_blobToRevoke` must be revoked on play and on error to prevent memory leaks.

---

## 8. Known Safeguards Already in Place

### Locks / Mutexes

| Safeguard | Location | Protects |
|-----------|---------|---------|
| `withSchedulingLock` | `prayer.notifications.android.js` | Prevents concurrent athan cancel+schedule |
| `S.isSyncing` flag | `app.js syncToCloud` | Prevents concurrent cloud sync |
| `_bgInFlight[mkey]` | `prayer.api.js` | Prevents duplicate background refreshes |
| `tapGuard(name, ms)` | `app.js` | Debounces rapid repeated taps |
| `_fuBtnBusy` | `app.js ForceUpdate` | Prevents double-tap on update button |

### Guards / Early Returns

| Guard | Location | Prevents |
|-------|---------|---------|
| `if(!S.quranData \|\| !S.tafsirData)` | multiple | Operations on unloaded data |
| `if(!S.supabase \|\| !S.user)` | sync functions | Sync without auth |
| `if(now - S.lastSyncTime < 5000)` | `syncToCloud` | Over-frequent sync |
| `if(now - lastTs < 15 * 60 * 1000)` | `initScheduleOnStart` | Over-frequent athan reschedule |
| `if(!sheet.classList.contains('open'))` | `_attachSheetDrag` | Ghost touches on closed sheets |
| `if(S.surah !== surahNum \|\| !nav.parentNode)` | `renderFrame` RAF | Crash on rapid surah navigation |
| `if(_bgInFlight[mkey]) return` | `backgroundRefresh` | Duplicate in-flight fetches |
| `_doSchedule` athan-enabled check | `prayer.notifications.android.js` | Schedule after toggle-off during mutex queue |
| `if(incomingTime === myLastSync) return` | `subscribeRealtime` | Realtime echo |

### Cleanup Functions

| Function | Cleans up |
|---------|-----------|
| `_clearUserLocalData()` | All user-specific localStorage, notification IDs 10-16/20-26/30, S.* defaults |
| `_progressCleanup()` | IntersectionObserver + progress timer |
| `stopCloudSync()` | Sync interval + retry timer + realtime channel |
| `unsubscribeRealtime()` | Supabase realtime channel |
| `clearPrefetch()` | All XHR aborts + object URL revocations |
| `GencineUI._stopVoice()` | SpeechRecognition abort + state reset |
| `GencineUI.closeSheet()` | Active tasbih picker sheet |
| `App.closeRecPicker()` | Overlay + picker, inline display:none |
| `App.closeReaderSettings()` | QS sheet, inline display:none |
| `closeCfgSheet()` | About sheet, inline display:none |
| `PrayerUI.stopCountdown()` | Countdown interval + gyro RAF |

### Validation

| Validation | Location | Checks |
|-----------|---------|--------|
| `_validateMonthly(data, year, month)` | `prayer.api.js` | ≥80% days present, all 6 prayers valid HH:MM |
| `_isValidHHMM(s)` | `prayer.api.js` | Regex + hour/minute range |
| `tSafe(key)` | `app.js` | Returns null if translation key missing |
| `_bmMap` O(1) lookup | `app.js` | Prevents O(n) scan during surah render |

---

## 10. Critical Files Map

| File | Owns |
|------|------|
| `src/app/app.js` | Everything: tab navigation, S state, all feature logic, auth, bookmarks, audio, notifications, cloud sync. ~7 000 lines. |
| `src/app/index.html` | All HTML structure + all CSS (inline `<style>`). No separate stylesheet. |
| `src/prayer/prayer.api.js` | Prayer data fetching, validation, background refresh, next-month prefetch. |
| `src/prayer/prayer.cache.js` | Prayer localStorage read/write with metadata envelope. |
| `src/prayer/prayer.logic.js` | Prayer time parsing, next-prayer calculation, countdown formatting. |
| `src/prayer/prayer.notifications.android.js` | Athan LocalNotification scheduling, channel management, scheduling mutex. |
| `src/prayer/prayer.ui.js` | Prayer tab panel rendering, countdown display, city/settings UI, widget data push. |
| `src/dhikr/dhikr.js` | GencineUI: all Tasbih/dhikr tab sections (home, adhkar, dua, tasbih, asma, books). |
| `src/quran/search.js` | QuranSearch: search index build, query scoring, result ranking. |
| `src/i18n/i18n.js` | `window.t()` translation function, i18n loading and override mechanism. |
| `src/i18n/kmr.json` | Kurdish (Kurmanji) translation strings — source of truth for all UI text. |
| `src/rating.js` | AppRating: launch counter, smart in-app review prompt rate-limiting. |
| `data/quran.json` | Full Quran text (Arabic + Kurdish translation). Bundled asset, never re-fetched. |
| `data/kurdish_tafsir.json` | Kurdish Tafsir for all verses. Bundled asset. |
| `functions/` | Cloudflare Workers: `/prayer-kurd`, `/config`, `/update-config`, and admin proxies. |
| `android/` | Capacitor Android native project. Do not edit JS files here — they are copied from `src/` by `cap sync`. |

---

## 11. Feature Ownership Map

| Feature | Primary file | Secondary |
|---------|-------------|-----------|
| Quran reader — list mode | `app.js` | — |
| Quran reader — mushaf mode | `app.js` | `raw.githubusercontent.com` (QCF fonts) |
| Tafsir display | `app.js` | `data/kurdish_tafsir.json` |
| Audio playback + prefetch | `app.js` (`S.audio`, `_pfCache`) | `cdn.alquran.cloud` |
| Quran search | `quran/search.js` | `app.js` (calls it) |
| Bookmarks | `app.js` (`_bmMap`) | Synced via Supabase |
| Reading goals / streaks | `app.js` | — |
| Prayer times display + countdown | `prayer/prayer.ui.js` | `prayer/prayer.logic.js` |
| Prayer times data + cache | `prayer/prayer.api.js` | `prayer/prayer.cache.js` |
| Athan scheduling | `prayer/prayer.notifications.android.js` | `prayer/prayer.ui.js` (triggers it) |
| Tasbih counter | `dhikr/dhikr.js` | — |
| Dhikr + voice recognition | `dhikr/dhikr.js` | — |
| Gencine content (hadith / dua) | `dhikr/dhikr.js` | Supabase gencine tables |
| IslamVoice (video series) | `app.js` | Supabase `islamvoice` tables |
| Settings UI | `app.js` | — |
| Auth / sign-in | `app.js` (`initSupabase`) | Supabase auth |
| Cloud sync | `app.js` (`syncToCloud`) | Supabase `user_data` |
| Translations | `i18n/i18n.js` | `i18n/kmr.json` |
| Daily reminder notifications | `app.js` | `Capacitor.LocalNotifications` |
| Daily verse notifications | `app.js` | `data/quran.json` |
| Streak reminder | `app.js` | — |
| In-app review prompt | `rating.js` | `app.js` (calls `AppRating.init()`) |
| Force-update check | `app.js` (`ForceUpdate`) | `tafsirkurd.com/update-config` |
| Widget data push | `prayer/prayer.ui.js` + `app.js` | Native Capacitor plugin |
| Admin panel | `src/admin-*.html` | Supabase direct (own credentials) |

---

## 12. Known Production Dependencies

Services that are critical for core app function, ordered by impact if unavailable:

| Service / Endpoint | Purpose | Impact if down | Fallback |
|-------------------|---------|---------------|---------|
| Bundled assets (`data/*.json`) | Quran + Tafsir text | App unusable — Quran tab empty | None — local file |
| `cdn.jsdelivr.net` (supabase-js) | Supabase client JS library | Auth + sync + Gencine all broken | None (script must load) |
| Supabase project | Auth, user data, Gencine content, IslamVoice | Login + sync fail; Gencine/IV show empty | App works offline for Quran and Prayer |
| `tafsirkurd.com/prayer-kurd` | Monthly prayer times | No prayer data on cache miss | Aladhan API fallback |
| `tafsirkurd.com/config` | Supabase project credentials | Auth broken on cache miss | `supa_cfg` localStorage cache |
| `api.aladhan.com` | Prayer times fallback only | Silent (stale cache still shown) | Stale localStorage cache |
| `cdn.alquran.cloud` | Quran audio MP3s | No audio playback | Silent failure — UI still works |
| `raw.githubusercontent.com` (alquran-foundation) | Mushaf QCF fonts per-page | Mushaf mode shows blank pages | Only mushaf mode affected |
| `tafsirkurd.com/update-config` | Force update banner check | No update prompt | Cached config used |

**Resilience summary:**
- Quran reading and prayer display work fully offline once caches are warm.
- `cdn.jsdelivr.net` failing to load supabase-js is the highest-impact single-point failure (auth + sync + Gencine all stop).
- Prayer times are double-buffered: monthly localStorage cache → Aladhan per-day fallback.
- The app should never crash on any single service failure — each path has a guard or silent failure.

---

## 13. Manual QA Checklist (Real-Device Release)

Run on physical Android device before each production release. All items must pass.

### Quran
- [ ] Home grid loads all surahs, surah names readable
- [ ] Open any surah — Arabic + Kurdish text renders, no layout overflow
- [ ] Tafsir toggle expands and collapses without layout jump
- [ ] Audio plays, tapping next ayah advances playback
- [ ] Mushaf mode opens correct page, QCF fonts load (not blank)
- [ ] Bookmarks save on tap; appear in Bookmarks tab
- [ ] Search returns results for both Arabic and Kurdish queries
- [ ] Pull-to-refresh on Quran tab does not crash

### Prayer
- [ ] Prayer tab shows correct times for selected city
- [ ] Countdown ticks live; active prayer highlighted
- [ ] Pull-to-refresh fetches fresh data and rebuilds panel
- [ ] Change city → times update immediately
- [ ] Background → foreground: countdown resumes with correct prayer (overnight: next-day times load)
- [ ] Enable athan → verify a test notification fires with correct sound

### Tasbih / Dhikr
- [ ] Counter increments on tap with haptic feedback
- [ ] Picker opens scrolled to active item (no visible scroll jump)
- [ ] Voice recognition counts short dhikr: say "سبحان الله" three times → counter = 3
- [ ] Voice recognition does NOT count before phrase is complete: say "لا حوله ولا" (half phrase) → counter = 0
- [ ] Switch tab mid-voice → voice stops, no ghost sheet visible

### Ghost Touch Regression (Bottom Sheets)
- [ ] Open Tasbih tab → tap where "شێواز" reader-settings sheet would appear in Quran tab → nothing opens
- [ ] Open Quran tab → tap where reciter picker would appear in Tasbih → nothing opens
- [ ] Switch any tab → About sheet does not appear behind content

### Notifications
- [ ] Enable daily reminder → fires at set time the next day
- [ ] Tap notification → opens correct ayah in Quran reader
- [ ] Disable notification → does not fire again

### Auth / Cloud Sync
- [ ] Sign in with email → bookmarks and settings load from cloud
- [ ] Add a bookmark → sign out → sign back in → bookmark still present
- [ ] (Two devices) Change setting on device A → appears on device B within ~30 seconds

### Settings
- [ ] Theme change applies immediately and persists after full app restart
- [ ] Arabic font size change applies and persists

---

## 14. Removed / Deprecated Systems

These were removed or superseded. Do not re-introduce these patterns.

| System / Key | Status | Replaced by | Notes |
|-------------|--------|------------|-------|
| `prayer2:{city}:{method}:{date}` localStorage | Removed | `prayer-kurd2:{city}:{year}:{month}` | Per-day cache replaced by full-month cache |
| `prayer3:{city}:{method}:{date}` localStorage | Deprecated (legacy compat key only) | `prayer-kurd2:*` | `prayer.cache.js` still exposes `key()` for compat; nothing writes to it anymore |
| `translateY(100%)` as hidden state for `position:fixed` sheets | Removed from all sheets | `display:none` base + `slideUp` animation on open | Caused ghost touches in Android WebView (hit-tests by layout box) |
| `S.prayerMethod` / `method` parameter in `fetchPrayerTimes()` | Ignored — kept for signature compat | Source is always amozhgary.tv (or Aladhan fallback) | Safe to pass any value; it is silently discarded |
| `app_v < '3'` font-size cache migration | One-time migration (complete) | `app_v = '3'` is current version | Migration code in `init()` can be deleted in a future cleanup pass |
| `gencine_cats_v1` – `v4` localStorage keys | Replaced by version bump | `gencine_cats_v5` | Old keys left to expire naturally; do not read them |
| `scrollIntoView()` inside `position:fixed` sheets | Removed | `container.scrollTop = item.offsetTop - container.offsetTop - ...` | `scrollIntoView` scrolls the document body, not the fixed container |
| `PrayerCache.write(mkey, data)` for monthly data | Replaced | `PrayerCache.writeWithMeta(mkey, data, meta)` | Old `write()` still exists on the object for per-day compat, but monthly writes must use `writeWithMeta` to include `_meta.fetchedAt` |

---

## 15. Platform Notes

### Android vs iOS Behavior Differences

| Area | Android | iOS |
|------|---------|-----|
| WebView hit-testing | By layout box (pre-transform position). `translateY(100%)` does NOT prevent touches on hidden elements. | Generally respects transform, but `display:none` is still the only safe pattern. |
| Notification channels | Required. One channel per athan voice (`athan_{voiceId}`). Channel name and sound visible in system settings. | Channels not supported — `channelId` is accepted but ignored by OS. |
| Notification sound | MP3 at `android/app/src/main/res/raw/athan_{voiceId}.mp3`, referenced by channel. | Sound file must be in Xcode bundle; configured separately. |
| Notification channel sound immutability | After creation, sound cannot be changed without deleting + recreating the channel. `athanChannelVer` localStorage key forces recreation on increment. | N/A — no channels. |
| Athan on silent mode | Determined at channel creation time by `importance` and `lockScreenVisibility`. The app cannot override at runtime after the channel exists. | Different silencing rules — always test on device. |
| In-App Review | Google Play In-App Review API (rate-limited by Play) | Apple StoreKit (different rate limits + approval window) |
| Status bar | `StatusBar.setBackgroundColor()` to match theme | `StatusBar.setStyle('DARK'/'LIGHT')` — background color not settable |
| Deep links (widget tap) | Custom URL scheme via intent filter | `appUrlOpen` fires when widget taps the custom URL; primary navigation path for iOS widget → prayer tab |

### Widgets

- **Android widget:** Implemented via a native Capacitor plugin. Data is pushed from the JS side via `pushWidgetData()` (prayer times) and `pushGoalDataToWidget()` (reading goals). Widget reads this shared data and renders natively.
- **iOS widget:** Separate Swift extension target. Reads data from App Group shared storage written by the app. Widget tap fires a deep link URL → caught by `appUrlOpen` Capacitor listener → navigates to prayer tab.
- **Widget data push triggers:** Prayer tab render, background→foreground resume (`pushWidgetIfStale()`), goal update.
- **Translation push:** `syncWidgetTranslations()` pushes translated strings to the native widget on every foreground resume so widget text matches the app language.
- **Stale widget guard:** `pushWidgetIfStale()` — only pushes if cached widget data is older than a threshold; avoids redundant native calls on every foreground.

### Local Notifications vs Push Notifications

| | Local Notifications | Push Notifications |
|-|--------------------|--------------------|
| **Scheduled by** | App JS via `Capacitor.LocalNotifications.schedule()` | Server (Supabase Edge Function) → FCM/APNs → device |
| **Works offline** | Yes — scheduled 7 days ahead | Requires network to receive |
| **Used for** | Athan (100–134), daily reminder (10–16), verse (20–26), streak (30), update banner (50) | New video alert, new book alert |
| **Foreground handling** | Capacitor shows them in-app if app is active | Re-displayed as a local notification (ID 1000+) by `PushNotifications` listener |
| **Token storage** | N/A | `push_tokens` Supabase table, keyed by `user_id` + `device_id` |
| **Tap action** | `localNotificationActionPerformed` → deep link by `extra.type` | Same handler via re-display as local notification |

### Android-Specific Caveats

- **Notification channel immutability:** Sound cannot be changed on an existing channel. To change the athan sound, increment `athanChannelVer` in localStorage — this forces `prayer.notifications.android.js` to delete and recreate the channel on next schedule.
- **Background audio focus:** `S.bgAudio` controls whether the app requests `AudioFocus`. If false, audio pauses when another app (e.g. a phone call) takes focus.
- **`position:fixed` ghost touches:** Always use `display:none` as the hidden state. See Section 7 for the full sheet inventory.
- **`cap sync` is required** after any change to `src/` before building — the Android project copies assets from `src/` during sync. Skipping this causes stale code to run.

---

## 9. Change Log

All changes appended in reverse-chronological order (newest first).

---

### 2026-04-06 — Phase 1: Audio persistent local cache (AudioCache)

**What changed:**

1. **New file `src/audio-cache.js`** — `window.AudioCache` module:
   - `getLocalUri(reciter, surah, ayah)` — synchronous O(1) lookup from in-memory `_uriMap`; returns `file://` URI or null
   - `saveBlob(reciter, surah, ayah, blob)` — converts Blob to base64, writes to `Filesystem.Cache/audio/{reciter}/{s3d}{a3d}.mp3`, registers URI in `_uriMap`, updates LRU manifest
   - `warmup()` — called 3 s after startup; reads manifest, stats each file, populates `_uriMap`, prunes stale entries
   - `startSurahBg(surah, fromAyah, reciter)` — after playback starts, quietly fetches + saves remaining ayahs of the current surah, one at a time, 800 ms apart, 2 s initial delay
   - `cancelBg()` — stops background caching (called on audioClose and reciter change)
   - LRU manifest in `localStorage('audio_cache_manifest_v1')`: `[{key, size, lastAccessed}]`; cap 300 MB; evicts oldest-accessed entries when exceeded

2. **`app.js` — `prefetchAyahBlob()` XHR `onload`:** After creating blob URL, also calls `AudioCache.saveBlob()` with the raw `xhr.response` Blob. Parses reciter/surah/ayah from the URL pattern.

3. **`app.js` — `playAyah()`:** Added priority chain:
   - Priority 1: `AudioCache.getLocalUri()` (synchronous) → use `file://` URI + `touchAccess()`
   - Priority 2: `_pfCache` blob (existing in-memory prefetch) — unchanged
   - Priority 3: remote URL (existing fallback) + a parallel `fetch().then(saveBlob)` to persist for next time

4. **`app.js` — `playAyah()` end:** Calls `AudioCache.startSurahBg(surah, ayah, RECITER)`

5. **`app.js` — `App.audioClose()`:** Calls `AudioCache.cancelBg()`

6. **`app.js` — reciter chip `onclick`:** Calls `AudioCache.cancelBg()` before switching reciter

7. **`app.js` — `init()`:** `setTimeout(AudioCache.warmup, 3000)`

8. **`index.html`:** Added `<script src="/audio-cache.js?v=20260406a">` before `app.js`

**Why:** Audio stopped immediately on network loss. The existing `_pfCache` is session-only blob URLs — nothing survived app close. This change makes every played ayah persist to `Filesystem.Cache` so future plays and offline sessions use local files. Background surah caching ensures the rest of the current surah is available before the user reaches it.

**Files affected:** `src/audio-cache.js` (new), `src/app/app.js`, `src/app/index.html`

---

### 2026-04-06 — Documentation improvement pass (sections 10–15)

**What changed:** Added six new reference sections to this document:
- §10 Critical Files Map — what each source file owns
- §11 Feature Ownership Map — which file/system is responsible for each app feature
- §12 Known Production Dependencies — services critical for app function, ordered by impact
- §13 Manual QA Checklist — real-device release checklist covering all major features
- §14 Removed / Deprecated Systems — old keys, patterns, and flows that must not be re-introduced
- §15 Platform Notes — Android vs iOS differences, widget architecture, local vs push notifications, Android-specific caveats

**Why:** The original document described how things work but lacked a quick-reference orientation layer. These sections make the document useful for release gates, onboarding, and avoiding regressions from removed patterns.

**Files affected:** `SYSTEM_DOCS.md` only

---

### 2026-04-06 — Prayer cache: background refresh in-flight guard

**What changed:** Added `_bgInFlight` object in `prayer.api.js` to prevent multiple concurrent `backgroundRefresh` fetch calls for the same month key. Lock is set before `fetch()` and released in the final `.then()` whether succeeded or failed.

**Why:** If `render()` was called twice rapidly (tab switch away and back) while cache was stale, both calls would pass the age check before either fetch resolved and wrote the new `fetchedAt`. This caused duplicate `onFreshData` callbacks and double athan reschedules (serialised by mutex but wasteful).

**Files affected:** `src/prayer/prayer.api.js` — `backgroundRefresh()`

---

### 2026-04-06 — Prayer cache/scheduling robustness pass

**What changed:**

1. `prayer.cache.js`: Added `writeWithMeta(key, data, meta)` and `readMeta(key)`. All cache writes now include `_meta: { fetchedAt, source, city, year, month }`.

2. `prayer.api.js`:
   - Added `_isValidHHMM()` + `_validateMonthly()` — rejects malformed server responses before caching (requires ≥80% of days to have all 6 valid HH:MM times).
   - Added `_storeDebugInfo(source, mkey)` — writes `lastPrayerFetchAt`, `lastPrayerSource`, `lastPrayerMonthKey` to localStorage on every fetch.
   - Added `_prefetchNextMonthIfNearEnd()` — when day ≥ 25, silently fetches next month in background.
   - Added `backgroundRefresh(city, dateISO, onFreshData)` — fires a silent cache re-fetch if `_meta.fetchedAt` age > 6 hours. Only calls `onFreshData` if today's timings actually changed (JSON comparison). Includes in-flight guard.

3. `prayer.ui.js`:
   - Fast-path cache render now calls `backgroundRefresh()` after displaying, with a callback that rebuilds panel + reschedules athan only if data changed.
   - `prefetchAllCities()` now uses `writeWithMeta()` so all prefetched entries get metadata.

**Why:** Make monthly cache more robust, debuggable, and self-healing. Old entries without `_meta` will be refreshed on first render and upgraded.

**Files affected:** `src/prayer/prayer.cache.js`, `src/prayer/prayer.api.js`, `src/prayer/prayer.ui.js`

---

### 2026-04-06 — Fix `.cfg-sheet` (About sheet) translateY ghost touch bug

**What changed:**

- `src/app/index.html`: `.cfg-sheet` CSS changed from `display:flex; transform:translateY(105%)` base to `display:none` base. `.cfg-sheet.open` now uses `display:flex; animation:slideUp`.
- `src/app/app.js`: `closeCfgSheet()` now sets `_cfgSheetEl.style.display='none'` inline. `openAboutSheet()` clears inline display before adding `.open`. `App.tab()` now calls `closeCfgSheet()` on every tab switch.

**Why:** Same root cause as rec-picker and qs-sheet bugs. `position:fixed` elements hidden via `translateY` are still hit-tested at their layout position in Android WebView. `display:none` is the only reliable solution.

**Files affected:** `src/app/index.html`, `src/app/app.js` — `closeCfgSheet()`, `openAboutSheet()`, `App.tab()`

---

### 2026-04-06 — Fix tasbih voice recognition premature counting

**What changed:**

- `src/dhikr/dhikr.js`: `_countMatches()` — three changes:
  1. **Pre-check for long dhikrs (≥4 words):** Before any matching, finds a non-common word from the second half of the dhikr phrase. If absent from transcript, returns 0 immediately.
  2. **S4 restricted to single-keyword dhikrs:** Was counting on just the longest keyword even for multi-keyword dhikrs. Now only runs when `kws.length === 1`.
  3. **S5 requires 70% keyword majority:** Was `any keyword present = count`. Now requires `hitCount >= Math.ceil(kws.length * 0.7)`.

**Why:** Voice recognition fires `isFinal` results on partial speech. For long dhikrs (e.g. "لا حوله ولا قوه إلا بالله"), the distinctive key word appears early and was triggering a count before the user finished saying the full phrase.

**Files affected:** `src/dhikr/dhikr.js` — `_countMatches()`

---

### 2026-04-06 — Fix tasbih picker list scroll jump on re-open

**What changed:**

- `src/dhikr/dhikr.js`: `openSheet()` — replaced `setTimeout(280, scrollIntoView({block:'center'}))` with pre-open `pickerList.scrollTop = (active.offsetTop - pickerList.offsetTop) - (pickerList.clientHeight - active.offsetHeight) / 2` before adding `.on` class.

**Why:** `scrollIntoView()` inside a `position:fixed` sheet scrolls the document body, not the sheet's scroll container. Setting `scrollTop` before the `.on` class is added means the list is already at the correct position when the sheet becomes visible — no visible snap.

**Files affected:** `src/dhikr/dhikr.js` — `openSheet()`

---

### 2026-04-06 — Fix `.qs-sheet` (Reader Settings) translateY ghost touch bug

**What changed:**

- `src/app/index.html`: `.qs-sheet` CSS changed from `display:flex; transform:translateY(100%)` base to `display:none` base. `.qs-sheet.on` now uses `display:flex; animation:slideUp`. Added `style="display:none"` to `#qsSheet` HTML element.
- `src/app/app.js`: `App.closeReaderSettings()` now sets `qs.style.display='none'` inline. `App.openReaderSettings()` now clears inline display before adding `.on`. `App.tab()` now calls `App.closeReaderSettings()` on every tab switch.

**Why:** Same root cause as rec-picker bug. "شێواز" (appearance settings) sheet was appearing at the bottom of the screen while in the Tasbih section because the sheet had full flex layout but was hidden only by transform.

**Files affected:** `src/app/index.html`, `src/app/app.js` — `App.openReaderSettings()`, `App.closeReaderSettings()`, `App.tab()`

---

### 2026-04-05 — Stability audit — multiple bug fixes

**What changed (summary):** Full audit of `app.js`, `dhikr.js`, `prayer.ui.js`. See `memory/project_stability_audit.md` for the complete list. Key fixes:

- BUG-5: Duplicate click handlers on `#ayahList` — `list._clickSetup` flag
- BUG-6: `renderFrame` RAF crash on rapid surah navigation — stale-surah guard
- BUG-7: Mushaf tafsir sheet empty cross-surah — use `getAyahTafsirText()`
- BUG-8: `scheduleDailyVerse` retry wrong state fields
- BUG-9: PDF reader stale-book race in dhikr.js
- BUG-10–13: `_clearUserLocalData` incomplete cleanup
- BUG-14: `_tabHash('settings')` dead state fields
- BUG-15: Prayer panel not rebuilt on overnight foreground resume
- BUG-16: `_tomorrowTimings` stale after date-change

**Files affected:** `src/app/app.js`, `src/dhikr/dhikr.js`, `src/prayer/prayer.ui.js`

---

### 2026-04-04 — Fix rec-picker (`#recPicker`) ghost touch + orphan bugs

**What changed:**

- `src/app/index.html`: `.rec-picker` and `.full-player` CSS changed to `display:none` base with `slideUp` animation on `.open`. Added `style="display:none"` to both HTML elements.
- `src/app/app.js`:
  - `App.closeRecPicker()` sets `display:none` inline
  - `App.openRecPicker()` clears inline display before opening
  - `App.closeFP()` now calls `App.closeRecPicker()`
  - `App.tab()` calls `App.closeRecPicker()` on every switch
  - `_attachSheetDrag` touchstart guard: `if(!sheet.classList.contains('open')) return`
  - `_attachSheetDrag` close path: `closeFn()` delayed 260ms after animation starts
- `src/dhikr/dhikr.js`: `GencineUI._draw()` calls `App.closeRecPicker()`. `GencineUI.closeSheet()` method added.

**Why:** "خواندەڤان" reciter picker appeared at the bottom of the screen inside the Tasbih section. Root cause: `translateY(100%)` doesn't hide elements with minimal height in Android WebView hit-testing. All `position:fixed` sheets must use `display:none` as their hidden state.

**Files affected:** `src/app/index.html`, `src/app/app.js`, `src/dhikr/dhikr.js`
