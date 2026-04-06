#!/bin/bash
# Android release build + auto-notify users
# Run this when releasing a new version to Play Store
# Usage: bash scripts/release-android.sh

set -e

JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
ADB="C:/Users/Ferminus/AppData/Local/Android/Sdk/platform-tools/adb.exe"

echo "=== TafsirKurd Android Release ==="

echo "[1/4] Capacitor sync..."
npx cap sync android

echo "[2/4] Clean build..."
cd android
JAVA_HOME="$JAVA_HOME" ./gradlew clean assembleRelease
cd ..

echo "[3/4] Build complete."
echo "      APK: android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "      Upload this APK to Google Play Console now."
echo "      Press Enter when the update is live on Play Store..."
read -r

echo "[4/4] Sending update notification to all users..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://tafsirkurd.com/push-notifications \
  -H "Content-Type: application/json" \
  -H "X-Push-Secret: $PUSH_SECRET" \
  -d "{\"title\":\"ئاپدەیتەکا نوی بەردەستە.\",\"body\":\"ئەپێ تەفسیرکورد ئاپدەیت بکە — وەشانەکا نوی بەردەستە.\"}")

if [ "$RESULT" = "200" ]; then
  echo "      Notification sent to all users!"
else
  echo "      Notification failed (HTTP $RESULT) — send manually from admin panel."
fi

echo ""
echo "=== Release complete ==="
