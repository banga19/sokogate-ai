#!/bin/bash
# cPanel deployment preparer
# Packages the app for upload to cPanel

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "=== Preparing deployment for cPanel ==="

# Install dependencies (skip dev deps if production flag)
if [ "$1" = "--production" ]; then
  echo "Installing production dependencies..."
  npm ci --only=production
else
  echo "Installing all dependencies..."
  npm ci
fi

# Build the app
echo "Building application..."
npm run build

# Create zip of deployable content
DEPLOY_DIR="${APP_DIR}/cpanel-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
cp package.json package-lock.json "$DEPLOY_DIR/"
cp -r build "$DEPLOY_DIR/"
cp .htaccess "$DEPLOY_DIR/" 2>/dev/null || true
cp .env.example "$DEPLOY_DIR/" 2>/dev/null || true

# Create zip
ZIP_NAME="sokogate-web-$(date +%Y%m%d-%H%M%S).zip"
cd "$DEPLOY_DIR/.."
zip -r "$ZIP_NAME" cpanel-deploy/ > /dev/null

echo "✅ Deployment package created: $ZIP_NAME"
echo ""
echo "Upload this zip to cPanel and extract into your Node.js app directory."
echo "Then configure in 'Setup Node.js App' with startup file: build/server/index.js"
