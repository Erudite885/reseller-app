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

# Extract values
ICON_URL=$(echo "$CONFIG" | jq -r '.assets.icon // empty')
STORE_NAME=$(echo "$CONFIG" | jq -r '.storeName // "reseller"')
PRIMARY_COLOR=$(echo "$CONFIG" | jq -r '.theme.primary // "#379114"')

echo "📱 Building for: $STORE_NAME"
echo "🎨 Brand color: $PRIMARY_COLOR"

# Create custom assets directory
mkdir -p assets/custom

# Download reseller's icon (use same image for all assets)
if [ -n "$ICON_URL" ] && [ "$ICON_URL" != "null" ]; then
  echo "📥 Downloading icon from: $ICON_URL"
  curl -L "$ICON_URL" -o assets/custom/icon.png
  cp assets/custom/icon.png assets/custom/splash.png
  cp assets/custom/icon.png assets/custom/adaptive-icon.png
  echo "✅ Custom assets downloaded"
else
  echo "⚠️ No custom icon URL — using defaults"
  cp assets/images/icon.png assets/custom/icon.png 2>/dev/null || true
  cp assets/images/splash.png assets/custom/splash.png 2>/dev/null || true
  cp assets/images/adaptive-icon.png assets/custom/adaptive-icon.png 2>/dev/null || true
fi

# Save config with LOCAL paths instead of remote URLs
echo "$CONFIG" | jq '
  .assets.icon = "./assets/custom/icon.png" |
  .assets.splash = "./assets/custom/splash.png" |
  .assets.adaptiveIcon = "./assets/custom/adaptive-icon.png" |
  .assets.logo = "./assets/custom/icon.png"
' > reseller-config.json

echo "✅ Reseller assets ready"