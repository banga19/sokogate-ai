# Complete cPanel Deployment Instructions
## Sokogate AI – React Router + Hono SSR Application

---

## 📦 What's Included in This Deployment Package

Your ZIP file (`sokogate-web-cpanel.zip`) contains:

```
apps/web/                    ← Application root
├── package.json             ← Dependencies & scripts
├── package-lock.json        ← Locked dependency versions
├── .htaccess               ← SPA fallback (for static hosting)
├── build/
│   ├── client/             ← Static assets (CSS, JS, images)
│   └── server/
│       ├── index.js        ← Node.js server entry point
│       └── assets/         ← Server bundles
└── [other config files]
```

**Total size**: ~457 KB (compressed)

---

## 🚀 Step-by-Step Deployment

### **Step 1: Generate Your ZIP File**

If you don't have the ZIP yet, create it locally:

```bash
cd /home/apop/sokogate-ai/apps/web
./deploy-to-cpanel.sh --build-only
# Output: /tmp/sokogate-web-YYYYMMDD-HHMMSS.zip
```

Or manually:

```bash
cd /home/apop/sokogate-ai/apps/web
npm ci --legacy-peer-deps --no-audit --no-fund
npm run build
cd ..
zip -r sokogate-web-cpanel.zip apps/web -x "apps/web/node_modules/*" "apps/web/.git/*"
```

---

### **Step 2: Upload to cPanel**

#### **Method A: cPanel File Manager (Easiest)**

1. Log into cPanel → **File Manager**
2. Navigate to: `/home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/`
3. Click **Upload** → select `sokogate-web-cpanel.zip`
4. Wait for upload, then **Extract** the ZIP
5. Verify extracted structure contains: `apps/web/package.json`

#### **Method B: FTP/SFTP**

```bash
# Using SFTP
sftp youruser@yourdomain.com
# Password or key auth

cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/
put sokogate-web-cpanel.zip
# Then extract via cPanel Terminal or File Manager
```

#### **Method C: Git Integration (cPanel)**

1. cPanel → **Git™ Version Control** → **Create Repository**
2. Clone URL: your GitHub/Bitbucket repo URL
3. Repository Path: `/home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/`
4. Click **Create**
5. SSH into cPanel: `cd ~/sokogate-ai.ultimotradingltd.co.ke/apps/web`
6. Run: `npm ci --production && npm run build`

---

### **Step 3: Configure Node.js App in cPanel**

1. **Go to**: cPanel → **Setup Node.js App** (under "Software" section)

2. **Click**: **Create Application**

   - **Application mode**: `production`
   - **Application root**: `apps/web`
     - ⚠️ **Critical**: This must point to the folder containing `package.json`
     - Full path: `/home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web`
   - **Application URL**: select your domain/subdomain
     - e.g., `sokogate-ai.ultimotradingltd.co.ke`
   - **Application startup file**: `build/server/index.js`
   - **Environment**: `production`
   - **Node.js version**: `20` or higher (set in "Node.js Options" if available)

   ![cPanel Node.js App Configuration](https://i.imgur.com/placeholder.png)

3. **Add Environment Variables** (Click "Add" for each):

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `NODE_ENV` | `production` | Required |
   | `PORT` | `3000` | cPanel auto-assigns; check displayed value |
   | `AUTH_SECRET` | Generate: `openssl rand -hex 32` | Required for auth sessions |
   | `DATABASE_URL` | `postgresql://user:pass@host/db` | Your Neon/Postgres URL |
   | `NEXT_PUBLIC_APP_URL` | `https://sokogate-ai.ultimotradingltd.co.ke` | Your public domain |
   | `NEXT_PUBLIC_CREATE_BASE_URL` | `https://www.create.xyz` | Optional (if using Create integration) |
   | `NEXT_PUBLIC_CREATE_HOST` | `sokogate-ai.ultimotradingltd.co.ke` | Optional |
   | `CORS_ORIGINS` | `https://sokogate-ai.ultimotradingltd.co.ke` | Optional |

   **Security Note**: `AUTH_SECRET` must be a cryptographically random 32+ character string.

4. **Click** **Create**

---

### **Step 4: Install Dependencies & Start**

After creating the app:

1. **Run NPM Install**:
   - In the Node.js App list, find your app → **Run NPM Install**
   - Wait 1-3 minutes (dependencies: ~900 packages)

2. **Rebuild (if needed)**:
   - If cPanel's npm doesn't run build automatically:
     - Click **Terminal** in cPanel
     - Run:
       ```bash
       cd ~/apps/web
       npm run build
       ```

3. **Restart the Application**:
   - Click **Restart App**

---

### **Step 5: Verify Deployment**

1. **Check Application Log** (in cPanel Node.js UI):
   - Should show: `Server running on port 3000`
   - No errors about missing env vars

2. **Visit Your Domain**:
   ```
   https://sokogate-ai.ultimotradingltd.co.ke
   ```
   - Should load the React Router app
   - SSR should be active (view source → see HTML content, not just `<div id="root"></div>`)

3. **Test API Routes**:
   ```
   https://sokogate-ai.ultimotradingltd.co.ke/api/auth/...
   ```

---

## ⚠️ Common Issues & Fixes

### **Error: "Configuration file not found"**
**Cause**: Application root points to wrong directory (missing `package.json`)

**Fix**:
- Edit Node.js App → set Application root to `apps/web` (or wherever `package.json` lives)
- Re-run npm install

---

### **Error: "Cannot find module build/server/index.js"**
**Cause**: Build wasn't run or build output missing

**Fix**:
```bash
cd ~/apps/web
npm run build
# Verify build/server/index.js exists
ls -la build/server/index.js
# Restart Node.js app
```

---

### **Error: "Missing required environment variable: AUTH_SECRET"**
**Cause**: Required env vars not set

**Fix**: Add all missing variables in cPanel Node.js App → Environment section → **Restart**

---

### **Error: "Database connection failed"**
**Cause**: Neon/Postgres not accessible from cPanel server

**Fix**:
1. Ensure `DATABASE_URL` is correct
2. In Neon console: add cPanel server IP to **Allowlist** (if using IP restrictions)
3. Test connection via cPanel Terminal:
   ```bash
   curl -v postgresql://...  # or use psql if available
   ```

---

### **Error: "Port not available" / 502 Bad Gateway**
**Cause**: PORT mismatch or app crashed

**Fix**:
1. Check what PORT cPanel assigned (displayed in Node.js App UI)
2. Ensure your app uses that exact PORT (via `process.env.PORT`)
3. Your server code already does this (line 261 in `__create/index.ts` passes PORT to Hono)
4. Check **Application Log** for crash stack traces

---

### **Static Assets 404**
**Cause**: Nginx/Apache not proxying correctly, or client build missing

**Fix**:
1. Verify `build/client/` exists and contains JS/CSS files
2. Ensure `NEXT_PUBLIC_APP_URL` matches your domain
3. For SSR, assets are served via the Node server automatically
4. For static-only, ensure `.htaccess` is in `public_html/`

---

### **OAuth Redirect URI Mismatch**
**Cause**: Provider (Google/Facebook) callback URL points to wrong domain

**Fix**:
1. Set `NEXT_PUBLIC_APP_URL` to your exact domain (no trailing slash)
2. Update OAuth provider credentials:
   - Google Cloud Console → OAuth consent screen → Authorized domains
   - Add: `sokogate-ai.ultimotradingltd.co.ke`
   - Update redirect URI to: `https://sokogate-ai.ultimotradingltd.co.ke/api/auth/callback/...`

---

## 📁 Correct File Structure on cPanel

```
/home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/
├── apps/
│   └── web/
│       ├── package.json           ← required
│       ├── package-lock.json      ← required
│       ├── node_modules/          ← installed by cPanel
│       ├── build/
│       │   ├── client/            ← static assets
│       │   │   ├── assets/
│       │   │   ├── entry.client-*.js
│       │   │   └── ...
│       │   └── server/
│       │       ├── index.js       ← STARTUP FILE
│       │       ├── assets/
│       │       └── .vite/
│       ├── .htaccess              ← optional (static host only)
│       └── src/                   ← source (not needed for prod)
└── (other dirs)
```

---

## 🔐 Environment Variables Reference

### Production (Server-Side)
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Must be `production` |
| `PORT` | Yes | Port assigned by cPanel (usually 3000) |
| `AUTH_SECRET` | Yes | Random 32+ char string for session encryption |
| `DATABASE_URL` | Yes | PostgreSQL connection string |

### Public (Baked into Build)
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Your public domain (no trailing slash) |
| `NEXT_PUBLIC_CREATE_BASE_URL` | No | Create.xyz API endpoint |
| `NEXT_PUBLIC_CREATE_HOST` | No | Your hostname for Create integration |
| `NEXT_PUBLIC_CREATE_PROJECT_GROUP_ID` | No | Create project ID |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

---

## 🔄 Redeploy / Update Process

1. **Build new package locally**:
   ```bash
   cd /home/apop/sokogate-ai/apps/web
   ./deploy-to-cpanel.sh --build-only
   ```

2. **Upload new ZIP** via File Manager, overwrite old files

3. **Restart Node.js App** in cPanel

4. **Clear caches** (if needed):
   ```bash
   cd ~/apps/web
   rm -rf .react-router build
   npm ci --production
   npm run build
   ```

---

## 📊 Verifying SSR is Working

1. Visit your site
2. Right-click → **View Page Source**
3. Look for actual content (not just `<div id="root"></div>`)
4. You should see rendered HTML with your app content

If you see an empty shell, SSR is not working — check Node.js app logs.

---

## 🆘 Emergency Rollback

1. Stop current Node.js app (cPanel → Stop Application)
2. Replace files with previous ZIP backup
3. Run: `npm ci --production && npm run build`
4. Restart app

---

## 📞 Support & Next Steps

- **Check logs**: cPanel → Node.js App → **Application Log** & **Error Log**
- **SSH access**: Use **Terminal** in cPanel for direct command-line
- **Database**: Ensure Neon connection string has egress allowlist for cPanel IP
- **SSL**: cPanel → SSL/TLS → Manage SSL sites (or use AutoSSL)

---

**Deployment package created**: `sokogate-web-cpanel.zip` (457 KB)
**Build timestamp**: 2026-05-07 09:05:47

Good luck! 🚀
