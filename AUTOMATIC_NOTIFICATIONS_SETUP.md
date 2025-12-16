# Automatic Notifications Setup

This guide will help you set up **automatic daily notifications** to your Discord server.

## What You'll Get Automatically:

### 📊 Daily Stats Report (Every morning at 9 AM)
- Total users
- New users today
- Growth trend
- Ayahs read
- Completions

### 🌙 3 Random Dhikr (Every day)
- Best Arabic dhikr
- Different categories
- With benefits

### 🎉 Instant New User Alerts
- When someone signs up
- User info
- Location
- Profile picture

###📧 Contact Messages
- New contact form submissions
- Automatic notifications

### 🏆 Achievements
- When users complete Quran
- Milestones reached

---

## Setup Windows Task Scheduler

### Step 1: Test the Daily Script First

Open PowerShell and run:

```powershell
cd C:\TafsirKurd
$env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1450609878207959162/39_Z0gobcAMpB96iOq6ioWZpsvF5dGZe4_aTjg0VwLq6bKUBhQjtCPLauKR-F35_nw8d"
$env:SUPABASE_URL="https://nvwgepkhzobgwnzibpvq.supabase.co"
$env:SUPABASE_ANON_KEY="YOUR_SUPABASE_KEY_HERE"
node scripts/daily-zceer-and-stats.js
```

You should see a message in Discord with stats and 3 dhikr!

---

### Step 2: Create Batch File

Create a file: `C:\TafsirKurd\run-daily-report.bat`

```batch
@echo off
cd /d C:\TafsirKurd
set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1450609878207959162/39_Z0gobcAMpB96iOq6ioWZpsvF5dGZe4_aTjg0VwLq6bKUBhQjtCPLauKR-F35_nw8d
set SUPABASE_URL=https://nvwgepkhzobgwnzibpvq.supabase.co
set SUPABASE_ANON_KEY=YOUR_SUPABASE_KEY_HERE
node scripts/daily-zceer-and-stats.js >> logs\daily-report.log 2>&1
```

Save and test it by double-clicking the file.

---

### Step 3: Set Up Windows Task Scheduler

1. **Open Task Scheduler**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create New Task**
   - Click "Create Task..." (not "Create Basic Task")

3. **General Tab**
   - Name: `Tafsir Kurd Daily Report`
   - Description: `Send daily stats and dhikr to Discord`
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges

4. **Triggers Tab**
   - Click "New..."
   - Begin the task: `On a schedule`
   - Settings: `Daily`
   - Start: Choose time (e.g., `9:00 AM`)
   - ✅ Enabled
   - Click OK

5. **Actions Tab**
   - Click "New..."
   - Action: `Start a program`
   - Program/script: `C:\TafsirKurd\run-daily-report.bat`
   - Click OK

6. **Conditions Tab**
   - ✅ Start only if the computer is on AC power (uncheck if laptop)
   - ✅ Wake the computer to run this task

7. **Settings Tab**
   - ✅ Allow task to be run on demand
   - ✅ Run task as soon as possible after a scheduled start is missed
   - If the task fails, restart every: `1 hour`

8. **Click OK**
   - Enter your Windows password if prompted

---

### Step 4: Test the Scheduled Task

1. In Task Scheduler, find your task
2. Right-click → **Run**
3. Check Discord - you should see the report!

---

## Instant Notifications (Already Working!)

These are **already automatic** - your Discord bot sends them instantly:

### ✅ New Users
When someone signs up, you get:
- Name
- Email
- Location
- Profile picture
- Instantly in Discord!

### ✅ Contact Messages
When someone submits contact form:
- Name
- Email
- Message
- Instant notification!

### ✅ Achievements
When user completes Quran:
- Celebration message
- User stats
- Instant!

**These work automatically because your website already calls the Discord notify function!**

---

## Troubleshooting

### Task doesn't run?
- Check Task Scheduler → Task History
- Make sure computer is awake at scheduled time
- Check the log file: `C:\TafsirKurd\logs\daily-report.log`

### No message in Discord?
- Test the batch file manually
- Check webhook URL is correct
- Check Supabase key is correct

### Wrong time?
- Edit task → Triggers → Change time

---

## Alternative: Use Netlify Scheduled Functions

If you want it to run from the cloud (better!):

1. Create `netlify/functions/scheduled-daily-report.js`
2. Add to `netlify.toml`:
```toml
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

  [plugins.inputs]
    [plugins.inputs.daily_report]
      schedule = "0 9 * * *"  # 9 AM every day
```

3. Deploy to Netlify
4. It runs automatically in the cloud!

---

## What You'll See Every Day:

**9:00 AM** - Discord message with:
- 📊 Yesterday's stats
- 📈 Growth numbers
- 🌙 3 different Arabic dhikr with benefits
- Beautiful formatted embeds

**Anytime** - Instant notifications:
- 🎉 New user joined
- 📧 New contact message
- 🏆 User completed Quran

---

**You're all set!** Your Discord will become your personal admin dashboard with automatic updates! 🎉
