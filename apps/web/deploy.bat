@echo off
REM sokogate-ai deployment script for cPanel (Windows)
REM This prepares the build folder for upload to cPanel Node.js hosting

echo ========================================
echo Sokogate AI Deploy Script
echo ========================================

REM Check we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found.
    echo Run this from the sokogate-ai\apps\web directory
    pause
    exit /b 1
)

REM Step 1: Install dependencies
echo.
echo Installing dependencies...
call npm ci
if errorlevel 1 (
    echo npm ci failed
    pause
    exit /b 1
)

REM Step 2: Build the application
echo.
echo Building application...
call npm run build
if errorlevel 1 (
    echo Build failed
    pause
    exit /b 1
)

REM Step 3: Create deployment zip
echo.
echo Creating deployment package...

if not exist "build" (
    echo Error: build\ directory not found
    pause
    exit /b 1
)

REM Create zip (requires PowerShell)
powershell -Command "Compress-Archive -Path build\* -DestinationPath sokogate-deploy.zip -Force"

echo Created: sokogate-deploy.zip
echo.
echo ========================================
echo Deployment Instructions
echo ========================================
echo 1. Go to cPanel -> Setup Node.js App
echo 2. Create new app (or select existing):
echo    - Application root: public_html  (or your subfolder)
echo    - Startup file: build/server/index.js
echo    - Node version: 20
echo    - Mode: production
echo.
echo 3. Upload sokogate-deploy.zip to your app directory
echo    Extract it so build/server/index.js exists at the root
echo.
echo 4. Set environment variables in cPanel:
echo    DATABASE_URL=postgres://...
echo    AUTH_SECRET=random-32-char-string
echo    NODE_ENV=production
echo.
echo 5. Run "npm ci --only=production" in cPanel Terminal
echo.
echo 6. Click "Restart App" in cPanel
echo.
echo Your app will be live at: https://sokogate-ai.ultimotradingltd.co.ke
echo.
echo Optional: Run migrations manually before first start:
echo   node -e "import('./src/app/api/utils/schema.js').then(m => m.ensureSchema())"
echo.
pause
