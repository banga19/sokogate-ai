# Product Database Configuration for Sokogate AI

## Overview
The AI sales agent now fetches real-time product data from a PostgreSQL database via the `PRODUCTS_DATABASE_URL` environment variable. By default, it uses the main `DATABASE_URL` if no separate products DB is configured.

## Quick Start

### 1. Database Setup
Ensure your production PostgreSQL database has the `products` table:

```bash
# Run the schema migration
psql $DATABASE_URL -f apps/web/src/db/migrations/002_add_products_table.sql

# Or run the full schema
psql $DATABASE_URL -f apps/web/src/db/schema.sql
```

The schema includes indexes for performance and sample data (10 products) that can be removed or replaced with real inventory.

### 2. Environment Variables

**Development (local)** – `apps/web/.env`:
```bash
DATABASE_URL=postgresql://sokogate_user:YOUR_PASSWORD@localhost:5432/sokogate_db?sslmode=disable
PRODUCTS_DATABASE_URL=  # optional, defaults to DATABASE_URL
```

**Production (cPanel/Neon)** – Set in cPanel Node.js App configuration:
```bash
DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
PRODUCTS_DATABASE_URL=postgresql://username:password@host.neon.tech/dbname?sslmode=require
```

- If `PRODUCTS_DATABASE_URL` is omitted, the app uses `DATABASE_URL` for both leads and products.
- `sslmode=require` is mandatory for Neon production; `sslmode=disable` for local dev.

### 3. Verify Connection
Start the server and check logs:
```
✅ Product database configured: host.neon.tech
✅ Products table schema verified/created
```

If the `products` table doesn't exist, it's auto-created on first request with the correct schema.

### 4. Populate Real Product Data
With the table ready, load your actual sokogate.com inventory:

```sql
-- Using COPY for CSV import
\copy products(name, description, category, price, currency, stock_quantity, sku, specifications) FROM 'products.csv' WITH CSV HEADER;

-- Or INSERT statements
INSERT INTO products (name, description, category, price, currency, stock_quantity, sku, specifications, is_active)
VALUES ('Your Product', 'Description', 'Electronics', 99.99, 'USD', 100, 'SKU-001', '{"color":"black"}', true);
```

## How It Works

1. **API Routes**:
   - `GET /api/products` – Lists products with optional `?category=Electronics&search=phone`
   - `GET /api/products/:id` – Single product details

2. **AI Chat Integration** (`/api/chat`):
   - On each user message, `fetchRelevantProducts()` queries the products DB
   - Matches by category detection + keyword scoring
   - Returns up to 5 most relevant products
   - Product data is injected as system context for the AI
   - AI uses live pricing/stock info in its responses

3. **Auto-Schema**:
   - The `productSql` module auto-creates the `products` table if missing
   - Indexes are created for performance
   - Production DB should already have real data; auto-creation is a safety net

## Troubleshooting

**No product data returned**:
- Verify `DATABASE_URL` or `PRODUCTS_DATABASE_URL` is set and reachable
- Check that the `products` table contains `is_active = true` rows
- Inspect server logs for connection errors

**"Products table not initialized"**:
- Run the migration manually: `psql $DATABASE_URL -f apps/web/src/db/migrations/002_add_products_table.sql`
- Or let the app create it automatically on first request (ensure DB user has CREATE TABLE permission)

**Connection refused**:
- Confirm SSL settings (`sslmode=require` for Neon, `disable` for local)
- Verify host/port/credentials
- For Neon, allow connections from your cPanel IP if restricted

## Files Changed
- `apps/web/src/app/api/utils/productSql.js` – New product DB client
- `apps/web/src/app/api/products/route.js` – Product listing endpoint
- `apps/web/src/app/api/products/[id]/route.js` – Single product endpoint
- `apps/web/src/app/api/chat/route.js` – Product fetching & context injection
- `apps/web/.env` & `.env.example` – Added `PRODUCTS_DATABASE_URL`
- `apps/web/src/db/schema.sql` – Added `products` table definition
- `apps/web/src/db/migrations/002_add_products_table.sql` – Migration for products table
