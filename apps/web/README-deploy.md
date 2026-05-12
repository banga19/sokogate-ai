# Sokogate AI Deployment Guide

## Quick Deploy (3 Steps)

### Step 1: Build Locally
```bash
cd /home/apop/sokogate-ai/apps/web
./deploy.sh
# (or double-click deploy.bat on Windows)
```
→ Creates `sokogate-deploy.zip`.

The build process automatically copies `src/` into `build/` via the `postbuild` script, so the zip contains `build/src/app/api/...` with all API routes.

### Step 2: Upload to cPanel
1. Go to **cPanel → Setup Node.js App**
2. Create app:
   - **Application root**: `public_html` (or a subfolder)
   - **Startup file**: `build/server/index.js`
   - **Node version**: `20`
   - **Mode**: `production`
3. Upload `sokogate-deploy.zip` to your app directory
4. Extract it. Final structure must include:
   ```
   ~/nodejsapp/build/server/index.js
   ~/nodejsapp/build/src/app/api/... (route files inside build)
   ```

### Step 3: Configure & Launch
Add these **environment variables** in cPanel:

| Key | Value |
|---|---|
| `DATABASE_URL` | Your Postgres connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://sokogate-ai.ultimotradingltd.co.ke` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NODE_ENV` | `production` |
| `NODE_OPTIONS` | `--max-old-space-size=512` |

Then:
- In cPanel Terminal: `cd ~/nodejsapp && npm ci --only=production`
- Click **Restart App** in cPanel

✅ Done! **https://sokogate-ai.ultimotradingltd.co.ke**

---

## Why These Steps?

### ENOENT Fix
The server's route scanner expects `build/src/app/api` to exist (relative to `build/server/index.js`). The `postbuild` script copies `src/` into `build/` so routes are found. Without this you see:
```
Error: ENOENT: no such file or directory, scandir '.../build/src/app/api'
```

### OOM Fix
CloudLinux LVE limits per-process memory (often 512 MB). Node's default (~2 GB) exceeds this, causing:
```
RangeError: WebAssembly.instantiate(): Out of memory
```
`NODE_OPTIONS=--max-old-space-size=512` caps the V8 heap to 512 MB. If crashes persist, reduce to `256` or ask host to raise your LVE quota.

---

## Verify

```bash
curl https://sokogate-ai.ultimotradingltd.co.ke/api/investors
# Expected: []

curl https://sokogate-ai.ultimotradingltd.co.ke/api/metrics
# Expected: []
```

Check **cPanel → Node.js → Application Logs** for errors.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ENOENT: scandir .../build/src/app/api` | `build/src` missing | Re-upload zip; confirm `build/src/app/api` exists |
| `Out of memory` / `LVE limits` | `NODE_OPTIONS` missing/too high | Set to `--max-old-space-size=512` or `256` |
| 502 Bad Gateway | Startup file wrong or crashed | Ensure startup = `build/server/index.js`; check logs |
| Empty response | Routes not registered | Look for "Route registration" messages in logs |
