@echo off
REM cPanel deployment preparer for Windows
setlocal enabledelayedexpansion

echo === Preparing deployment for cPanel ===

REM Install dependencies
if "%1"=="--production" (
    echo Installing production dependencies...
    call npm ci --only=production
) else (
    echo Installing all dependencies...
    call npm ci
)

REM Build the app
echo Building application...
call npm run build

REM Create deploy package
set DEPLOY_DIR=.\cpanel-deploy
if exist "%DEPLOY_DIR%" rmdir /s /q "%DEPLOY_DIR%"
mkdir "%DEPLOY_DIR%"

copy package.json "%DEPLOY_DIR%"
copy package-lock.json "%DEPLOY_DIR%"
copy .htaccess "%DEPLOY_DIR%" 2>nul
copy .env.example "%DEPLOY_DIR%" 2>nul
xcopy /E /I build "%DEPLOY_DIR%\build"

REM Zip it (requires PowerShell)
set TIMESTAMP=%date:~-4%%date:~4,2%%date:~7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set ZIP_NAME=sokogate-web-%TIMESTAMP%.zip

powershell -Command "Compress-Archive -Path '%DEPLOY_DIR%\*' -DestinationPath '%ZIP_NAME%' -Force"

echo.
echo ========================================
echo Deployment package created: %ZIP_NAME%
echo ========================================
echo.
echo Upload this zip to cPanel and extract into your Node.js app directory.
echo Then configure in 'Setup Node.js App' with startup file: build^/server^/index.js

endlocal
