# Quick cPanel Deployment

## Pre-flight Checklist
- [ ] Node.js version ≥ 20.0.0 (cPanel setting)
- [ ] All env vars defined (see `.env.example`)
- [ ] Database (Neon/Postgres) accessible from cPanel
- [ ] Domain points to cPanel server

## Upload Methods

### A. ZIP Upload (easiest)
```bash
# On your machine
cd sokogate-ai/apps/web
./deploy-cpanel.sh          # Linux/Mac
# or
deploy-cpanel.bat           # Windows

# Upload generated .zip via cPanel File Manager → Extract to: ~/apps/web
```

### B. Git Integration (cPanel)
1. In cPanel: **Git™ Version Control** → Create repo pointing to your GitHub/Bitbucket
2. Clone into `~/apps/web`
3. SSH into cPanel → `cd ~/apps/web` → `npm ci --production` → `npm run build`
4. Configure Node.js app (see below)

## Node.js App Setup (cPanel)

1. **Software → Setup Node.js App → Create Application**
   - Application mode: `production`
   - Application root: `apps/web`  (or wherever you uploaded)
   - Application URL: your domain/subdomain
   - Application startup file: `build/server/index.js`
   - Environment: `production`

2. **Set Environment Variables** (click "Add")
   ```
   NODE_ENV=production
   PORT=3000                   (cPanel may auto-assign; copy the displayed PORT)
   AUTH_SECRET=<random-32char-string>
   DATABASE_URL=postgresql://...
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   # ... any other NEXT_PUBLIC_* variables you use
   ```

3. **Install Dependencies**
   - Click "Run NPM Install" (or SSH in and run `npm ci --production`)

4. **Restart** the app

5. **Test** via Application URL or assigned domain

---

## File Structure on cPanel

```
~/apps/web/
├── build/
│   ├── client/          ← static assets (served by Apache/Nginx proxy)
│   └── server/
│       ├── index.js     ← Node.js entry point (startup file)
│       └── assets/      ← server bundles
├── node_modules/
├── package.json
├── package-lock.json
├── .env                ← NOT uploaded (set via cPanel UI)
└── .htaccess           ← optional: only for static hosting
```

---

## Common Issues

| Symptom | Fix |
|---------|-----|
| "Cannot find module" errors | Did you run `npm run build`? Server needs `build/server/index.js` |
| 502 Bad Gateway | Check Application Log in cPanel; verify `PORT` matches what's assigned |
| DB connection fails | Ensure `DATABASE_URL` allows connections from cPanel IP (Neon may need egress allowlist) |
| Static assets 404 | Ensure `NEXT_PUBLIC_APP_URL` is set correctly; check that `build/client/` was uploaded |
| OAuth redirects broken | Set `NEXT_PUBLIC_APP_URL` to your public domain exactly |

---

## Post-Deploy

- Enable **Application Log** monitoring in cPanel
- Set up cron jobs if needed (cPanel → Cron Jobs)
- Configure SSL (AutoSSL or Let's Encrypt in cPanel)
- Set up log rotation if high traffic

---

## Rollback

Keep previous ZIP packages. To rollback:
1. Stop current Node.js app
2. Replace files with previous ZIP
3. Re-run npm install & restart
