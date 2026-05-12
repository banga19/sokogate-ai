#!/bin/bash
# sokogate-ai deployment script for cPanel
# This prepares the build folder for upload to cPanel Node.js hosting

set -e

echo "🚀 Sokogate AI Deploy Script"
echo "=============================="

# Check we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this from the /home/apop/sokogate-ai/apps/web directory"
    exit 1
fi

# Step 1: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Step 2: Build the application (production)
echo ""
echo "🔨 Building application (production)..."
export NODE_ENV=production
npm run build

# Step 3: Create deployment package
echo ""
echo "📁 Creating deployment package..."

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "❌ Error: build/ directory not found"
    exit 1
fi

# Create a temporary directory for packaging
mkdir -p deploy-pkg
cp -r build deploy-pkg/
cp package.json package-lock.json deploy-pkg/ 2>/dev/null || true

# Create zip (exclude node_modules, sourcemaps, types)
cd deploy-pkg
zip -r ../sokogate-deploy.zip . -x "*/node_modules/*" "*.map" "*.ts" "*.tsx"
cd ..

# Cleanup temp dir
rm -rf deploy-pkg

echo "✅ Created: sokogate-deploy.zip"
echo ""
echo "📋 cPanel Deployment Steps:"
echo "1. cPanel → Setup Node.js App"
echo "   - Application root: public_html  (or your chosen folder)"
echo "   - Startup file: build/server/index.js"
echo "   - Node version: 20"
echo "   - Mode: production"
echo ""
echo "2. Upload sokogate-deploy.zip to your app directory"
echo "   Extract it. Final structure should have:"
echo "   ~/nodejsapp/build/server/index.js"
echo "   ~/nodejsapp/build/src/app/api/... (route files inside build/src)"
echo ""
echo "3. Set environment variables in cPanel:"
echo "   DATABASE_URL=<your-postgres-url>"
echo "   AUTH_SECRET=$(openssl rand -base64 32)"
echo "   AUTH_URL=https://sokogate-ai.ultimotradingltd.co.ke"
echo "   ANTHROPIC_API_KEY=<your-key>"
echo "   NODE_OPTIONS=--max-old-space-size=512"
echo ""
echo "4. In cPanel Terminal, run:"
echo "   cd ~/nodejsapp"
echo "   npm ci --only=production"
echo ""
echo "5. Click 'Restart App' in cPanel Node.js interface"
echo ""
echo "🌐 App: https://sokogate-ai.ultimotradingltd.co.ke"
echo ""
echo "📝 If OOM persists, try NODE_OPTIONS=--max-old-space-size=256"
echo "   or request LVE quota increase from your host."
