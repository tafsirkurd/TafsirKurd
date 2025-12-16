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

### Webhook 2 - Daily Zceer (Arabic Dhikr):
```
https://discord.com/api/webhooks/1450631760147779767/t08tzCCtcMbz2_r8BN2VIwSV4yreuNUrUS5xJMmxNs9Akx_IKov-EsR_14Y4qhXxX2Yb
```
Sends:
- 🌙 3 random Arabic Zceer every day
- 📿 20 different dhikr categories (never repeats)

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

## Step 2: Test Daily Report (Run Once to See It Work)

**Just double-click this file:**
```
C:\TafsirKurd\run-daily-report.bat
```

You'll see in Discord:
- 📊 Your platform stats (in Stats channel)
- 🌙 3 random Arabic Zceer with benefits (in Zceer channel)
- All formatted beautifully in separate channels!

---

## Step 3: Make Daily Report Automatic (Optional)

### Windows Task Scheduler:

1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Click **Create Task**
3. **General Tab:**
   - Name: `Tafsir Kurd Daily Report`
   - ✅ Run whether user is logged on or not
4. **Triggers Tab:**
   - New → Daily → Time: `9:00 AM`
5. **Actions Tab:**
   - New → Start a program
   - Program: `C:\TafsirKurd\run-daily-report.bat`
6. Click **OK**

Now you get stats + 3 Zceer automatically every day at 9 AM!

---

## What You Get Automatically:

### Right Now (Already Working):
When someone:
- Signs up → Discord notification
- Sends contact message → Discord notification
- Completes Quran → Discord celebration

### After Step 1 (Netlify Update):
Same as above, but with the new webhook!

### After Step 2 (Daily Report):
Every day at 9 AM:
- **Stats Channel:** Platform statistics, growth trends
- **Zceer Channel:** 3 different Arabic Zceer with benefits

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

**THREE simple steps:**
1. ✅ Update Netlify webhook (one time)
2. ✅ Test daily report (double-click bat file)
3. ✅ Make it automatic (Task Scheduler - optional)

**TWO separate channels:** Stats in one, Zceer in another! 🎉

---

## Need to Change the Webhooks Later?

Just update them in:
1. Netlify environment variables (DISCORD_WEBHOOK_URL for stats)
2. run-daily-report.bat (both DISCORD_WEBHOOK_STATS and DISCORD_WEBHOOK_ZCEER)
3. run-hourly-summary.bat (DISCORD_WEBHOOK_URL for stats)
4. Redeploy Netlify

---

## Quick Test Right Now:

```powershell
cd C:\TafsirKurd
.\run-daily-report.bat
```

Check Discord - you should see your report! 📊
