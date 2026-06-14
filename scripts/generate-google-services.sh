#!/bin/bash
# Generate google-services.json from GOOGLE_SERVICES_JSON secret
# This script patches the package name to match the current reseller build

set -e

echo "📋 Generating google-services.json..."

if [ -z "$GOOGLE_SERVICES_JSON" ]; then
  echo "❌ GOOGLE_SERVICES_JSON environment variable not set"
  exit 1
fi

if [ ! -f "reseller-config.json" ]; then
  echo "❌ reseller-config.json not found"
  exit 1
fi

# Read package name from reseller-config.json
PACKAGE_NAME=$(python3 -c "
import json
with open('reseller-config.json') as f:
    d = json.load(f)
pkg = d.get('config', {}).get('androidPackageName', '')
if not pkg:
    raise ValueError('androidPackageName not found in reseller-config.json')
print(pkg)
")

echo "📦 Target package: $PACKAGE_NAME"

# Write base config from secret
printf '%s' "$GOOGLE_SERVICES_JSON" > google-services-base.json

# Patch package name and write final file
python3 - "$PACKAGE_NAME" << 'PYEOF'
import json, sys, copy

package_name = sys.argv[1]

with open('google-services-base.json') as f:
    base = json.load(f)

# Clone the first client entry and update package name
template = base['client'][0]
new_client = copy.deepcopy(template)
new_client['client_info']['android_client_info']['package_name'] = package_name

# Replace client array
base['client'] = [new_client]

# Write final file
with open('google-services.json', 'w') as f:
    json.dump(base, f, indent=2)

print(f"✅ google-services.json generated for: {package_name}")
PYEOF

# Verify it worked
python3 -c "
import json
with open('google-services.json') as f:
    d = json.load(f)
for c in d['client']:
    print(f'  package: {c[\"client_info\"][\"android_client_info\"][\"package_name\"]}')
    print(f'  app_id : {c[\"client_info\"][\"mobilesdk_app_id\"]}')
"