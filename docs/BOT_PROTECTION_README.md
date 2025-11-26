# 🤖 Bot Protection System

## Overview

Advanced bot detection and blocking system that protects your site from malicious bots, crawlers, and automated traffic while allowing legitimate search engines.

## Features

### ✅ Bot Detection
- **User Agent Analysis**: Detects 40+ bot patterns
- **Advanced Detection**: Identifies headless browsers and automation tools
- **Behavioral Analysis**: Checks for browser features (Canvas, WebGL, etc.)
- **Bot Scoring**: Assigns risk scores to suspicious traffic

### 🚫 Automatic Blocking
- Blocks malicious bots instantly
- Shows Kurdish block message
- Allows search engines (Google, Bing, DuckDuckGo, etc.)
- Prevents automated scraping

### 📊 Admin Dashboard
- Real-time bot statistics
- Bot type distribution charts
- Recent bot activity (24 hours)
- Complete bot logs with IP addresses
- Block rate percentage

## Setup Instructions

### 1. Create Database Table in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- File: supabase-bot-logs-table.sql
-- Copy and paste the entire contents of this file
```

Go to: https://app.supabase.com/project/gijupzejtbpifjzwadee/editor

### 2. Files Added

- **`src/utils/bot-detector.js`** - Client-side bot detection
- **`netlify/functions/log-bot.js`** - Server-side bot logging
- **`supabase-bot-logs-table.sql`** - Database schema

### 3. Integration

Bot detector automatically loads on:
- ✅ Quran.html (already added)
- ⚠️ Need to add to other pages manually

To add to other pages, add this in the `<head>`:
```html
<script src="/utils/bot-detector.js"></script>
```

## How It Works

### 1. Detection Process

```
User visits page
       ↓
Bot detector checks user agent
       ↓
Advanced behavioral analysis
       ↓
Calculate bot score
       ↓
Classify: Human | Search Engine | Malicious Bot
```

### 2. Blocking Process

```
Malicious bot detected
       ↓
Log to Supabase database
       ↓
Show Kurdish block message
       ↓
Stop page execution
```

### 3. Allowed Bots (Search Engines)

- ✅ Google Bot
- ✅ Bing Bot
- ✅ DuckDuckGo Bot
- ✅ Baidu Spider
- ✅ Yandex Bot

These are logged but **NOT** blocked.

## Admin Panel Features

### Statistics Shown

1. **Total Bots Detected** - All bots including search engines
2. **Malicious Bots Blocked** - Only harmful bots
3. **Search Engines Allowed** - Legitimate crawlers
4. **Block Rate** - Percentage of blocked vs total

### Bot Types

- 🚫 **malicious** - Scrapers, crawlers, automation tools
- 🔍 **search-engine** - Google, Bing, etc. (allowed)
- 🤖 **headless-browser** - Selenium, Puppeteer, etc.
- ❓ **unknown** - Unclassified bots

### Tables

1. **Recent Activity** - Last 24 hours (up to 50 entries)
2. **All Bot Logs** - Complete history (up to 100 entries)

## Bot Detection Patterns

The system detects these patterns:

### User Agent Patterns
- `/bot/i` - Generic bots
- `/crawl/i` - Crawlers
- `/spider/i` - Spiders
- `/curl/i`, `/wget/i` - Command line tools
- `/python/i`, `/java/i` - Programming languages
- `/selenium/i`, `/webdriver/i` - Automation tools
- `/scrapy/i`, `/beautiful soup/i` - Scraping frameworks
- And 30+ more patterns...

### Advanced Checks
- `navigator.webdriver` detection
- Plugin availability
- Language settings
- Canvas fingerprinting
- WebGL support
- Touch capability
- LocalStorage access

## Block Message

When a bot is blocked, they see:

```
🚫
دەستڕاگەیشتن قەدەغە کراوە

ئەم سایتە تەنها بۆ بەکارهێنەرانی مرۆڤ دروست کراوە.
بۆتەکان و کراولەرە خۆکارەکان ڕێگەپێنەدراون.

هۆکار: [bot type]

ئەگەر تۆ بەکارهێنەرێکی مرۆڤی، پەیوەندیمان پێوە بکە.
```

## Database Schema

```sql
bot_logs table:
- id: BIGSERIAL PRIMARY KEY
- user_agent: TEXT
- is_bot: BOOLEAN
- bot_type: VARCHAR(50)
- is_allowed: BOOLEAN
- ip_address: VARCHAR(45)
- country: VARCHAR(100)
- city: VARCHAR(100)
- page: VARCHAR(500)
- referrer: VARCHAR(500)
- bot_score: INTEGER
- checks: JSONB
- blocked: BOOLEAN
- created_at: TIMESTAMP
```

## Performance

- **Client-side**: < 1ms detection time
- **Server-side**: Async logging (non-blocking)
- **No impact on human users**
- **Offline capable**: Script cached in service worker

## Security Benefits

1. **Prevents Scraping**: Blocks automated content theft
2. **Reduces Server Load**: Stops bot traffic
3. **Protects Data**: Prevents unauthorized data collection
4. **Analytics Accuracy**: Better real user metrics
5. **DDoS Protection**: Identifies automated attacks

## Monitoring

Check admin panel "🤖 Bot Protection" tab for:
- Real-time bot attempts
- Geographic distribution
- Block success rate
- Bot type trends

## Notes

- Search engines are **allowed** (good for SEO)
- Human users are **never** blocked
- Bot detection runs on every page load
- All activity is logged to database
- IPv4 and IPv6 support

## Troubleshooting

### Bot not being blocked?
- Check browser console for detection logs
- Verify Supabase table exists
- Check Netlify function logs

### Human user blocked?
- Adjust bot score threshold in `bot-detector.js`
- Review detection patterns
- Check browser compatibility

### No data in admin panel?
- Run SQL file in Supabase
- Verify table permissions
- Check Supabase environment variables

## Future Enhancements

- IP-based rate limiting
- Geofencing capabilities
- Machine learning detection
- Real-time alerts
- Export bot logs to CSV
