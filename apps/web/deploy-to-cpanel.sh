#!/bin/bash
#===========================================
# sokogate-ai cPanel Deployment Script
#===========================================
# This script prepares and deploys the Sokogate AI application to cPanel
# Usage: ./deploy-to-cpanel.sh [OPTIONS]
#   Options:
#     --upload      Create zip and upload via cPanel API (requires auth)
#     --build-only  Just build locally, create zip for manual upload
#     --clean       Clean build artifacts before building
#===========================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$APP_DIR")"
cd "$APP_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

#===========================================
# Step 1: Pre-flight checks
#===========================================
log_info "Starting cPanel deployment preparation..."

if [ ! -f "package.json" ]; then
  log_error "package.json not found. Are you in the correct directory?"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null || echo "")
if [ -z "$NODE_VERSION" ]; then
  log_error "Node.js is not installed or not in PATH"
  exit 1
fi
log_success "Node.js version: $NODE_VERSION"

#===========================================
# Step 2: Clean previous builds
#===========================================
if [ "$1" == "--clean" ] || [ "$2" == "--clean" ]; then
  log_info "Cleaning previous builds..."
  rm -rf node_modules build dist .next .turbo
  npm cache clean --force 2>/dev/null || true
fi

#===========================================
# Step 3: Install dependencies
#===========================================
log_info "Installing dependencies..."
if [ ! -d "node_modules" ]; then
  npm ci --legacy-peer-deps --no-audit --no-fund
else
  log_info "node_modules exists, verifying..."
  npm ci --legacy-peer-deps --no-audit --no-fund
fi

#===========================================
# Step 4: Build application
#===========================================
log_info "Building application for production..."
npm run build

if [ ! -d "build/server" ] || [ ! -f "build/server/index.js" ]; then
  log_error "Build failed - server build not found"
  exit 1
fi
log_success "Build completed: build/server/index.js created"

#===========================================
# Step 5: Verify build
#===========================================
log_info "Verifying build output..."
SERVER_SIZE=$(du -h build/server/index.js | cut -f1)
CLIENT_ASSETS=$(find build/client -type f 2>/dev/null | wc -l)
log_success "Server bundle: $SERVER_SIZE"
log_success "Client assets: $CLIENT_ASSETS files"

#===========================================
# Step 6: Create deployment package
#===========================================
DEPLOY_DIR="/tmp/cpanel-deploy-$$"
ZIP_NAME="sokogate-web-$(date +%Y%m%d-%H%M%S).zip"

log_info "Creating deployment package..."
mkdir -p "$DEPLOY_DIR/build"

# Copy essential files
cp package.json package-lock.json "$DEPLOY_DIR/" 2>/dev/null
cp .htaccess "$DEPLOY_DIR/" 2>/dev/null || true
cp .env.example "$DEPLOY_DIR/" 2>/dev/null || true
cp DEPLOY.md CPANEL_DEPLOY.md "$DEPLOY_DIR/" 2>/dev/null || true

# Copy build directories
if [ -d "build/server" ]; then
  cp -r build/server "$DEPLOY_DIR/build/"
fi
if [ -d "build/client" ]; then
  cp -r build/client "$DEPLOY_DIR/build/"
fi

# Create zip
cd "$DEPLOY_DIR/.."
zip -r "$ZIP_NAME" "cpanel-deploy-$$" > /dev/null 2>&1
ZIP_PATH="$(pwd)/$ZIP_NAME"

log_success "Deployment package created: $ZIP_PATH"
log_info "Package size: $(du -h "$ZIP_PATH" | cut -f1)"

#===========================================
# Step 7: Upload instructions
#===========================================
echo ""
echo "=========================================="
echo -e "${GREEN}DEPLOYMENT READY${NC}"
echo "=========================================="
echo ""
echo "Option A: Manual Upload via cPanel File Manager"
echo "  1. Go to cPanel → File Manager"
echo "  2. Navigate to: /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/"
echo "  3. Upload: $ZIP_NAME"
echo "  4. Extract to: /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/"
echo "  5. Go to 'Setup Node.js App' and configure:"
echo "     - Application root: apps/web"
echo "     - Startup file: build/server/index.js"
echo "     - Environment: production"
echo ""
echo "Option B: FTP/SFTP Upload"
echo "  1. Upload and extract the zip"
echo "  2. SSH into cPanel and run:"
echo "     cd ~/apps/web"
echo "     npm ci --production"
echo "     npm run build  # if needed"
echo "     # Then restart Node.js app"
echo ""
echo "=========================================="
echo "IMPORTANT: Set these environment variables in cPanel:"
echo "  - NODE_ENV=production"
echo "  - PORT=3000 (use the port cPanel assigns)"
echo "  - AUTH_SECRET (generate: openssl rand -hex 32)"
echo "  - DATABASE_URL (your Neon/Postgres connection)"
echo "  - NEXT_PUBLIC_APP_URL=https://sokogate-ai.ultimotradingltd.co.ke"
echo "=========================================="

# Cleanup
rm -rf "$DEPLOY_DIR"
