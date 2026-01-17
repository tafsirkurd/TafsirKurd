# Session Timer UI Setup Guide

## Quick Guide: Adding Session Timer to All Admin Pages

The session timer has been added to:
- ✅ `admin-dashboard.html`
- ✅ `admin-analytics.html`

**To add to remaining admin pages:**

### Step 1: Add HTML to Topbar

Find the `.topbar-actions` div and add the session timer **before** the notification bell button:

```html
<div class="topbar-actions">
    <!-- Session Timer Display -->
    <div class="session-timer" id="sessionTimer" title="Session expires after 20 minutes">
        <i data-lucide="clock"></i>
        <span id="sessionTimerText">20:00</span>
    </div>

    <button class="topbar-btn" style="position: relative;">
        <i data-lucide="bell"></i>
        <!-- ... rest of topbar ... -->
```

### Step 2: Add JavaScript Includes

Add these scripts **before** `admin-auth.js`:

```html
<script src="/utils/device-fingerprint.js"></script>
<script src="/utils/admin-heartbeat.js"></script>
<script src="/utils/admin-session-timer-ui.js"></script>
<script src="/utils/admin-auth.js?v=3"></script>
```

### Step 3: Verify

1. Open admin page
2. Login
3. Check top-right corner for timer showing "20:00"
4. Timer should countdown every second
5. Console should show: "✅ Session timer display started"

---

## Files That Need Update

Run this command to find all admin pages with topbar:

```bash
grep -l "topbar-actions" src/admin-*.html
```

**List of pages to update:**
- [ ] admin-account-management.html
- [ ] admin-activity-feed.html
- [ ] admin-auth-monitor.html
- [ ] admin-backgrounds.html
- [ ] admin-bot-protection.html
- [ ] admin-database.html
- [ ] admin-email-templates.html
- [ ] admin-features.html
- [ ] admin-geographic-analytics.html
- [ ] admin-messages.html
- [ ] admin-reading-stats.html
- [ ] admin-schedule.html
- [ ] admin-search-console.html
- [ ] admin-social-stats.html
- [ ] admin-translations.html
- [ ] admin-tv-management.html
- [ ] admin-users.html
- [ ] admin-video-library.html
- [ ] admin-videos.html

---

## Batch Update Script (Optional)

Create a script to automate this for all pages:

```javascript
// batch-add-timer.js
const fs = require('fs');
const path = require('path');

const adminPages = [
    'admin-account-management.html',
    'admin-activity-feed.html',
    // ... add all pages
];

const timerHTML = `                    <!-- Session Timer Display -->
                    <div class="session-timer" id="sessionTimer" title="Session expires after 20 minutes">
                        <i data-lucide="clock"></i>
                        <span id="sessionTimerText">20:00</span>
                    </div>

`;

adminPages.forEach(page => {
    const filePath = path.join(__dirname, 'src', page);
    let content = fs.readFileSync(filePath, 'utf8');

    // Add timer to topbar-actions (if not already there)
    if (!content.includes('session-timer') && content.includes('topbar-actions')) {
        content = content.replace(
            '<div class="topbar-actions">',
            '<div class="topbar-actions">\n' + timerHTML
        );
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${page}`);
    }
});
```

---

## Visual States

The timer will automatically change appearance based on time remaining:

| Time Remaining | Visual State | Color | Animation |
|----------------|-------------|-------|-----------|
| 20-6 minutes | Normal | Gray | None |
| 5-3 minutes | Warning | Yellow | Slow pulse (2s) |
| 2-0 minutes | Critical | Red | Fast pulse (1s) |

---

## Testing

1. **Test on Dashboard:**
   - Login to admin panel
   - Check timer appears in top-right
   - Verify it counts down every second

2. **Test Warning States:**
   - For quick testing, change timeout to 5 minutes:
     - Edit `src/utils/admin-heartbeat.js`
     - Change: `const SESSION_TIMEOUT = 5 * 60 * 1000;`
   - Login and wait 3 minutes
   - Timer should turn YELLOW (warning)
   - Wait 2 more minutes
   - Timer should turn RED (critical)

3. **Test Notifications:**
   - At 5 minutes remaining: Yellow warning notification
   - At 2 minutes remaining: Red critical notification

---

## Mobile Responsive

On mobile (< 768px):
- Clock icon still shows
- Time text is hidden to save space
- Tooltip still works on tap

---

## Status

✅ CSS styles added to `src/css/admin-styles.css`
✅ JavaScript logic in `src/utils/admin-session-timer-ui.js`
✅ Dashboard page updated
✅ Analytics page updated
⏳ Remaining admin pages need manual or batch update

---

**Ready to use!** The timer is fully functional on dashboard and analytics pages.
