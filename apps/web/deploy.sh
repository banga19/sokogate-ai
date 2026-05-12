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

# Step 2: Build the application
echo ""
echo "🔨 Building application..."
npm run build

# Step 3: Create deployment zip
echo ""
echo "📁 Creating deployment package..."

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "❌ Error: build/ directory not found"
    exit 1
fi

# Create a zip of the build folder contents
cd build
zip -r ../sokogate-deploy.zip . -x "*.map" -x "*.ts" -x "*.tsx" -x "*.js.map"
cd ..

echo "✅ Created: sokogate-deploy.zip"
echo ""
echo "📋 Deployment Instructions:"
echo "1. Go to cPanel → Setup Node.js App"
echo "2. Create new app (or select existing):"
echo "   - Application root: public_html  (or your subfolder)"
echo "   - Startup file: build/server/index.js"
echo "   - Node version: 20"
echo "   - Mode: production"
echo ""
echo "3. Upload sokogate-deploy.zip to your app directory"
echo "   (e.g., ~/nodejsapp/ or ~/public_html/)"
echo "   Extract it so build/server/index.js exists at the root"
echo ""
echo "4. Set environment variables in cPanel:"
echo "   DATABASE_URL=postgres://..."
echo "   AUTH_SECRET=$(openssl rand -base64 32)"
echo "   NODE_ENV=production"
echo ""
echo "5. Run 'npm ci --only=production' in cPanel Terminal"
echo ""
echo "6. Click 'Restart App' in cPanel"
echo ""
echo "🌐 Your app will be live at: https://sokogate-ai.ultimotradingltd.co.ke"
echo ""
echo "📝 Optional: Run migrations manually before first start:"
echo "   node -e \"import('./src/app/api/utils/schema.js').then(m => m.ensureSchema())\""
