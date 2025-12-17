# SIMPLE SETUP - Everything in One Place

## Your Discord Webhooks (TWO Channels):

### Webhook 1 - Stats & Notifications:
```
https://discord.com/api/webhooks/1450630296943857727/dHv-ipJ4IwUx6N8QdDPkumd54VEWID_1hLOL11sTy4v9UOVMu-SasqW9JH6iPdrNMbcd
```
Sends:
- ✅ New user signups
- ✅ Contact messages
- ✅ Daily stats report
- ✅ Hourly activity summaries
- ✅ All website notifications

### Webhook 2 - Random Zceer (Arabic Dhikr):
```
https://discord.com/api/webhooks/1450631760147779767/t08tzCCtcMbz2_r8BN2VIwSV4yreuNUrUS5xJMmxNs9Akx_IKov-EsR_14Y4qhXxX2Yb
```
Sends:
- 🌙 Simple Arabic Zceer (just Arabic text, nothing else)
- 🎲 At random times throughout the day
- 📿 One at a time, 615+ different dhikr to choose from

---

## Step 1: Update Netlify (ONE TIME SETUP)

1. Go to: https://app.netlify.com/sites/tafsirkurd/settings/deploys#environment-variables

2. Find `DISCORD_WEBHOOK_URL` and click **Edit** (or Add if it doesn't exist)

3. Paste this value:
   ```
   https://discord.com/api/webhooks/1450630296943857727/dHv-ipJ4IwUx6N8QdDPkumd54VEWID_1hLOL11sTy4v9UOVMu-SasqW9JH6iPdrNMbcd
   ```

4. Click **Save**

5. **Redeploy** your site:
   - Go to: https://app.netlify.com/sites/tafsirkurd/deploys
   - Click **Trigger deploy** → **Deploy site**

**Done!** Now ALL your website notifications work automatically!

---

## Step 2: Test Daily Stats Report

**Just double-click this file:**
```
C:\TafsirKurd\run-daily-report.bat
```

You'll see in Discord Stats channel:
- 📊 Your platform stats
- 👥 User counts and growth trends
- 📖 Total ayahs read
- All formatted beautifully!

## Step 3: Test Random Zceer

**Double-click this file:**
```
C:\TafsirKurd\send-random-zceer.bat
```

You'll see in Discord Zceer channel:
- 🌙 ONE simple Arabic zceer (just Arabic text, no translation)

---

## Step 4: Make It Automatic (Optional)

### For Daily Stats Report:

**Windows Task Scheduler:**
1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Click **Create Task**
3. **General Tab:**
   - Name: `Tafsir Kurd Daily Stats`
   - ✅ Run whether user is logged on or not
4. **Triggers Tab:**
   - New → Daily → Time: `9:00 AM`
5. **Actions Tab:**
   - New → Start a program
   - Program: `C:\TafsirKurd\run-daily-report.bat`
6. Click **OK**

Now you get daily stats automatically every day at 9 AM!

### For Random Zceer Throughout the Day:

See detailed instructions here: `RANDOM_ZCEER_SETUP.md`

**Quick summary:** Create 5 tasks with random delays to get zceer at random times:
- Morning (7 AM + random 0-3 hours)
- Midday (12 PM + random 0-2 hours)
- Afternoon (3 PM + random 0-2 hours)
- Evening (6 PM + random 0-3 hours)
- Night (9 PM + random 0-2 hours)

This gives you **5 random Arabic zceer per day** at completely unpredictable times!

---

## What You Get Automatically:

### Right Now (Already Working):
When someone:
- Signs up → Discord notification (Stats channel)
- Sends contact message → Discord notification (Stats channel)
- Completes Quran → Discord celebration (Stats channel)

### After Step 1 (Netlify Update):
Same as above, but with the new webhook!

### After Step 4 (Automatic Setup):
**Daily at 9 AM:**
- 📊 Platform statistics and growth trends (Stats channel)

**5 Random Times Per Day:**
- 🌙 Simple Arabic zceer - just the Arabic text (Zceer channel)

### Hourly Summary (Optional):
Double-click: `run-hourly-summary.bat`
Or set up Task Scheduler to run every hour

Shows:
- New users last hour
- Active users
- Reading sessions
- Contact messages

---

## That's It!

**FOUR simple steps:**
1. ✅ Update Netlify webhook (one time)
2. ✅ Test daily stats (double-click bat file)
3. ✅ Test random zceer (double-click bat file)
4. ✅ Make it automatic (Task Scheduler - optional)

**TWO separate channels:**
- **Stats:** Website notifications & daily statistics
- **Zceer:** Simple Arabic dhikr at random times 🎉

---

## Need to Change the Webhooks Later?

Just update them in:
1. Netlify environment variables (DISCORD_WEBHOOK_URL for stats)
2. run-daily-report.bat (DISCORD_WEBHOOK_STATS for daily stats)
3. send-random-zceer.bat (DISCORD_WEBHOOK_ZCEER for zceer)
4. run-hourly-summary.bat (DISCORD_WEBHOOK_URL for stats)
5. Redeploy Netlify

---

## Quick Test Right Now:

**Test Daily Stats:**
```powershell
cd C:\TafsirKurd
.\run-daily-report.bat
```
Check Discord Stats channel - you should see your daily report! 📊

**Test Random Zceer:**
```powershell
cd C:\TafsirKurd
.\send-random-zceer.bat
```
Check Discord Zceer channel - you should see ONE simple Arabic zceer! 🌙
