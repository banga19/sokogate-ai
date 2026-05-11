import { Pool } from 'pg';

function createPool(url) {
  if (!url || url.includes('<') || url.includes('>') || url.includes('REPLACE_WITH')) {
    console.warn('⚠️ Invalid PRODUCTS_DATABASE_URL — product queries will be disabled');
    console.warn('   To enable real-time product data, set PRODUCTS_DATABASE_URL to your Neon/Postgres connection string');
    return null;
  }
  console.log(`✅ Product database configured: ${url.split('@')[1]?.split('?')[0] || 'custom DB'}`);
  return new Pool({ 
    connectionString: url,
    // Connection pooling for serverless Neon
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// Use dedicated products DB if configured, otherwise use main DATABASE_URL
const productsDbUrl = process.env.PRODUCTS_DATABASE_URL || process.env.DATABASE_URL;
const productPool = createPool(productsDbUrl);

/**
 * Ensure the products table exists. Call on startup.
 */
export async function ensureProductsTable() {
  if (!productPool) return;

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      price DECIMAL(10,2),
      currency VARCHAR(3) DEFAULT 'USD',
      stock_quantity INT DEFAULT 0,
      sku VARCHAR(100) UNIQUE,
      images TEXT[],
      specifications JSONB,
      supplier_id INT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  const createIndexesSQL = [
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
    'CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)',
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
    'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
  ];

   try {
     await productPool.query(createTableSQL);
     for (const idxSQL of createIndexesSQL) {
       await productPool.query(idxSQL).catch(err => {
         console.warn('Index creation failed (may already exist):', err.message);
       });
     }
     console.log('✅ Products table schema verified/created');
   } catch (error) {
     console.error('Failed to create products table:', error.message);
   }
}

/**
 * Execute a query against the products database.
 * @param {string} query - SQL query with $1, $2 placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
export async function queryProducts(query, params = []) {
  if (!productPool) {
    console.warn('Product database not configured — returning empty results');
    return [];
  }
  try {
    const result = await productPool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Product database query error:', error.message);
    // If table doesn't exist, attempt to create it and retry once
    if (error.message?.includes('relation "products" does not exist')) {
      console.log('Products table missing, creating schema...');
      await ensureProductsTable();
      // Retry the original query
      try {
        const retry = await productPool.query(query, params);
        return retry.rows;
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
        return [];
      }
    }
    throw error;
  }
}

/**
 * Execute a transaction on the products database.
 * @param {Function} fn - Async function that receives a client
 * @returns {Promise<any>}
 */
export async function transactionProducts(fn) {
   if (!productPool) {
     throw new Error('Product database not configured');
   }
   const client = await productPool.connect();
   try {
     await client.query('BEGIN');
     const result = await fn(client);
     await client.query('COMMIT');
     return result;
   } catch (err) {
     try {
       await client.query('ROLLBACK');
     } catch (rollbackErr) {
       console.error('Product transaction rollback failed:', rollbackErr);
     }
     console.error('Product transaction error:', err);
     throw err;
   } finally {
     client.release();
   }
 }

export { productPool };

// Auto-create products table on module load (first import)
// This ensures the schema exists in the connected database
if (productPool && !process.env.TESTING) {
  ensureProductsTable().catch(err => {
    console.error('Failed to initialize products table:', err.message);
  });
}
