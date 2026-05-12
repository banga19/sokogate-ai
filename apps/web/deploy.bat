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

REM Step 2: Build the application (production)
echo.
echo Building application (production)...
set NODE_ENV=production
call npm run build
if errorlevel 1 (
    echo Build failed
    pause
    exit /b 1
)

REM Step 3: Create deployment zip (build/ now contains src/)
echo.
echo Creating deployment package...

if not exist "build" (
    echo Error: build\ directory not found
    pause
    exit /b 1
)

REM Create temp folder with build (which includes src after postbuild)
mkdir deploy-pkg 2>nul
xcopy /E /I build deploy-pkg\build\ 2>nul
copy package.json deploy-pkg\ 2>nul
copy package-lock.json deploy-pkg\ 2>nul

REM Create zip (requires PowerShell)
powershell -Command "Compress-Archive -Path deploy-pkg\* -DestinationPath sokogate-deploy.zip -Force"

REM Cleanup
rmdir /S /Q deploy-pkg

echo Created: sokogate-deploy.zip
echo.
echo ========================================
echo cPanel Deployment Steps
echo ========================================
echo 1. cPanel -> Setup Node.js App
echo    - Application root: public_html (or your folder)
echo    - Startup file: build/server/index.js
echo    - Node version: 20
echo    - Mode: production
echo.
echo 2. Upload sokogate-deploy.zip to your app directory
echo    Extract it. Ensure structure:
echo    ~/nodejsapp/build/server/index.js
echo    ~/nodejsapp/build/src/app/api/... (inside build/src)
echo.
echo 3. Set environment variables in cPanel:
echo    DATABASE_URL=postgres://...
echo    AUTH_SECRET=random-32-char-string
echo       (generate: openssl rand -base64 32)
echo    AUTH_URL=https://sokogate-ai.ultimotradingltd.co.ke
echo    ANTHROPIC_API_KEY=sk-ant-...
echo    NODE_OPTIONS=--max-old-space-size=512
echo.
echo 4. In cPanel Terminal run:
echo    cd ~/nodejsapp
echo    npm ci --only=production
echo.
echo 5. Click "Restart App" in cPanel Node.js
echo.
echo Your app: https://sokogate-ai.ultimotradingltd.co.ke
echo.
echo If OOM persists, try: NODE_OPTIONS=--max-old-space-size=256
echo or request LVE quota increase from host.
echo.
pause
