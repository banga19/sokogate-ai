import { Pool } from 'pg';

/**
 * Strict DATABASE_URL validator.
 * Rejects undefined, empty strings, and any placeholder directives (e.g. <user>, <password>).
 */
function isValidDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('<') || url.includes('>')) return false;
  if (url.trim().length < 10) return false; // e.g. "postgres://x" minimum
  return true;
}

/**
 * Module-level sql reference.
 * Initialized lazily — call `ensureSQL()` once (e.g. after dotenv/config
 * has run) to create the real Postgres pool. Until then, callers hit the
 * mock and `isMock` stays true so every route can assert before writing.
 */
let _sql; // real sql client or mock

function createSqlClient(url) {
  if (!isValidDatabaseUrl(url)) {
    const reason = !url
      ? 'DATABASE_URL is not set'
      : 'DATABASE_URL contains invalid placeholder characters';
    console.warn('⚠️', reason, '— database features will be disabled');
    return createMockSql();
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';

  try {
    const pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: isDevelopment
        ? false
        : { rejectUnauthorized: true },
    });

    // Test the connection on startup — log but don't block app boot
    pool.query('SELECT 1').catch(err => {
      console.error('❌ Database connection test failed:', err.message);
      console.error('   Check your DATABASE_URL and ensure the database is running');
    });

    // Tagged template function: sql`SELECT * FROM table WHERE id = ${value}`
    const sql = async (strings, ...values) => {
      // Handle legacy call style: sql(queryString, paramsArray)
      if (arguments.length === 2 && typeof strings === 'string' && Array.isArray(values[0])) {
        const query = strings;
        const params = values[0];
        try {
          const result = await pool.query(query, params);
          return result.rows;
        } catch (err) {
          console.error('SQL error:', err.message);
          throw err;
        }
      }

      // Tagged template usage: sql`SELECT ... WHERE id = ${id}`
      let query = strings[0];
      const params = [];
      for (let i = 0; i < values.length; i++) {
        params.push(values[i]);
        query += '$' + (i + 1) + strings[i + 1];
      }
      try {
        const result = await pool.query(query, params);
        return result.rows;
      } catch (err) {
        console.error('SQL error:', err.message);
        throw err;
      }
    };

    // Attach transaction helper
    sql.transaction = async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          console.error('Rollback failed:', rollbackErr);
        }
        console.error('Transaction error:', err.message);
        throw err;
      } finally {
        client.release();
      }
    };

    return sql;
  } catch (err) {
    console.error('❌ Failed to create database pool:', err.message);
    console.error('   Check DATABASE_URL environment variable');
    if (!isDevelopment) {
      throw err;
    }
    return createMockSql();
  }
}

function createMockSql() {
  const mock = async (strings, ...values) => {
    if (typeof strings === 'string' && values.length === 1 && Array.isArray(values[0])) {
      const query = strings;
      console.warn('[MOCK SQL] raw query:', query.substring(0, 120), '- params:', values[0].slice(0, 5));
    } else {
      console.warn('[MOCK SQL] tagged query:', strings[0]?.substring(0, 120) || '');
    }
    return [];
  };

  mock.query = async (query, params) => {
    console.warn('[MOCK SQL] raw .query():', query.substring(0, 120), '- params:', params?.slice(0, 5));
    return { rows: [] };
  };

  mock.transaction = async (fn) => {
    try {
      return await fn(mock);
    } catch (err) {
      console.error('[MOCK SQL] transaction error:', err);
      throw err;
    }
  };

  mock.isMock = true;
  return mock;
}

/**
 * Lazily initialise the sql client from DATABASE_URL.
 * Safe to call multiple times; only the first call takes effect.
 * Must be called AFTER dotenv/config has loaded the .env file.
 */
function ensureSQL(url) {
  if (_sql !== undefined) return; // already initialised
  const targetUrl = url || process.env.DATABASE_URL;
  if (!isValidDatabaseUrl(targetUrl)) {
    const reason = !targetUrl
      ? 'DATABASE_URL is not set'
      : 'DATABASE_URL contains invalid placeholder characters';
    console.warn('⚠️', reason, '— database features will be disabled');
    _sql = createMockSql();
    return;
  }
  _sql = createSqlClient(targetUrl);
}

/**
 * Replace the active sql client (used at build-time initialisation and
 * by ensureSQL()).
 * @param {string} [url] - optional DATABASE_URL override
 */
function initSQL(url) {
  _sql = undefined;
  ensureSQL(url);
}

// Eagerly initialise from process.env.DATABASE_URL for environments
// (such as the Vite dev server) that load env vars BEFORE any module runs.
_sql = createSqlClient(process.env.DATABASE_URL);

/** @type {() => ReturnType<typeof createSqlClient> | typeof mock} */
const sql = async (strings, ...values) => {
  if (_sql === undefined) {
    console.warn('[sql] Called before init — returning mock. Call ensureSQL() first.');
    _sql = createMockSql();
  }
  return _sql(strings, ...values);
};

// Pass-through all properties from the real client
['isMock', 'transaction', 'query'].forEach(key => {
  Object.defineProperty(sql, key, {
    get() {
      return _sql?.[key];
    },
    enumerable: true,
    configurable: true,
  });
});

sql.ensureSQL = ensureSQL;
sql.initSQL = initSQL;

export { ensureSQL, initSQL, sql as default };