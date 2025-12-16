# Real-Time Website Monitoring Setup

Get **instant notifications** for EVERYTHING happening on your website!

## 🎯 What You'll Be Notified About:

### ✅ Already Working (Instant):
- 🎉 New user signups
- 📧 Contact form submissions
- 🏆 Quran completions

### 🆕 New Real-Time Tracking:
- 👤 User logins
- 📖 Reading sessions started
- 🔖 Bookmarks added
- 🎯 Daily goals achieved
- ✅ Surahs completed
- 📕 Juz completions
- ⚙️ Profile updates
- 🎯 New goals set
- ❌ Website errors
- 🔍 Search queries
- 👁️ Important page views (admin, settings)

### 📊 Automatic Summaries:
- **Hourly Report** - What happened in the last hour
- **Daily Report** - Full day statistics + 3 Dhikr

---

## 🚀 Setup Instructions

### Step 1: Add Activity Tracker to Your Website

Add this line to your main HTML files (before closing `</body>` tag):

**In these files:**
- `src/index.html`
- `src/Quran.html`
- `src/profile.html`
- `src/settings.html`
- `src/admin.html`
- `src/login.html`

```html
<!-- Activity Tracker -->
<script src="/utils/activity-tracker.js"></script>
```

---

### Step 2: Track User Actions

In your existing JavaScript code, add tracking calls:

#### When user logs in:
```javascript
// After successful login
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        window.activityTracker.userLogin(user);
    }
});
```

#### When starting to read:
```javascript
// When user opens a surah
function loadSurah(surahNumber) {
    // ... your existing code ...

    // Track reading session
    window.activityTracker.readingStart(
        surahNumber,
        currentAyah,
        calculateProgress()
    );
}
```

#### When adding bookmark:
```javascript
async function addBookmark(surah, ayah) {
    // ... your existing code ...

    // Track bookmark
    const totalBookmarks = await getTotalBookmarks();
    window.activityTracker.bookmarkAdded(surah, ayah, totalBookmarks);
}
```

#### When achieving daily goal:
```javascript
function checkDailyGoal() {
    if (ayahsReadToday >= dailyGoal) {
        window.activityTracker.goalAchieved(
            dailyGoal,
            ayahsReadToday,
            currentStreak
        );
    }
}
```

#### When completing a surah:
```javascript
function onSurahComplete(surah) {
    window.activityTracker.surahCompleted(
        surah.number,
        surah.name,
        surah.totalAyahs,
        calculateOverallProgress()
    );
}
```

#### When completing a juz:
```javascript
function onJuzComplete(juzNumber) {
    window.activityTracker.juzCompleted(
        juzNumber,
        daysSinceStart,
        calculateProgress()
    );
}
```

#### When updating profile:
```javascript
async function updateProfile(changes) {
    // ... your existing code ...

    window.activityTracker.profileUpdated(
        'Updated: ' + Object.keys(changes).join(', ')
    );
}
```

#### When setting new goal:
```javascript
function setDailyGoal(goal) {
    // ... your existing code ...

    window.activityTracker.goalSet(goal, 'Daily');
}
```

---

### Step 3: Set Up Hourly Reports

Create batch file: `run-hourly-summary.bat`

```batch
@echo off
cd /d C:\TafsirKurd
set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1450609878207959162/39_Z0gobcAMpB96iOq6ioWZpsvF5dGZe4_aTjg0VwLq6bKUBhQjtCPLauKR-F35_nw8d
set SUPABASE_URL=https://nvwgepkhzobgwnzibpvq.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52d2dlcGtoemJvZ3due2licHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNTUwMjIsImV4cCI6MjA0ODczMTAyMn0.FW_a9X7sWZNe8yh0ykf9MNwxIgxsxUGBj3XjfIqYYlY
node scripts/hourly-activity-summary.js
```

**Set up Task Scheduler:**
1. Open Task Scheduler
2. Create Task: "Tafsir Kurd Hourly Report"
3. Trigger: Daily, repeat every 1 hour for duration of 1 day
4. Action: Run `C:\TafsirKurd\run-hourly-summary.bat`
5. Save

---

### Step 4: Deploy and Test

1. **Deploy the activity monitor:**
```bash
git add -A
git commit -m "Add real-time activity monitoring"
git push
```

2. **Test tracking:**
   - Add the script to one HTML file
   - Open that page in browser
   - Do an action (login, read, etc.)
   - Check Discord for notification!

3. **Test hourly summary:**
```bash
run-hourly-summary.bat
```

Check Discord - you should see a summary!

---

## 📊 What You'll See in Discord

### Instant Notifications:

**User Login:**
```
👤 User Login
Ahmad Hassan logged in
Email: ahmad@example.com
Location: Asia/Baghdad
Time: 2:30 PM
```

**Reading Session:**
```
📖 Reading Session Started
Ahmad Hassan started reading
Surah: 2
Ayah: 45
Progress: 12.5%
```

**Bookmark Added:**
```
🔖 New Bookmark
Ahmad Hassan bookmarked an ayah
Surah: 18 | Ayah: 10 | Total Bookmarks: 15
```

**Goal Achieved:**
```
🎯 Daily Goal Achieved!
Ahmad Hassan reached their daily goal!
Goal: 50 ayahs
Read Today: 52 ayahs
Streak: 7 days
```

**Surah Completed:**
```
✅ Surah Completed!
Ahmad Hassan completed Surah Al-Kahf!
Surah Number: 18
Total Ayahs: 110
Overall Progress: 25%
```

---

### Hourly Summary (Every Hour):

```
⏰ Hourly Activity Report - 3:00 PM

📊 Overview
👥 3 new users
✨ 12 active users
📖 8 reading sessions
📧 2 messages

🎉 New Users (3)
• Ahmad Hassan (2:15 PM)
• Sara Ali (2:30 PM)
• Omar Mahmoud (2:45 PM)

📖 Reading Activity (8)
• Ahmad Hassan - Surah 2:45
• Sara Ali - Surah 18:10
• Omar Mahmoud - Surah 36:1
```

---

### Daily Summary (9:00 AM):

```
📊 Daily Tafsir Kurd Report
Thursday, December 17, 2025

👥 Total Users: 1,234
🆕 New Today: 15
📈 Trend: 📈 Growing
📖 Total Ayahs Read: 45,678
🏆 Completed Quran: 23
📅 Yesterday: 12 new users

🌙 Daily Dhikr 1 - Tasbih
سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ سُبْحَانَ اللّٰهِ الْعَظِيمِ

📝 Transliteration: Subhanallahi wa bihamdihi...
🇬🇧 Translation: Glory be to Allah...
🎁 Benefit: Two words light on the tongue...
```

---

## 🎛️ Customization

### Reduce Notifications

Don't want hourly reports? Change to every 3 hours:
- Task Scheduler → Edit → Triggers → Repeat every: 3 hours

Don't want certain events? Comment them out in `activity-tracker.js`

### Add More Events

Want to track something specific? Add it:

```javascript
// In your code
window.activityTracker.track('custom_event', {
    description: 'Whatever you want',
    data: 'any data'
});

// Then add handler in activity-monitor.js
case 'custom_event':
    embed = {
        title: 'Your Custom Event',
        description: data.description,
        // ...
    };
    break;
```

---

## 🔧 Troubleshooting

### No notifications?
1. Check that activity-tracker.js is loaded: Open browser console → type `window.activityTracker`
2. Check network tab for failed requests
3. Verify webhook URL is correct
4. Check Netlify function logs

### Too many notifications?
- Switch to hourly summaries only
- Disable specific event types
- Increase hourly interval to 3 or 6 hours

### Want desktop notifications too?
Add to activity-tracker.js:
```javascript
if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Tafsir Kurd', {
        body: 'New activity on your website!'
    });
}
```

---

## 📱 Discord Mobile App

Install Discord app on your phone to get push notifications for all website activity!

1. Download Discord app
2. Login
3. Turn on notifications for your server
4. Now you get alerts on your phone instantly!

---

**You're all set!** You'll now know EVERYTHING happening on your website in real-time! 🎉
