# Random Zceer Setup - Simple Arabic Dhikr

Get random Arabic Zceer (dhikr) throughout the day at random times!

## What You'll Get:

- **Simple Arabic text only** - No translations, no benefits, just pure Arabic
- **Random times** - Not at specific times, but spread throughout the day
- **One at a time** - Not 3 together, just one random zceer
- **20 different dhikr** - From different categories, randomly selected

---

## How It Works:

The script will send ONE random Arabic zceer from this collection:

1. سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ سُبْحَانَ اللّٰهِ الْعَظِيمِ
2. لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ...
3. اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ وَعَلٰى آلِ مُحَمَّدٍ...
4. And 17 more beautiful dhikr

---

## Quick Test:

Double-click this file to test:
```
C:\TafsirKurd\send-random-zceer.bat
```

You should see ONE random Arabic zceer in your Discord channel!

---

## Setup Random Times (Windows Task Scheduler):

### Step 1: Open Task Scheduler
1. Press `Win + R`
2. Type: `taskschd.msc`
3. Press Enter

### Step 2: Create Multiple Random Tasks

We'll create several tasks that run at different random times throughout the day.

#### Task 1 - Morning Random
1. Click **Create Task**
2. **General Tab:**
   - Name: `Tafsir Kurd - Random Zceer Morning`
   - ✅ Run whether user is logged on or not
3. **Triggers Tab:**
   - New → Daily → Start: **7:00 AM**
   - Advanced → ✅ Delay task for up to (random delay): **3 hours**
4. **Actions Tab:**
   - New → Start a program
   - Program: `C:\TafsirKurd\send-random-zceer.bat`
5. Click **OK**

#### Task 2 - Midday Random
1. Create Task
2. **General Tab:**
   - Name: `Tafsir Kurd - Random Zceer Midday`
   - ✅ Run whether user is logged on or not
3. **Triggers Tab:**
   - New → Daily → Start: **12:00 PM**
   - Advanced → ✅ Delay task for up to (random delay): **2 hours**
4. **Actions Tab:**
   - Program: `C:\TafsirKurd\send-random-zceer.bat`
5. Click **OK**

#### Task 3 - Afternoon Random
1. Create Task
2. **General Tab:**
   - Name: `Tafsir Kurd - Random Zceer Afternoon`
   - ✅ Run whether user is logged on or not
3. **Triggers Tab:**
   - New → Daily → Start: **3:00 PM**
   - Advanced → ✅ Delay task for up to (random delay): **2 hours**
4. **Actions Tab:**
   - Program: `C:\TafsirKurd\send-random-zceer.bat`
5. Click **OK**

#### Task 4 - Evening Random
1. Create Task
2. **General Tab:**
   - Name: `Tafsir Kurd - Random Zceer Evening`
   - ✅ Run whether user is logged on or not
3. **Triggers Tab:**
   - New → Daily → Start: **6:00 PM**
   - Advanced → ✅ Delay task for up to (random delay): **3 hours**
4. **Actions Tab:**
   - Program: `C:\TafsirKurd\send-random-zceer.bat`
5. Click **OK**

#### Task 5 - Night Random
1. Create Task
2. **General Tab:**
   - Name: `Tafsir Kurd - Random Zceer Night`
   - ✅ Run whether user is logged on or not
3. **Triggers Tab:**
   - New → Daily → Start: **9:00 PM**
   - Advanced → ✅ Delay task for up to (random delay): **2 hours**
4. **Actions Tab:**
   - Program: `C:\TafsirKurd\send-random-zceer.bat`
5. Click **OK**

---

## What This Gives You:

With the random delays, you'll get zceer at completely random times like:

- **Morning:** Sometime between 7:00 AM - 10:00 AM
- **Midday:** Sometime between 12:00 PM - 2:00 PM
- **Afternoon:** Sometime between 3:00 PM - 5:00 PM
- **Evening:** Sometime between 6:00 PM - 9:00 PM
- **Night:** Sometime between 9:00 PM - 11:00 PM

**5 random zceer per day** at completely unpredictable times!

---

## Want More or Less?

### Want More Zceer?
Add more tasks at different times (11 AM, 4 PM, 8 PM, etc.)

### Want Less Zceer?
Delete some of the tasks you created

### Want Different Times?
Change the start time and random delay in each task

---

## How Random Delay Works:

When you set "Delay task for up to (random delay): 2 hours", Windows will:
1. Wait a random amount of time between 0 and 2 hours
2. Then run the task
3. So it's different every day!

Example:
- Monday: 7:00 AM → waits 45 minutes → runs at 7:45 AM
- Tuesday: 7:00 AM → waits 1 hour 30 min → runs at 8:30 AM
- Wednesday: 7:00 AM → waits 15 minutes → runs at 7:15 AM

---

## Customization:

Want to add your own zceer? Edit this file:
```
C:\TafsirKurd\scripts\random-zceer.js
```

Add to the `ZCEER_COLLECTION` array:
```javascript
'سُبْحَانَ اللّٰهِ',
'الْحَمْدُ لِلّٰهِ',
// Add your own Arabic text here
```

---

## That's It!

**Super simple:**
1. ✅ Just Arabic text
2. ✅ Random times throughout the day
3. ✅ One at a time
4. ✅ Different dhikr every time

Enjoy your random reminders! 🌙
