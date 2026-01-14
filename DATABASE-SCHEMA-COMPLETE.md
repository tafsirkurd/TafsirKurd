# TafsirKurd Complete Database Schema Documentation

**Last Updated:** 2026-01-14
**Total Tables:** 25

---

## Table of Contents
1. [TV Content System](#tv-content-system)
2. [User Management](#user-management)
3. [Content Management](#content-management)
4. [Admin System](#admin-system)
5. [Analytics & Tracking](#analytics--tracking)
6. [Integration Status](#integration-status)

---

## TV Content System

### 1. tv_categories
**File:** `supabase-migrations/create-tv-categories-table.sql` ✅
**Purpose:** Organize TV series into categories (Tafsir, Islamic History, Lectures)

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
name            TEXT NOT NULL UNIQUE
description     TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Relationships:**
- Has many `tv_series` (one-to-many)

**Admin Integration:** ✅ Full CRUD in `admin-tv-management.html`

---

### 2. tv_series
**File:** `supabase-migrations/create-tv-series-table.sql` ✅
**Purpose:** TV series within categories

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
category_id     BIGINT NOT NULL → tv_categories(id) ON DELETE CASCADE
title           TEXT NOT NULL
description     TEXT
thumbnail_url   TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Relationships:**
- Belongs to `tv_categories` (many-to-one)
- Has many `tv_episodes` (one-to-many)

**Admin Integration:** ✅ Full CRUD in `admin-tv-management.html`

---

### 3. tv_episodes
**File:** `supabase-migrations/create-tv-episodes-table.sql` ✅
**Purpose:** Individual episodes within series

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
series_id       BIGINT NOT NULL → tv_series(id) ON DELETE CASCADE
episode_number  INTEGER
title           TEXT NOT NULL
video_url       TEXT NOT NULL
thumbnail       TEXT
duration        INTEGER (seconds)
views           INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

CONSTRAINT unique_episode_per_series UNIQUE(series_id, episode_number)
```

**Relationships:**
- Belongs to `tv_series` (many-to-one)

**Special Features:**
- View counter with `increment_episode_views()` function
- Public can update views (RLS policy)

**Admin Integration:** ✅ Full CRUD in `admin-tv-management.html` and `admin-videos.html`

---

### 4. tv_videos (AWS S3 System)
**File:** `supabase-migrations/create-tv-videos-table.sql` ✅
**Purpose:** AWS S3-hosted video management (separate from tv_episodes)

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
title           TEXT NOT NULL
description     TEXT
slug            TEXT UNIQUE
s3_key          TEXT NOT NULL
s3_bucket       TEXT NOT NULL
s3_region       TEXT NOT NULL
cloudfront_url  TEXT
thumbnail_url   TEXT
duration        INTEGER
file_size       BIGINT
video_format    TEXT
resolution      TEXT
category        TEXT
tags            TEXT[]
series_id       BIGINT
episode_number  INTEGER
is_published    BOOLEAN DEFAULT false
is_featured     BOOLEAN DEFAULT false
display_order   INTEGER DEFAULT 0
view_count      INTEGER DEFAULT 0
like_count      INTEGER DEFAULT 0
uploaded_by     TEXT
upload_date     TIMESTAMPTZ DEFAULT NOW()
published_at    TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ⚠️ Partial - Has utility (`admin-aws-video.js`) but needs dedicated admin page

---

### 5. tv_video_series (Optional Feature)
**File:** `supabase-migrations/create-tv-videos-table.sql` ✅
**Purpose:** Optional series organization for tv_videos

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
title           TEXT NOT NULL
description     TEXT
slug            TEXT UNIQUE
thumbnail_url   TEXT
is_active       BOOLEAN DEFAULT true
display_order   INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ❌ Not integrated

---

## User Management

### 6. user_data
**File:** `database/migrations/create_tv_user_data.sql` ✅
**Purpose:** User reading progress and TV watch history

**Schema:**
```sql
user_id         UUID PRIMARY KEY → auth.users(id)
currentPosition TEXT
readAyahs       TEXT[]
ayahsRead       INTEGER DEFAULT 0
stats           JSONB
completion      FLOAT DEFAULT 0
total_read      INTEGER DEFAULT 0
daily_goal      INTEGER DEFAULT 10
watch_progress  JSONB
bookmarks       JSONB
watch_history   JSONB
series_progress JSONB
continue_watching JSONB
preferences     JSONB
signupCompleted BOOLEAN DEFAULT false
profileCompleted BOOLEAN DEFAULT false
onboardingCompleted BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
lastActive      TIMESTAMPTZ
```

**Admin Integration:** ✅ Full view in `admin-users.html` and `admin-reading-stats.html`

---

### 7. profiles
**File:** `supabase-migrations/create-profiles-table.sql` ✅
**Purpose:** User profile information

**Schema:**
```sql
id                      UUID PRIMARY KEY → auth.users(id)
email                   TEXT
full_name               TEXT
display_name            TEXT
avatar_url              TEXT
registration_source     TEXT (quran/tv/google/email)
has_completed_signup    BOOLEAN DEFAULT false
first_login_at          TIMESTAMPTZ
preferences             JSONB
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Linked with user_data in `admin-users.html`

---

## Content Management

### 8. contact_messages
**File:** `database-schema.sql` ✅
**Purpose:** Contact form submissions

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
name        TEXT
email       TEXT
message     TEXT
status      TEXT (unread/read)
created_at  TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Full CRUD in `admin-messages.html`

---

### 9. featured_videos
**File:** `database-schema.sql` ✅
**Purpose:** Homepage featured videos (likely obsolete)

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
video_url   TEXT
position    INTEGER
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ❌ Not integrated (likely replaced by tv_videos system)

---

### 10. social_stats
**File:** `database-schema.sql` ✅
**Purpose:** Social media statistics for homepage

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
key             TEXT UNIQUE
value           TEXT
display_order   INTEGER
icon            TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Full CRUD in `admin-social-stats.html`

---

### 11. features
**File:** `database-schema.sql` ✅
**Purpose:** Feature highlights with bi-lingual support

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
icon_class      TEXT
title_ku        TEXT (Kurdish)
title_ar        TEXT (Arabic)
description_ku  TEXT
description_ar  TEXT
display_order   INTEGER
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Full CRUD in `admin-features.html`

---

### 12. schedule
**File:** `database-schema.sql` ✅
**Purpose:** Daily schedule with bi-lingual support

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
icon_class      TEXT
time_ku         TEXT
time_ar         TEXT
activity_ku     TEXT
activity_ar     TEXT
display_order   INTEGER
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Full CRUD in `admin-schedule.html`

---

### 13. background_images
**File:** `src/database/create_background_images_table.sql` ✅
**Purpose:** Background carousel images

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
page_name   TEXT (index/quran)
image_url   TEXT
image_order INTEGER
is_active   BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Full CRUD in `admin-backgrounds.html`

---

### 14. kurdish_translations
**File:** `database-schema.sql` ✅
**Purpose:** UI translation management (likely unused)

**Schema:**
```sql
id              BIGSERIAL PRIMARY KEY
key_id          TEXT UNIQUE
kurdish_text    TEXT
context         TEXT
category        TEXT
page            TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ❌ Not integrated

---

## Admin System

### 15. admin_users
**File:** `database-admin-auth-schema.sql` ✅
**Purpose:** Admin authentication and access control

**Schema:**
```sql
id                  BIGSERIAL PRIMARY KEY
email               TEXT UNIQUE NOT NULL
password_hash       TEXT NOT NULL (bcrypt)
full_name           TEXT
role                TEXT (super_admin/editor/analyst)
is_active           BOOLEAN DEFAULT true
is_locked           BOOLEAN DEFAULT false
locked_until        TIMESTAMPTZ
failed_attempts     INTEGER DEFAULT 0
last_login          TIMESTAMPTZ
device_fingerprint  TEXT
device_user_agent   TEXT
device_ip           TEXT
device_locked_at    TIMESTAMPTZ
status              TEXT (online/idle/offline)
last_heartbeat      TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
created_by          BIGINT → admin_users(id)
```

**Security Features:**
- Bcrypt password hashing (10 rounds)
- Device locking (ONE device per admin)
- 3-attempt lockout (24 hours)
- Live status tracking (online/idle/offline)

**Admin Integration:** ✅ Full management in `admin-account-management.html`

---

### 16. admin_sessions
**File:** `database-admin-auth-schema.sql` ✅
**Purpose:** Active admin sessions

**Schema:**
```sql
id                  BIGSERIAL PRIMARY KEY
user_id             BIGINT → admin_users(id) ON DELETE CASCADE
token               TEXT UNIQUE NOT NULL
ip_address          TEXT
user_agent          TEXT
device_fingerprint  TEXT
is_active           BOOLEAN DEFAULT true
expires_at          TIMESTAMPTZ NOT NULL
created_at          TIMESTAMPTZ DEFAULT NOW()
last_activity       TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Monitored in `admin-auth-monitor.html`

---

### 17. admin_audit_logs
**File:** `database-admin-auth-schema.sql` ✅
**Purpose:** Complete audit trail of admin actions

**Schema:**
```sql
id                  BIGSERIAL PRIMARY KEY
user_id             BIGINT → admin_users(id)
email               TEXT
action              TEXT
details             JSONB
ip_address          TEXT
user_agent          TEXT
page_slug           TEXT
resource_type       TEXT
resource_id         TEXT
device_fingerprint  TEXT
severity            TEXT (info/warning/critical)
created_at          TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Full view in `admin-auth-monitor.html`

---

### 18. admin_login_attempts
**File:** `database-admin-auth-schema.sql` ✅
**Purpose:** Failed login tracking and rate limiting

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
email       TEXT
ip_address  TEXT
success     BOOLEAN
created_at  TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ✅ Monitored in `admin-auth-monitor.html`

---

### 19. admin_permissions
**File:** `database-admin-security-upgrade.sql` ✅
**Purpose:** Page-level access control (RBAC)

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
user_id     BIGINT → admin_users(id) ON DELETE CASCADE
page_slug   TEXT
can_view    BOOLEAN DEFAULT false
can_edit    BOOLEAN DEFAULT false
can_delete  BOOLEAN DEFAULT false
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()

CONSTRAINT unique_user_page UNIQUE(user_id, page_slug)
```

**Admin Integration:** ⚠️ Backend only - used by auth system

---

### 20. admin_activity_sessions
**File:** `database-admin-security-upgrade.sql` ✅
**Purpose:** Detailed page-level activity tracking

**Schema:**
```sql
id                  BIGSERIAL PRIMARY KEY
user_id             BIGINT → admin_users(id)
session_id          BIGINT → admin_sessions(id)
page_slug           TEXT
action              TEXT
duration_seconds    INTEGER
created_at          TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ❌ Not integrated (tracking exists but no UI)

---

### 21. admin_activity_feed
**File:** `database-schema.sql` ✅
**Purpose:** Admin action timeline/feed

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
type        TEXT
category    TEXT
title       TEXT
description TEXT
metadata    JSONB
created_at  TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ❌ Not integrated

---

### 22. admin_login_sessions
**File:** `src/database/create_admin_login_sessions_table.sql` ✅
**Purpose:** Alternative session tracking system

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
email       TEXT
ip_address  TEXT
location    TEXT
login_time  TIMESTAMPTZ
last_active TIMESTAMPTZ
is_online   BOOLEAN
created_at  TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ⚠️ Used in `live.html` but not main admin

---

## Analytics & Tracking

### 23. location_tracking
**File:** `database-schema.sql` ✅
**Purpose:** Geographic visitor analytics

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
ip_address  TEXT
country     TEXT
region      TEXT
city        TEXT
latitude    FLOAT
longitude   FLOAT
user_agent  TEXT
page_path   TEXT
created_at  TIMESTAMPTZ DEFAULT NOW()
```

**Data Collected:**
- Visitor IP addresses
- Geographic location (country, city, coordinates)
- Browser/device information
- Page visits

**Admin Integration:** ❌ Not integrated (needs geographic analytics dashboard)

---

### 24. otp_codes
**File:** `supabase-migrations/create-otp-codes-table.sql` ✅
**Purpose:** Email verification codes

**Schema:**
```sql
id          BIGSERIAL PRIMARY KEY
email       TEXT
otp_code    TEXT
expires_at  TIMESTAMPTZ
attempts    INTEGER DEFAULT 0
created_at  TIMESTAMPTZ DEFAULT NOW()
```

**Admin Integration:** ❌ Backend only (could add debugging UI)

---

## Integration Status

### ✅ Fully Integrated (15 tables)
1. **user_data** - Users page + Reading Stats
2. **profiles** - Users page
3. **contact_messages** - Messages page
4. **social_stats** - Social Stats page
5. **features** - Features page
6. **schedule** - Schedule page
7. **background_images** - Backgrounds page
8. **admin_users** - Account Management
9. **admin_sessions** - Auth Monitor
10. **admin_audit_logs** - Auth Monitor
11. **admin_login_attempts** - Auth Monitor
12. **tv_categories** - TV Management
13. **tv_series** - TV Management
14. **tv_episodes** - TV Management + Videos

### ⚠️ Partially Integrated (3 tables)
1. **tv_videos** - Has utility, needs dedicated admin page
2. **admin_permissions** - Backend only (RBAC)
3. **admin_login_sessions** - Used in live.html

### ❌ Not Integrated (7 tables)
1. **featured_videos** - Likely obsolete
2. **kurdish_translations** - Translation management
3. **admin_activity_sessions** - Activity timeline
4. **admin_activity_feed** - Action feed
5. **location_tracking** - Geographic analytics
6. **otp_codes** - OTP debugging
7. **tv_video_series** - Optional feature

---

## Recommendations

### High Priority
1. **Geographic Analytics Dashboard** (`location_tracking`)
   - World map visualization
   - Top countries/cities
   - Real-time visitor feed
   - IP geolocation stats

2. **AWS Video Management** (`tv_videos`)
   - Dedicated admin page for S3 uploads
   - Video processing status
   - CDN management
   - Bulk operations

3. **Admin Activity Feed** (`admin_activity_feed`, `admin_activity_sessions`)
   - Real-time activity timeline
   - Admin action history
   - Session duration analytics

### Medium Priority
4. **OTP Management** (`otp_codes`)
   - Debugging interface
   - Code verification logs
   - Rate limit monitoring

5. **Translation Management** (`kurdish_translations`)
   - UI string editor
   - Bi-lingual content management

### Low Priority
6. **Legacy Cleanup**
   - Archive or remove `featured_videos` table
   - Consolidate `admin_login_sessions` with `admin_sessions`

---

## SQL Migration Order

If running fresh install, execute in this order:

1. **User System**
   - `create-profiles-table.sql`
   - `create_tv_user_data.sql`

2. **TV Content System**
   - `create-tv-categories-table.sql`
   - `create-tv-series-table.sql`
   - `create-tv-episodes-table.sql`
   - `create-tv-videos-table.sql`

3. **Content Management**
   - `database-schema.sql` (features, schedule, social_stats, contact_messages, etc.)
   - `create_background_images_table.sql`

4. **Admin System**
   - `database-admin-auth-schema.sql`
   - `database-admin-security-upgrade.sql`

5. **Tracking**
   - `create-otp-codes-table.sql`

---

## Database Health Checks

Run these queries periodically:

```sql
-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Row counts
SELECT
    schemaname,
    relname,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Missing indexes
SELECT
    schemaname,
    tablename,
    attname
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 1000
AND correlation < 0.1;
```

---

**Documentation maintained by:** Admin System
**For questions:** Contact dev team
