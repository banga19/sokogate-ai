# cPanel Production Deployment Guide (Option B – Pre-built)
**Sokogate AI – React Router + Hono SSR**

**Deployment ZIP:** `sokogate-cpanel-production.zip` (452 KB)  
**Location:** `/home/apop/sokogate-ai/`

---

## 📦 What's Inside the ZIP

```
apps/web/
├── package.json           ← runtime config + "start" script
├── package-lock.json      ← locked production dependencies
└── build/                 ← pre-compiled (client + server)
    ├── server/
    │   ├── index.js       ← Node.js entry point (27 KB)
    │   └── assets/        ← server bundles
    └── client/
        └── assets/        ← static files (CSS, JS, images)
```

**Not included:** `node_modules/`, `src/`, `devDependencies` → drastically reduces size and eliminates build-tool conflicts on the server.

---

## 🚀 Step-by-Step Deployment

### Step 1: Upload ZIP to cPanel

**Method A – File Manager (recommended)**

1. Log into cPanel → **File Manager**
2. Navigate to your home directory: `/home2/ultimotr/`
3. Click **Upload** → select `sokogate-cpanel-production.zip`
4. After upload, select the file → **Extract**
5. Confirm extraction destination: `/home2/ultimotr/`
6. Verify extracted path:
   ```
   /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web/package.json
   ```

**Method B – SFTP**

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
   | **Node.js version** | `20` or higher (v22+ recommended for `react-router-hono-server`) |

   ⚠️ **Critical**: Application root must point to the folder that contains `package.json` – in this case `apps/web`.

2. **Add Environment Variables** (click "Add" for each):

   | Variable | Value | Required |
   |----------|-------|----------|
   | `NODE_ENV` | `production` | Yes |
   | `PORT` | `3000` (use port displayed in cPanel UI) | Yes |
   | `AUTH_SECRET` | `openssl rand -hex 32` (run locally to generate) | Yes |
   | `DATABASE_URL` | Your Neon/Postgres connection string | Yes |
   | `NEXT_PUBLIC_APP_URL` | `https://sokogate-ai.ultimotradingltd.co.ke` | Yes |
   | `NEXT_PUBLIC_CREATE_BASE_URL` | `https://www.create.xyz` | Optional |
   | `NEXT_PUBLIC_CREATE_HOST` | `sokogate-ai.ultimotradingltd.co.ke` | Optional |
   | `CORS_ORIGINS` | `https://sokogate-ai.ultimotradingltd.co.ke` | Optional |

3. Click **Create**

---

### Step 3: Install Production Dependencies

**Option A – cPanel UI (simplest)**

- In the Node.js App list, find your app → click **Run NPM Install**
- cPanel runs `npm install --production` (respects `NPM_CONFIG_PRODUCTION=true`)
- Wait 1–3 minutes (~600 packages)

**Option B – cPanel Terminal (manual)**

```bash
cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web

# Install only runtime dependencies (no dev tools)
npm ci --only=production --no-audit --no-fund
# or: npm install --production --no-audit --no-fund
```

---

### Step 4: Restart the Application

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
   - Should see rendered HTML (not just `<div id="root"></div>`)

3. **Test API route**:
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
            │   ├── pg/
            │   ├── ws/
            │   └── ...
            └── build/
                ├── server/
                │   ├── index.js       ← STARTUP FILE
                │   ├── assets/
                │   └── .vite/
                └── client/
                    └── assets/
                        ├── entry.client-*.js
                        ├── root-*.css
                        └── ...
```

---

## 🔧 Troubleshooting

### **"Configuration file not found: .../package.json"**

**Cause**: Application root is wrong.

**Fix**: Edit Node.js App → set root to `apps/web` (not the domain root).

---

### **"Cannot find module 'pg'"** (or any other runtime module)

**Cause**: Dependency missing from `node_modules`.

**Fix**:
```bash
cd ~/apps/web
npm ci --only=production   # or npm install --production
```
Ensure `pg` is listed in `package.json` dependencies (it now is).

---

### **"Cannot find module 'build/server/index.js'"**

**Cause**: Build missing or path incorrect.

**Fix**:
1. Verify `build/server/index.js` exists on server:
   ```bash
   ls -la ~/apps/web/build/server/index.js
   ```
2. If missing, re-upload ZIP and extract correctly.
3. Ensure startup file in cPanel is exactly `build/server/index.js`.

---

### **502 Bad Gateway / Blank Page**

**Checklist**:
- Application Log in cPanel → errors?
- All required env vars set? (`AUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`)
- `PORT` matches what cPanel assigned
- Node.js version ≥ 20 (set in cPanel UI)

---

### **Static assets (CSS/JS) 404**

**Cause**: `build/client/` missing or `NEXT_PUBLIC_APP_URL` wrong.

**Fix**:
1. Confirm `build/client/assets/` exists
2. Ensure `NEXT_PUBLIC_APP_URL` matches domain exactly
3. For SSR, assets are served automatically by the Node server

---

### **Database connection refused (Neon/Postgres)**

**Fix**:
1. Confirm `DATABASE_URL` correct
2. In Neon console: add cPanel server IP to **Allowlist** (or `0.0.0.0/0` for testing)
3. Test via cPanel Terminal:
   ```bash
   curl -v postgresql://...   # or use psql if available
   ```

---

## 🔄 Updating / Redeploying

When code changes:

1. **Build locally**:
   ```bash
   cd /home/apop/sokogate-ai/apps/web
   npm ci --legacy-peer-deps
   npm run build
   ```

2. **Recreate ZIP**:
   ```bash
   cd /home/apop/sokogate-ai
   ./DEPLOY_CREATE_ZIP.sh
   # Produces: sokogate-cpanel-production.zip
   ```

3. **Upload via cPanel File Manager** → overwrite existing files

4. **Restart Node.js App** from cPanel UI

5. (Optional) Clean reinstall on server:
   ```bash
   cd ~/apps/web
   rm -rf node_modules
   npm ci --only=production
   ```

---

## 📋 Complete Checklist Before Upload

- [ ] `npm run build` succeeds locally
- [ ] `build/server/index.js` exists and is non-zero
- [ ] `package.json` has `"start": "node build/server/index.js"`
- [ ] `package.json` includes `"pg": "^8.14.0"` (required by `@neondatabase/serverless`)
- [ ] `package-lock.json` is current (`npm install` completed without errors)
- [ ] All required environment variables ready
- [ ] cPanel Node.js version set to ≥ 20
- [ ] Application root in cPanel will be `apps/web`

---

## 📞 Emergency: Manual Recovery via cPanel SSH

```bash
cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web

# 1. Verify build present
ls -la build/server/index.js || { echo "Build missing – re-upload ZIP"; exit 1; }

# 2. Clean install production dependencies only
rm -rf node_modules
npm ci --only=production --no-audit --no-fund

# 3. Test startup manually
PORT=3000 node build/server/index.js
# Press Ctrl+C to stop

# 4. Exit and restart via cPanel UI
```

---

## 🎯 Success Criteria

✅ `npm ci --only=production` (or `npm install --production`) completes on cPanel  
✅ Application starts without `MODULE_NOT_FOUND` errors  
✅ Domain serves SSR content (view source shows HTML)  
✅ No 502/504 errors  
✅ API routes respond

---

## 📦 Deployment Package Details

| Item | Value |
|------|-------|
| ZIP file | `sokogate-cpanel-production.zip` |
| Size | 452 KB (compressed) |
| Build output size | ~1.5 MB uncompressed |
| Runtime dependencies | ~600 packages |
| Node.js required | ≥ 20.0.0 |
| Startup command | `node build/server/index.js` |
| Runtime modules | `@auth/core`, `hono`, `@hono/node-server`, `ws`, `pg`, `argon2`, `serialize-error`, etc. |

---

## 🛠️ Why This Works (Option B – Pre-built)

- ✅ **No `@react-router/dev` needed on server** – build done locally
- ✅ **No peer-conflict installs on cPanel** – production-only deps
- ✅ **Fast upload** – 452 KB vs 500+ MB with `node_modules`
- ✅ **Deterministic** – build tested locally before deploy
- ✅ **No cPanel PATH issues** – `npm start` runs directly

---

## 📚 Additional Resources

- Local build script: `DEPLOY_CREATE_ZIP.sh` (recreates deployment ZIP)
- Full deployment guide: `CPANEL_PRODUCTION_DEPLOY.md`
- Environment template: `.env.example`

---

**Deployment ready. Upload `sokogate-cpanel-production.zip` and follow steps above.**
