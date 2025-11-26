# Add Auto-Scroll Translations to Database

This guide explains how to add the new auto-scroll Kurdish translations to your Supabase database.

## Method 1: Using Supabase SQL Editor (Recommended)

1. Go to https://supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `add-autoscroll-translations.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl+Enter)

## Method 2: Using Admin Panel

1. Go to https://tafsirkurd.com/admin
2. Click on **Translations** section
3. Scroll to the bottom
4. Click **Add New Translation** for each entry below:

### Settings Page Translations:

| Key ID | Page | Context | Category | Kurdish Text |
|--------|------|---------|----------|--------------|
| auto_scroll_speed_label | settings.html | Speed control label | settings | خێرایا زڤراندنێ |
| auto_scroll_speed_desc | settings.html | Speed control description | settings | دیارکرنا خێرایا زڤراندنا خۆکار |
| speed_very_slow | settings.html | Speed level 1 | settings | زۆر هێواش |
| speed_slow | settings.html | Speed level 2 | settings | هێواش |
| speed_medium | settings.html | Speed level 3 | settings | ناڤەند |
| speed_fast | settings.html | Speed level 4 | settings | خێرا |
| speed_very_fast | settings.html | Speed level 5 | settings | زۆر خێرا |

### Quran Page Notifications:

| Key ID | Page | Context | Category | Kurdish Text |
|--------|------|---------|----------|--------------|
| autoscroll_enabled_notification | Quran.html | Auto-scroll enabled notification | notifications | زڤراندنا خۆکار چالاککر - تکایە بچە بۆ خواندنا سوورەتێ |
| autoscroll_disabled_notification | Quran.html | Auto-scroll disabled notification | notifications | زڤراندنا خۆکار نەچالاککر |
| autoscroll_need_surah | Quran.html | Need to open surah first | notifications | تکایە سوورەتەکێ ڤەکەرە بۆ زڤراندنا سوورەتێ |
| autoscroll_reached_end | Quran.html | Reached end of page | notifications | گەهشتیە دوماهیێ |
| autoscroll_stopped_scroll_up | Quran.html | Stopped due to scroll up | notifications | زڤراندنا خۆکار ڕاگیرا - تو ب دەستێ گەریایت بۆ ژور |
| autoscroll_stopped_mobile | Quran.html | Stopped on mobile | notifications | زڤراندنا خۆکار ڕاگیرا |

## Verify Translations

After adding, go to the admin panel and:
1. Click on **Translations** section
2. Search for "auto" or "speed"
3. Verify all 13 translations appear
4. Make sure they're all marked as **Active**

## Total Translations Added
- **7** settings translations (speed control)
- **6** notification translations (Quran page)
- **Total: 13 new translations**
