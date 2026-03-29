#!/bin/bash
# convert-athan-to-caf.sh
#
# Converts iOS athan .m4a files to .caf format.
# CAF (Core Audio Format) is Apple's officially supported container for
# UNNotificationSound — guaranteed to play on all iOS versions.
#
# REQUIREMENTS (macOS only):
#   - afconvert  (built into macOS, no install needed)
#
# USAGE:
#   cd /path/to/TafsirKurd
#   bash scripts/convert-athan-to-caf.sh
#
# OUTPUT:
#   ios/App/App/athan_mishary.caf
#   ios/App/App/athan_nasser.caf
#   ios/App/App/athan_omar.caf
#   ios/App/App/athan_peshawa.caf
#   ios/App/App/athan_raad.caf
#
# The original .m4a files are NOT deleted or modified.
# After running this script:
#   1. Update prayer.notifications.android.js: change '.m4a' → '.caf' in iOS soundFile line
#   2. Update the 5 PBXFileReference entries in project.pbxproj: m4a → caf
#   3. Update the 5 PBXBuildFile entries in project.pbxproj: m4a → caf
#   4. Rebuild the iOS app

set -e

VOICES="mishary nasser omar peshawa raad"
SRC_DIR="ios/App/App"
OUT_DIR="ios/App/App"

# Confirm we are in the repo root
if [ ! -f "capacitor.config.ts" ]; then
  echo "ERROR: Run this script from the TafsirKurd repo root."
  exit 1
fi

echo "Converting athan .m4a files to .caf (AAC, 44100 Hz, stereo)..."
echo ""

for voice in $VOICES; do
  SRC="$SRC_DIR/athan_${voice}.m4a"
  OUT="$OUT_DIR/athan_${voice}.caf"

  if [ ! -f "$SRC" ]; then
    echo "  SKIP: $SRC not found"
    continue
  fi

  # afconvert flags:
  #   -f caff      → CAF container (Core Audio Format)
  #   -d aac       → AAC codec (retains quality, iOS supports AAC in CAF)
  #   -c 2         → stereo
  #   --soundcheck-generate → embeds SoundCheck tag (consistent volume)
  afconvert "$SRC" "$OUT" -f caff -d aac -c 2 --soundcheck-generate

  if [ -f "$OUT" ]; then
    SRC_SIZE=$(stat -f%z "$SRC" 2>/dev/null || stat -c%s "$SRC")
    OUT_SIZE=$(stat -f%z "$OUT" 2>/dev/null || stat -c%s "$OUT")
    echo "  OK: athan_${voice}.caf  ($SRC_SIZE → $OUT_SIZE bytes)"
  else
    echo "  FAIL: athan_${voice}.caf was not created"
    exit 1
  fi
done

echo ""
echo "Done. Next steps:"
echo "  1. Verify the .caf files play correctly in QuickTime or VLC"
echo "  2. Ask Claude to update prayer.notifications.android.js + project.pbxproj"
echo "  3. Rebuild the iOS app"
echo ""
echo "The original .m4a files in ios/App/App/ are untouched."
