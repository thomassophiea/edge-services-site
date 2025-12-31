#!/bin/bash
# Force Railway Deployment Script
# Guaranteed to trigger a new Railway deployment

set -e

echo "🚀 Forcing Railway Deployment..."
echo ""

# Update railway.toml with new timestamp to force rebuild
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
COMMIT=$(git rev-parse --short HEAD)

# Update the railway.toml comment
sed -i.bak "s/# Last Update:.*/# Last Update: $TIMESTAMP - Commit $COMMIT/" railway.toml
rm -f railway.toml.bak

echo "✅ Updated railway.toml with timestamp: $TIMESTAMP"
echo ""

# Commit and push
git add railway.toml
git commit -m "Force Railway redeploy - $TIMESTAMP

Trigger: Manual deployment via force-railway-deploy.sh
Commit: $COMMIT

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment triggered!"
echo "⏳ Railway will deploy in 1-2 minutes"
echo "🔗 Watch deployment: https://railway.app"
echo ""
echo "📊 Verify deployment:"
echo "   ./verify-deployment.sh"
