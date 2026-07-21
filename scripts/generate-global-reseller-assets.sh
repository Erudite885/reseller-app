#!/bin/bash

# ============================================
# Generate Global Reseller Assets for [CountryCode] Build
# Called by GitHub Actions during APK build
# Fetches config from global_reseller_app_configs
# ============================================

set -e

API_URL="${API_URL:-https://edges-landing-page.vercel.app}"
CONFIG_ID="${CONFIG_ID:-}"
API_SECRET="${API_SECRET:-}"
COUNTRY_CODE="${COUNTRY_CODE:-}"

if [ -z "$CONFIG_ID" ]; then
  echo "❌ CONFIG_ID is required"
  exit 1
fi

if [ -z "$COUNTRY_CODE" ]; then
  echo "⚠️ COUNTRY_CODE not provided, attempting to detect..."
  # Try to extract from config ID or use default
  COUNTRY_CODE="ng"
fi

echo "📥 Fetching global reseller config..."
echo "   Config ID: $CONFIG_ID"
echo "   Country: $COUNTRY_CODE"

# Try the country-specific endpoint first
CONFIG=$(curl -s "${API_URL}/api/reseller/${COUNTRY_CODE}/config/${CONFIG_ID}" \
  -H "Authorization: Bearer ${API_SECRET}")

# If that fails, try the generic build-config endpoint
if [ -z "$CONFIG" ] || [ "$(echo "$CONFIG" | jq -r '.error // empty')" != "" ]; then
  echo "⚠️ Country-specific endpoint failed, trying generic endpoint..."
  CONFIG=$(curl -s "${API_URL}/api/build-config?configId=${CONFIG_ID}" \
    -H "Authorization: Bearer ${API_SECRET}")
fi

# Validate we got a config
if [ -z "$CONFIG" ] || [ "$(echo "$CONFIG" | jq -r '.error // empty')" != "" ]; then
  echo "❌ Failed to fetch config"
  echo "Response: $CONFIG"
  exit 1
fi

# Save config for app.config.ts to read
echo "$CONFIG" > reseller-config.json

# Extract values with fallbacks
STORE_NAME=$(echo "$CONFIG" | jq -r '.storeName // .config.storeName // "reseller"')
APP_NAME=$(echo "$CONFIG" | jq -r '.appName // .config.appName // $STORE_NAME')
PRIMARY_COLOR=$(echo "$CONFIG" | jq -r '.theme.primary // .config.theme.primary // "#379114"')

# Package name extraction - try multiple paths
PACKAGE_NAME=$(echo "$CONFIG" | jq -r '.config.androidPackageName // empty')
if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" = "null" ]; then
  PACKAGE_NAME=$(echo "$CONFIG" | jq -r '.androidPackageName // empty')
fi
if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" = "null" ]; then
  PACKAGE_NAME=$(echo "$CONFIG" | jq -r '.config.packageName // empty')
fi

# Assets
ICON_URL=$(echo "$CONFIG" | jq -r '.assets.icon // .config.assets.icon // empty')
NOTIFICATION_ICON_URL=$(echo "$CONFIG" | jq -r '.assets.notificationIcon // .config.assets.notificationIcon // empty')
SPLASH_URL=$(echo "$CONFIG" | jq -r '.assets.splash // .config.assets.splash // empty')
ADAPTIVE_ICON_URL=$(echo "$CONFIG" | jq -r '.assets.adaptiveIcon // .config.assets.adaptiveIcon // empty')

echo "📱 Building for: $STORE_NAME"
echo "📱 App Name: $APP_NAME"
echo "🎨 Brand color: $PRIMARY_COLOR"

# Generate package name if not found
if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" = "null" ]; then
  CLEAN_STORE=$(echo "$STORE_NAME" | tr -d '-' | tr -d '_')
  PACKAGE_NAME="com.edges.${CLEAN_STORE:-app}"
  echo "📦 Generated package name: $PACKAGE_NAME"
  # Inject back into config
  CONFIG=$(echo "$CONFIG" | jq --arg pkg "$PACKAGE_NAME" '.config.androidPackageName = $pkg | .androidPackageName = $pkg')
  echo "$CONFIG" > reseller-config.json
else
  echo "📦 Package name: $PACKAGE_NAME"
fi

# Create custom assets directory
mkdir -p assets/custom

# Download reseller's icon
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

# Notification icon — fall back to bundled default
if [ -n "$NOTIFICATION_ICON_URL" ] && [ "$NOTIFICATION_ICON_URL" != "null" ]; then
  echo "📥 Downloading notification icon from: $NOTIFICATION_ICON_URL"
  curl -L "$NOTIFICATION_ICON_URL" -o assets/custom/notification-icon.png
  echo "✅ Notification icon downloaded"
else
  echo "⚠️ No notification icon URL — using bundled default"
  cp assets/images/notification-icon.png assets/custom/notification-icon.png 2>/dev/null || true
fi

# Ensure notification icon is in the right place
if [ -f "assets/custom/notification-icon.png" ]; then
  cp assets/custom/notification-icon.png assets/images/notification-icon.png
fi

echo "✅ Global reseller assets ready"
echo "   Store: $STORE_NAME"
echo "   Package: $PACKAGE_NAME"