# Discord Webhooks Setup Guide

## Overview
Your website will now send Discord notifications to **3 different channels** based on the event type.

---

## 📋 Netlify Environment Variables

Go to **Netlify Dashboard** → **Your Site** → **Site configuration** → **Environment variables**

Add these **3 webhook URLs**:

### 1. 📊 Stats Channel (Main notifications)
- **Variable Name:** `DISCORD_WEBHOOK_URL`
- **Value:** `https://discord.com/api/webhooks/1450630296943857727/dHv-ipJ4IwUx6N8QdDPkumd54VEWID_1hLOL11sTy4v9UOVMu-SasqW9JH6iPdrNMbcd`
- **Sends:**
  - 🎉 New user signups
  - 🏆 Quran completions
  - ⭐ Reading milestones (1000, 2000, 3000+ ayahs)
  - 📍 Users from Duhok (special highlight)

### 2. 📧 Messages Channel
- **Variable Name:** `DISCORD_WEBHOOK_MESSAGES`
- **Value:** Get this from your **📧-messages** Discord channel:
  1. Go to Discord → Your server → **📧-messages** channel
  2. Click ⚙️ (Channel Settings) → **Integrations**
  3. Click **Webhooks** → **New Webhook**
  4. Name it: `Message Notifications`
  5. Copy the **Webhook URL**
  6. Paste it here in Netlify

- **Sends:**
  - 📧 Contact form submissions from index.html
  - 💬 All messages sent through the website

### 3. 👥 Visitors Channel
- **Variable Name:** `DISCORD_WEBHOOK_VISITORS`
- **Value:** Get this from your **👥-visitors** Discord channel (or create one):
  1. Go to Discord → Your server → Create a new channel called **visitors**
  2. Click ⚙️ (Channel Settings) → **Integrations**
  3. Click **Webhooks** → **New Webhook**
  4. Name it: `Visitor Tracking`
  5. Copy the **Webhook URL**
  6. Paste it here in Netlify

- **Sends:**
  - 👋 Every website visit (before login)
  - 📍 Location info (city, region, country)
  - 📄 Page visited
  - 🔗 Referrer source
  - 📍 Special highlight for Duhok visitors

---

## 🚀 Deployment Steps

1. **Add all 3 environment variables** to Netlify
2. Click **Save**
3. **Redeploy your site** (Netlify → Deploys → Trigger deploy)
4. Wait for deployment to complete (~2-3 minutes)

---

## ✅ What Will Happen

### 📊 Stats Channel Notifications:
- **Green** 🟢 → New user signup
- **Orange** 🟠 → User from Duhok signed up
- **Gold** 🟡 → Someone completed the Quran
- **Pink** 🌸 → Reading milestone (1000+ ayahs)

### 📧 Messages Channel Notifications:
- **Red** 🔴 → New contact message
- Shows: Name, Email, Subject, Message content

### 👥 Visitors Channel Notifications:
- **Teal** 🔵 → Someone visited the website
- **Orange** 🟠 → Visitor from Duhok
- Shows: City, Region, Country, Page, Referrer

---

## 🧪 Testing

After deployment, test each notification type:

1. **Test Visitor Tracking:**
   - Visit **tafsirkurd.com** from a different device/browser
   - Check **👥-visitors** channel in Discord

2. **Test Contact Message:**
   - Fill out contact form on index.html
   - Check **📧-messages** channel in Discord

3. **Test User Signup:**
   - Create a new test account
   - Complete signup with profile
   - Check **📊-stats** channel in Discord

---

## 🎯 Summary

Your Discord will now receive **real-time notifications** for:
- ✅ Every website visitor (even before login)
- ✅ Every contact message
- ✅ Every new user signup
- ✅ Quran completions
- ✅ Reading milestones
- ✅ Special alerts for Duhok users/visitors

All organized into 3 separate channels! 🎉
