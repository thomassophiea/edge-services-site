#!/bin/bash
# Deployment Verification Script
# Checks if the deployed version matches the latest commit

set -e

echo "🔍 Verifying Railway Deployment..."
echo ""

# Get current commit hash
LOCAL_COMMIT=$(git rev-parse HEAD)
LOCAL_COMMIT_SHORT=$(git rev-parse --short HEAD)

echo "📍 Local commit: $LOCAL_COMMIT_SHORT"
echo ""

# Fetch deployed version
echo "🌐 Fetching deployed version from Railway..."
DEPLOYED_VERSION=$(curl -s https://edge-services-site-production.up.railway.app/version.json 2>/dev/null || echo "{}")

if [ -z "$DEPLOYED_VERSION" ] || [ "$DEPLOYED_VERSION" = "{}" ]; then
    echo "⚠️  WARNING: Could not fetch version.json from deployment"
    echo "   This might mean the deployment hasn't finished yet"
    echo ""
    echo "🔄 Checking Railway deployment status..."
    echo "   Go to: https://railway.app/project/edge-services-site"
else
    DEPLOYED_COMMIT=$(echo "$DEPLOYED_VERSION" | grep -o '"commit":"[^"]*"' | cut -d'"' -f4 | head -c 7 2>/dev/null || echo "unknown")
    DEPLOYED_TIMESTAMP=$(echo "$DEPLOYED_VERSION" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")

    echo "🚀 Deployed commit: $DEPLOYED_COMMIT"
    echo "⏰ Deployed at: $DEPLOYED_TIMESTAMP"
    echo ""

    if [ "$LOCAL_COMMIT_SHORT" = "$DEPLOYED_COMMIT" ]; then
        echo "✅ SUCCESS: Deployment is up to date!"
    else
        echo "❌ MISMATCH: Deployed version is outdated"
        echo ""
        echo "Expected: $LOCAL_COMMIT_SHORT"
        echo "Got:      $DEPLOYED_COMMIT"
        echo ""
        echo "🔧 Fix:"
        echo "   1. Wait 2-3 minutes for Railway to deploy"
        echo "   2. Or manually trigger redeploy in Railway dashboard"
        echo "   3. Or run: git commit --allow-empty -m 'Force redeploy' && git push"
    fi
fi

echo ""
echo "🔗 Railway Dashboard: https://railway.app"
echo "🔗 Production URL: https://edge-services-site-production.up.railway.app"
