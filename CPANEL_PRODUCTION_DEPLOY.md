# cPanel Production Deployment Guide
## Sokogate AI – Pre-built Runtime Package (Option B)

---

## 📦 What You Have

**Deployment ZIP**: `sokogate-cpanel-production.zip` (452 KB)

**Contents** (minimal, production-ready):
```
apps/web/
├── package.json           ← runtime config + scripts
├── package-lock.json      ← locked dependencies
└── build/                 ← pre-compiled assets
    ├── server/
    │   ├── index.js       ← Node.js entry point (27 KB)
    │   └── assets/        ← server bundles
    └── client/
        └── assets/        ← static files (CSS, JS, images)
```

**Not included**: `node_modules/`, `src/`, `devDependencies` — these are not needed on the server.

---

## 🚀 Deployment Steps

### Step 1: Upload ZIP to cPanel

**Via File Manager** (recommended):
1. Log into cPanel → **File Manager**
2. Navigate to: `/home2/ultimotr/`
3. Click **Upload** → select `sokogate-cpanel-production.zip`
4. After upload, select the file → **Extract**
5. Confirm extraction path: `/home2/ultimotr/`
6. Resulting structure should be:
   ```
   /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web/package.json
   ```

**Via SFTP/FTP**:
```bash
sftp ultimotr@yourdomain.com
cd /home2/ultimotr
put sokogate-cpanel-production.zip
# Then extract via File Manager or SSH
```

---

### Step 2: Configure Node.js App in cPanel

1. **cPanel → Software → Setup Node.js App → Create Application**

   | Field | Value |
   |-------|-------|
   | **Application mode** | `production` |
   | **Application root** | `apps/web` |
   | **Application URL** | `sokogate-ai.ultimotradingltd.co.ke` (or your domain) |
   | **Application startup file** | `build/server/index.js` |
   | **Environment** | `production` |
   | **Node.js version** | `20` or higher |

   ⚠️ **Critical**: Application root must be exactly `apps/web` (relative to your account home). This is where `package.json` lives.

2. **Set Environment Variables** (click "Add" for each):

   | Variable | Value | Required |
   |----------|-------|----------|
   | `NODE_ENV` | `production` | Yes |
   | `PORT` | `3000` | Yes (use port shown in cPanel UI) |
   | `AUTH_SECRET` | `openssl rand -hex 32` | Yes |
   | `DATABASE_URL` | `postgresql://...` | Yes |
   | `NEXT_PUBLIC_APP_URL` | `https://sokogate-ai.ultimotradingltd.co.ke` | Yes |
   | `NEXT_PUBLIC_CREATE_BASE_URL` | `https://www.create.xyz` | Optional |
   | `NEXT_PUBLIC_CREATE_HOST` | `sokogate-ai.ultimotradingltd.co.ke` | Optional |
   | `CORS_ORIGINS` | `https://sokogate-ai.ultimotradingltd.co.ke` | Optional |

3. Click **Create**

---

### Step 3: Install Production Dependencies

In the Node.js App list:

1. Find your app → click the **pencil icon** (Edit)
2. Click **Run NPM Install**
   - This runs `npm ci --only=production` (respects `NPM_CONFIG_PRODUCTION=true`)
   - Installs only `dependencies` (not `devDependencies`)
   - Uses your `package-lock.json` for deterministic install
3. Wait 1–3 minutes (≈ 600 packages)

**Alternative via Terminal**:
```bash
cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web
npm ci --only=production --no-audit --no-fund
```

---

### Step 4: Restart Application

- In cPanel Node.js App UI → **Restart Application**
- Wait 5–10 seconds
- Check **Application Log** for:
  ```
  Server running on port 3000
  ```

---

### Step 5: Verify Deployment

1. **Visit your domain**:
   ```
   https://sokogate-ai.ultimotradingltd.co.ke
   ```

2. **Check SSR is working**:
   - Right-click → View Page Source
   - You should see HTML content (not just `<div id="root"></div>`)

3. **Test API**:
   ```
   https://sokogate-ai.ultimotradingltd.co.ke/api/auth/...
   ```

---

## 📁 Expected File Structure on cPanel

```
/home2/ultimotr/
└── sokogate-ai.ultimotradingltd.co.ke/
    └── apps/
        └── web/
            ├── package.json          (3 KB)
            ├── package-lock.json     (480 KB)
            ├── node_modules/         ← created by npm ci
            │   ├── @auth/core/
            │   ├── hono/
            │   ├── ws/
            │   └── ...
            └── build/
                ├── server/
                │   ├── index.js       (27 KB) ← STARTUP
                │   ├── assets/
                │   │   ├── server-build.js
                │   │   ├── fetch-*.js
                │   │   └── ...
                │   └── .vite/
                └── client/
                    └── assets/
                        ├── entry.client-*.js
                        ├── root-*.css
                        ├── page-*.js
                        └── ...
```

---

## 🔧 Common Issues & Fixes

### **"Configuration file not found: .../package.json"**

**Cause**: Application root points to wrong directory.

**Fix**:
1. Edit Node.js App in cPanel
2. Set Application root to `apps/web` (not `/home2/.../sokogate-ai.ultimotradingltd.co.ke/`)
3. Save and restart

---

### **"Cannot find module 'build/server/index.js'"**

**Cause**: Build not uploaded or path incorrect.

**Fix**:
```bash
# Check file exists
ls -la /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web/build/server/index.js

# If missing, upload ZIP again, extract to correct location
# Ensure extraction creates apps/web/build/ not web/build/
```

---

### **"Error: Cannot find module '@auth/core'"** (or any other package)

**Cause**: Dependencies not installed on cPanel.

**Fix**:
```bash
cd ~/apps/web
npm ci --only=production
# OR use cPanel UI "Run NPM Install"
```

---

### **502 Bad Gateway / Blank Page**

**Check**:
1. Application Log in cPanel → Look for errors
2. Environment variables: all required set? (`AUTH_SECRET`, `DATABASE_URL`)
3. `PORT` matches what cPanel assigned (shown in Node.js App UI)
4. Node.js version ≥ 20

---

### **Static assets (CSS/JS) 404**

**Cause**: Client build missing or `NEXT_PUBLIC_APP_URL` misconfigured.

**Fix**:
1. Verify `build/client/assets/` exists on server
2. Check `NEXT_PUBLIC_APP_URL` matches your domain exactly
3. Ensure no `.htaccess` conflicts (if using Apache static fallback)

---

### **Database connection refused (Neon/Postgres)**

**Fix**:
1. Confirm `DATABASE_URL` is correct
2. In Neon console: add cPanel server IP to allowlist (or set to `0.0.0.0/0` for testing)
3. Test connection via cPanel Terminal:
   ```bash
   curl -v postgresql://...  # or use psql if available
   ```

---

## 🔄 Updating / Redeploying

When you have new code:

1. **Build locally**:
   ```bash
   cd /home/apop/sokogate-ai/apps/web
   npm ci --legacy-peer-deps
   npm run build
   ```

2. **Create new ZIP**:
   ```bash
   cd /home/apop/sokogate-ai
   zip -r sokogate-cpanel-production.zip apps/web/package.json apps/web/package-lock.json apps/web/build/ -x "*/node_modules/*" "*/src/*"
   ```

3. **Upload via cPanel File Manager**:
   - Overwrite existing files
   - Extract to same location

4. **Restart Node.js App** from cPanel UI

5. **Optional**: Clean install on server:
   ```bash
   cd ~/apps/web
   rm -rf node_modules
   npm ci --only=production
   ```

---

## 📊 Why This Approach (Pre-built) is Better

| Aspect | Build on cPanel | Upload Pre-built |
|--------|----------------|------------------|
| **Speed** | Slow (installs 900+ packages) | Instant upload |
| **Reliability** | Peer conflicts, npm errors | Deterministic, tested locally |
| **Disk usage** | node_modules ≈ 500 MB | node_modules only (no dev deps) ≈ 150 MB |
| **Node version** | Must match local | Only runtime needs match |
| **@react-router/dev** | Must install on server | Not needed at all |
| **Build tools** | Required on server | Not needed |

**Bottom line**: Uploading pre-built artifacts eliminates the most common cPanel deployment failures.

---

## 📋 Pre-Flight Checklist

Before uploading:

- [ ] `npm run build` succeeds locally
- [ ] `build/server/index.js` exists and is non-zero size
- [ ] `package.json` has `"start": "node build/server/index.js"`
- [ ] `package-lock.json` is committed (locked versions)
- [ ] All required env vars are ready: `AUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`
- [ ] Node.js version on cPanel set to ≥ 20
- [ ] Application root in cPanel will be `apps/web`

---

## 🆘 Emergency: Manual SSH Commands on cPanel

If you have SSH access and need to recover:

```bash
cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web

# 1. Verify files
ls -la build/server/index.js
test -f build/server/index.js || { echo "Build missing! Re-upload ZIP."; exit 1; }

# 2. Clean install production deps only
rm -rf node_modules
npm ci --only=production --no-audit --no-fund

# 3. Test startup manually
PORT=3000 node build/server/index.js
# Press Ctrl+C to stop

# 4. Exit, then restart via cPanel UI
exit
```

---

## 🎯 Success Criteria

✅ `npm ci --only=production` completes on cPanel  
✅ Application starts without errors (check cPanel Application Log)  
✅ Domain loads and shows rendered HTML (SSR working)  
✅ No 502/504 errors  
✅ API routes respond  

---

**Files**:
- Production ZIP: `/home/apop/sokogate-ai/sokogate-cpanel-production.zip`
- Size: 452 KB (compressed)
- Upload to: `/home2/ultimotr/` via cPanel File Manager
- Set app root: `apps/web`
- Startup file: `build/server/index.js`

Good luck! 🚀
