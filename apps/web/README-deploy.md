# Sokogate AI Deployment Guide

## Quick Deploy (3 Steps)

### Step 1: Build Locally
```bash
cd /home/apop/sokogate-ai/apps/web
./deploy.sh
# (or double-click deploy.bat on Windows)
```
→ Creates `sokogate-deploy.zip`

### Step 2: Upload to cPanel
1. Go to **cPanel → Setup Node.js App**
2. Create app:
   - **Application root**: `public_html` (or `public_html/sokogate`)
   - **Startup file**: `build/server/index.js`
   - **Node version**: `20`
   - **Mode**: `production`
3. Upload `sokogate-deploy.zip` to your app directory
4. Extract it (so `build/server/index.js` is at the root of your app folder)

### Step 3: Configure & Launch
In cPanel Node.js app settings, add these **environment variables**:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgres://user:pass@host:port/db` |
| `AUTH_SECRET` | run `openssl rand -base64 32` locally to generate |
| `NODE_ENV` | `production` |

Then:
- SSH into cPanel or use **Terminal**
- Run: `npm ci --only=production`
- Click **Restart App** in cPanel

✅ Done! Your app is live at:
**https://sokogate-ai.ultimotradingltd.co.ke**

---

## First-Time Database Setup

The app auto-creates all tables on first start. No manual migrations needed.

If you want to run manually before starting:
```bash
cd ~/nodejsapp  # or wherever your app lives
node -e "import('./src/app/api/utils/schema.js').then(m => m.ensureSchema())"
```

---

## Verify Installation

Test these endpoints:
```bash
curl https://sokogate-ai.ultimotradingltd.co.ke/api/investors
# Should return: []

curl https://sokogate-ai.ultimotradingltd.co.ke/api/metrics
# Should return: []
```

Check cPanel logs if anything fails.
