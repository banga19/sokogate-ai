# Sokogate AI — Production Deployment Checklist

**Version:** 1.2  
**Date:** May 12, 2026  
**Update:** Product database integration — AI now fetches live product data from sokogate.com PostgreSQL database first, with web scraping as fallback.

---

## Pre-Deployment

### Code Changes Summary

| File | Change |
|------|--------|
| `apps/web/src/app/api/chat/route.js` | Product fetch logic: DB-first, scrape fallback; removed `looksLikeProductDetailRequest()` |
| `apps/web/src/contexts/TranslationContext.jsx` | Fixed `humanAssistance` key (removed space) |
| `apps/web/.env.example` | Added `PRODUCTS_DATABASE_URL`, `AUTH_URL`, scraper options |

### Environment Variables Required

Set **all** of these in cPanel → Setup Node.js App → Environment:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `PORT` | Yes | Port assigned by cPanel | `3000` |
| `AUTH_SECRET` | Yes | Random 32-byte hex for sessions | `openssl rand -hex 32` |
| `AUTH_URL` | Yes | Public site URL (no trailing slash) | `https://sokogate-ai.ultimotradingltd.co.ke` |
| `DATABASE_URL` | Yes | Neon/Postgres connection (leads + products if separate DB not used) | `postgresql://user:pass@host.neon.tech/dbname?sslmode=require` |
| `PRODUCTS_DATABASE_URL` | Yes | **Neon/Postgres connection to sokogate.com product DB** (can be same as `DATABASE_URL`) | `postgresql://user:pass@host.neon.tech/dbname?sslmode=require` |
| `ANTHROPIC_API_KEY` | Yes | Claude API key | `sk-ant-api03-...` |
| `ANYTHING_PROJECT_TOKEN` | Yes | Anything AI integration token | `eyJhbGciOi...` |
| `SOKOGATE_SITE_URL` | Optional | Override default site base for scraping | `https://sokogate.com` |
| `SCRAPER_CACHE_TTL` | Optional | Cache TTL in ms (default 600000) | `600000` |

**Note:** `sslmode=require` is mandatory for Neon production. If using separate DBs, both `DATABASE_URL` and `PRODUCTS_DATABASE_URL` must be set.

---

## Step-by-Step Deployment

### Step 1: Upload Updated Code

**Option A: Via File Manager (recommended)**
1. Create a ZIP of the modified `sokogate-ai/` folder or just `apps/web/`
2. cPanel → File Manager → `/home2/ultimotr/`
3. Upload ZIP → Extract to `sokogate-ai.ultimotradingltd.co.ke/`
4. Overwrite existing files when prompted

**Option B: Via SFTP**
```bash
sftp ultimotr@yourdomain.com
cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web
put -r /local/path/sokogate-ai/apps/web/*
```

### Step 2: Rebuild Production Assets (if needed)

**If you uploaded source (not pre-built):**
```bash
cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke/apps/web
npm ci --only=production --no-audit --no-fund
npm run build
```

**If you uploaded pre-built** (use `sokogate-cpanel-production.zip`): skip build step.

### Step 3: Configure cPanel Node.js App

1. cPanel → **Software** → **Setup Node.js App**
2. Find your app → click **pencil icon** (Edit)
3. Set/verify environment variables (see table above)
4. Ensure:
   - **Application mode**: `production`
   - **Application root**: `apps/web`
   - **Application startup file**: `build/server/index.js`
   - **Node.js version**: `20` or higher
5. Click **Save**

### Step 4: Install/Restart

1. In Node.js Apps list → **Run NPM Install** (if not already done or after code upload)
   - Or via SSH: `npm ci --only=production --no-audit --no-fund`
2. Click **Restart Application**
3. Wait 10–15 seconds

### Step 5: Verify Logs

**cPanel → Node.js App → Application Log**

Expected startup messages:
```
✅ Product database configured: host.neon.tech
✅ Products table schema verified/created
Server running on port 3000
```

**If you see connection errors:**
- Double-check `DATABASE_URL` and `PRODUCTS_DATABASE_URL` values
- Verify SSL mode (`sslmode=require` for Neon)
- Ensure database user has `CONNECT` and `SELECT` permissions on `products` table

---

## Database Verification

### 1. Connect to Neon DB

```bash
psql "postgresql://username:password@host.neon.tech/dbname?sslmode=require"
```

### 2. Confirm Products Table Exists

```sql
\d products
-- Should show columns: id, name, description, category, price, currency, stock_quantity, sku, images, specifications, supplier_id, is_active, created_at, updated_at
```

### 3. Check Sample/Real Data

```sql
SELECT COUNT(*) AS total_products FROM products WHERE is_active = true;
-- Should return > 0 if inventory loaded
```

### 4. If Table Missing

The app auto-creates `products` on first request if missing (see `productSql.js:28`). To manually create:

```bash
psql $DATABASE_URL -f apps/web/src/db/migrations/002_add_products_table.sql
```

---

## Functional Testing

### Chat Product Query Tests

| Test | Expected Result |
|------|-----------------|
| User: "What's the price of iPhone 15?" | AI responds with product(s) from DB with price, stock, SKU from `products` table |
| User: "Tell me about electronics" | AI lists up to 5 active products from Electronics category |
| User: "Do you have Samsung Galaxy in stock?" | AI returns matched product with stock status; cites source URL if available |
| User: "Price of product XYZ123" (non-existent) | AI falls back to web scraping sokogate.com OR says "I couldn't find that, can you describe it?" |

**Check response format:**
```
PRODUCT CONTEXT:
Product: iPhone 15 Pro Max
Description: ...
Price: USD 999.00
Stock: 100 units (approx)
SKU: IP15PM-256
Source URL: https://sokogate.com/products/iphone-15-pro-max
---
```

If you see `Source URL: N/A`, DB may lack URL field — that's fine if not populated.

### Lead Capture Flow

1. Start chat → ask "I want electronics in bulk"
2. Provide name, email, WhatsApp, company
3. Verify lead appears in `leads` table with correct `category` and `score`
4. Check dashboard → real-time update via WebSocket

### Human Handoff

1. In chat: "talk to a human"
2. Should return handoff message with WhatsApp link `https://wa.me/254758947124`
3. `handoff_requests` table gets new row with `status = 'pending'`

---

## Monitoring Post-Deployment

### Logs to Watch

**Application Log (cPanel):**
- `✅ Product database configured:` — confirms DB connection
- `Product fetch error:` — indicates DB query failures
- `All web search attempts failed:` — scraping fallback also failed (rare)

**Database Metrics:**
```sql
-- Leads created in last 24h
SELECT COUNT(*) FROM leads WHERE created_at > NOW() - INTERVAL '24 hours';

-- Product queries (if you add logging later)
-- Consider adding a `product_queries` counter table
```

### Error Scenarios & Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| AI says "I couldn't access product data" | `PRODUCTS_DATABASE_URL` not set or invalid | Set correct Neon URL in cPanel env, restart |
| Products always fallback to scraping | `products` table empty or `is_active=false` | Populate DB with real inventory; `UPDATE products SET is_active=true` |
| Chat returns 500 on product questions | `products` table missing columns | Run migration `002_add_products_table.sql` |
| No `✅ Product database configured` log | Pool creation failed (bad URL/SSL) | Validate connection string, check Neon console for connection limits |

---

## Rollback Plan

If issues arise after deployment:

1. **cPanel → Node.js App → Restart** with previous code version (restore from backup)
2. Or via SSH:
   ```bash
   cd /home2/ultimotr/sokogate-ai.ultimotradingltd.co.ke
   git checkout <previous-commit>  # if using git
   # OR replace files from backup ZIP
   npm ci --only=production
   ```
3. Restart app

---

## Post-Deployment Actions

- [ ] Verify `products` table has real sokogate.com inventory (not sample data)
- [ ] Check chat queries return structured DB product info (not just scraped)
- [ ] Confirm lead capture still works; leads appear in dashboard
- [ ] Monitor logs for 24h for any `Product fetch error` messages
- [ ] Test on mobile (responsive UI)
- [ ] Verify WebSocket real-time updates in dashboard
- [ ] Ensure `AUTH_URL` matches production domain (no localhost)

---

## Notes

- **No database schema changes needed** if `products` table already exists from prior setup
- **SSL mode**: Neon requires `sslmode=require`. Local dev uses `sslmode=disable`
- **Scraping fallback**: Only used if DB returns zero results; rate-limited via in-memory cache (10 min TTL)
- **Performance**: DB queries are indexed on `category`, `is_active`, `name`, `sku`; ensure indexes exist if table was manually created

---

**Questions?** Refer to `PRODUCT_DB_SETUP.md` and `CPANEL_PRODUCTION_DEPLOY.md` for full details.
