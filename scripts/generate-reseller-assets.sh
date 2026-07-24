#!/bin/bash

# ============================================
# Generate Reseller Assets for Build
# Called by GitHub Actions during APK build
# ============================================

set -e

API_URL="${API_URL:-https://edges-landing-page.vercel.app}"
CONFIG_ID="${CONFIG_ID:-}"
API_SECRET="${API_SECRET:-}"

if [ -z "$CONFIG_ID" ]; then
  echo "❌ CONFIG_ID is required"
  exit 1
fi

echo "📥 Fetching reseller config..."
CONFIG=$(curl -s "${API_URL}/api/build-config?configId=${CONFIG_ID}" \
  -H "Authorization: Bearer ${API_SECRET}")

if [ -z "$CONFIG" ]; then
  echo "❌ Failed to fetch config"
  exit 1
fi

# Save config for app.config.ts to read
echo "$CONFIG" > reseller-config.json

# Extract values
ICON_URL=$(echo "$CONFIG" | jq -r '.assets.icon // empty')
NOTIFICATION_ICON_URL=$(echo "$CONFIG" | jq -r '.assets.notificationIcon // empty')
STORE_NAME=$(echo "$CONFIG" | jq -r '.storeName // "reseller"')
PRIMARY_COLOR=$(echo "$CONFIG" | jq -r '.theme.primary // "#379114"')

echo "📱 Building for: $STORE_NAME"
echo "🎨 Brand color: $PRIMARY_COLOR"

# Create custom assets directory
mkdir -p assets/custom

# ------------------------------------------------------------------
# Make sure we can sanitize images. Reseller-uploaded PNGs sometimes
# carry things AAPT2 refuses to compile (ICC color profiles,
# interlacing, 16-bit depth, CMYK, or files that aren't really PNGs
# despite the extension). That produces errors like:
#   "AAPT: error: file failed to compile."
# deep inside :app:mergeReleaseResources, with no useful detail.
# We fix this by validating + re-encoding every downloaded image
# before it ever reaches the Android build.
# ------------------------------------------------------------------
if ! command -v convert >/dev/null 2>&1; then
  echo "📦 Installing ImageMagick for image sanitization..."
  sudo apt-get update -qq && sudo apt-get install -y -qq imagemagick
fi

# download_and_sanitize <url> <dest_path>
# Returns 0 on success (dest_path contains a clean PNG), 1 on failure.
download_and_sanitize() {
  local url="$1"
  local dest="$2"
  local tmp
  tmp=$(mktemp)

  # -f: fail on HTTP errors instead of saving an HTML error page as "image"
  if ! curl -fsSL "$url" -o "$tmp"; then
    echo "⚠️  Download failed for $url"
    rm -f "$tmp"
    return 1
  fi

  if [ ! -s "$tmp" ]; then
    echo "⚠️  Downloaded file is empty: $url"
    rm -f "$tmp"
    return 1
  fi

  local filetype
  filetype=$(file -b "$tmp")
  if ! echo "$filetype" | grep -qi "PNG image\|JPEG image\|WEBP"; then
    echo "⚠️  Downloaded file is not a recognizable image ($filetype): $url"
    rm -f "$tmp"
    return 1
  fi

  # Strip metadata/color profiles, force 8-bit non-interlaced RGBA PNG.
  # This is what actually fixes the AAPT2 'file failed to compile' error —
  # regardless of what specifically was wrong with the source file.
  if convert "$tmp" -strip -interlace none -depth 8 -define png:color-type=6 "$dest" 2>/tmp/convert_err.log; then
    rm -f "$tmp"
    return 0
  else
    echo "⚠️  Image sanitization failed for $url:"
    cat /tmp/convert_err.log
    rm -f "$tmp"
    return 1
  fi
}

# Download reseller's icon (use same sanitized image for all assets)
if [ -n "$ICON_URL" ] && [ "$ICON_URL" != "null" ]; then
  echo "📥 Downloading icon from: $ICON_URL"
  if download_and_sanitize "$ICON_URL" "assets/custom/icon.png"; then
    cp assets/custom/icon.png assets/custom/splash.png
    cp assets/custom/icon.png assets/custom/adaptive-icon.png
    echo "✅ Custom assets downloaded and sanitized"
  else
    echo "⚠️  Icon unusable — falling back to bundled defaults instead of failing the build"
    cp assets/images/icon.png assets/custom/icon.png 2>/dev/null || true
    cp assets/images/splash.png assets/custom/splash.png 2>/dev/null || true
    cp assets/images/adaptive-icon.png assets/custom/adaptive-icon.png 2>/dev/null || true
  fi
else
  echo "⚠️ No custom icon URL — using defaults"
  cp assets/images/icon.png assets/custom/icon.png 2>/dev/null || true
  cp assets/images/splash.png assets/custom/splash.png 2>/dev/null || true
  cp assets/images/adaptive-icon.png assets/custom/adaptive-icon.png 2>/dev/null || true
fi

# Notification icon — fall back to bundled default rather than failing the build
if [ -n "$NOTIFICATION_ICON_URL" ] && [ "$NOTIFICATION_ICON_URL" != "null" ]; then
  echo "📥 Downloading notification icon from: $NOTIFICATION_ICON_URL"
  if download_and_sanitize "$NOTIFICATION_ICON_URL" "assets/custom/notification-icon.png"; then
    echo "✅ Notification icon downloaded and sanitized"
  else
    echo "⚠️  Notification icon unusable — falling back to bundled default"
    cp assets/images/notification-icon.png assets/custom/notification-icon.png
  fi
else
  echo "⚠️ No notification icon URL — using bundled default"
  cp assets/images/notification-icon.png assets/custom/notification-icon.png
fi

cp assets/custom/notification-icon.png assets/images/notification-icon.png

echo "✅ Reseller assets ready"


# #!/bin/bash

# # ============================================
# # Generate Reseller Assets for Build
# # Called by GitHub Actions during APK build
# # ============================================

# set -e

# API_URL="${API_URL:-https://edges-landing-page.vercel.app}"
# CONFIG_ID="${CONFIG_ID:-}"
# API_SECRET="${API_SECRET:-}"

# if [ -z "$CONFIG_ID" ]; then
#   echo "❌ CONFIG_ID is required"
#   exit 1
# fi

# echo "📥 Fetching reseller config..."
# CONFIG=$(curl -s "${API_URL}/api/build-config?configId=${CONFIG_ID}" \
#   -H "Authorization: Bearer ${API_SECRET}")

# if [ -z "$CONFIG" ]; then
#   echo "❌ Failed to fetch config"
#   exit 1
# fi

# # Save config for app.config.ts to read
# echo "$CONFIG" > reseller-config.json

# # Extract values
# ICON_URL=$(echo "$CONFIG" | jq -r '.assets.icon // empty')
# NOTIFICATION_ICON_URL=$(echo "$CONFIG" | jq -r '.assets.notificationIcon // empty')
# STORE_NAME=$(echo "$CONFIG" | jq -r '.storeName // "reseller"')
# PRIMARY_COLOR=$(echo "$CONFIG" | jq -r '.theme.primary // "#379114"')

# echo "📱 Building for: $STORE_NAME"
# echo "🎨 Brand color: $PRIMARY_COLOR"

# # Create custom assets directory
# mkdir -p assets/custom

# # Download reseller's icon (use same image for all assets)
# if [ -n "$ICON_URL" ] && [ "$ICON_URL" != "null" ]; then
#   echo "📥 Downloading icon from: $ICON_URL"
#   curl -L "$ICON_URL" -o assets/custom/icon.png
#   cp assets/custom/icon.png assets/custom/splash.png
#   cp assets/custom/icon.png assets/custom/adaptive-icon.png
#   echo "✅ Custom assets downloaded"
# else
#   echo "⚠️ No custom icon URL — using defaults"
#   cp assets/images/icon.png assets/custom/icon.png 2>/dev/null || true
#   cp assets/images/splash.png assets/custom/splash.png 2>/dev/null || true
#   cp assets/images/adaptive-icon.png assets/custom/adaptive-icon.png 2>/dev/null || true
# fi

# # Notification icon — fall back to bundled default rather than failing the build
# if [ -n "$NOTIFICATION_ICON_URL" ] && [ "$NOTIFICATION_ICON_URL" != "null" ]; then
#   echo "📥 Downloading notification icon from: $NOTIFICATION_ICON_URL"
#   curl -L "$NOTIFICATION_ICON_URL" -o assets/custom/notification-icon.png
#   echo "✅ Notification icon downloaded"
# else
#   echo "⚠️ No notification icon URL — using bundled default"
#   cp assets/images/notification-icon.png assets/custom/notification-icon.png
# fi

# cp assets/custom/notification-icon.png assets/images/notification-icon.png

# echo "✅ Reseller assets ready"
