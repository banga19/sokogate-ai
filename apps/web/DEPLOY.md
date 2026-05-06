# cPanel Deployment Guide

## Option 1: Node.js Application (SSR enabled) – Recommended

This runs your full Hono + React Router server with SSR.

### Prerequisites
- cPanel account with **Setup Node.js App** feature (usually under "Software" section)
- Domain or subdomain configured

### Steps

1. **Build locally** (or on cPanel via SSH):
   ```bash
   cd sokogate-ai/apps/web
   npm ci --production
   npm run build
   ```
   Output: `build/server/index.js` + `build/client/` static assets

2. **Upload to cPanel**
   - Compress the entire `apps/web` folder into a `.zip`
   - Upload via cPanel **File Manager** → `~/` or `~/myapp/`
   - Extract

   **OR** use Git integration on cPanel to clone your repo.

3. **Configure Node.js App in cPanel**
   - Go to **Setup Node.js App**
   - Create new app:
     - **App Directory**: `apps/web` (or wherever you extracted)
     - **Application URL**: your domain/subdomain
     - **Application Mode**: `production`
     - **Application Startup File**: `build/server/index.js`
     - **Environment Variables**: Click "Add" and configure:
       - `NODE_ENV=production`
       - `PORT=3000` (cPanel assigns a PORT; use the one they provide)
       - `AUTH_SECRET=...` (from your local `.env`)
       - `DATABASE_URL=...`
       - `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
       - (plus any other `NEXT_PUBLIC_*` vars you use)
   - Click **Create**

4. **Run npm install on cPanel**
   - In the Node.js App interface, click **Run NPM Install**
   - Wait for completion

5. **Restart the app**
   - Click **Restart App**

6. **Configure proxy (if needed)**
   - If your domain points to a subdirectory, adjust `NEXT_PUBLIC_APP_URL`
   - For root domain, ensure Apache/Nginx proxies to Node port:
     cPanel usually handles this automatically when you assign a domain to the Node app.

### Verify
Visit `https://yourdomain.com` – your SSR app should load.

---

## Option 2: Static File Hosting (Client-only)

If you don't need SSR, you can serve only the static build.

### Steps

1. **Build the client bundle**
   ```bash
   npm ci
   npm run build
   ```
   Outputs to `build/client/`

2. **Upload only `build/client/` contents**
   - Upload all files from `build/client/` to `public_html/` or a subdirectory via cPanel File Manager

3. **Upload `.htaccess`** (already in repo at `apps/web/.htaccess`)
   - Place it in the same directory as your static files (e.g., `public_html/.htaccess`)
   - This ensures SPA routing works (all requests fall back to `index.html`)

4. **Set environment variables for client-side only**
   - Variables prefixed with `NEXT_PUBLIC_` are baked into the build at build time.
   - Rebuild if you change them.

### Limitations
- No SSR, all rendering client-side
- API routes still need a separate server (your Hono server)

---

## Troubleshooting

### "Application failed to start"
- Check **Application Log** in cPanel Node.js interface
- Ensure `PORT` matches what cPanel assigned (displayed in UI)
- Verify all required environment variables are set

### Build fails on cPanel
- SSH into cPanel and run `npm ci --production` manually
- Ensure Node version is ≥20.0.0 (set in cPanel Node.js config)

### Static assets not loading
- Verify `.htaccess` is present and `mod_rewrite` is enabled
- Check file permissions (644 for files, 755 for dirs)

---

## Local Testing Before Deploy

```bash
# Test production build locally
npm ci
npm run build
PORT=3000 AUTH_SECRET=test DATABASE_URL=postgresql://... npm start

# Should be available at http://localhost:3000
```
