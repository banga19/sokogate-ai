import { Pool } from 'pg';

function createSqlClient(url) {
  if (!url || url.includes('<') || url.includes('>')) {
    console.warn('⚠️ Invalid DATABASE_URL — database features will be disabled');
    console.warn('   Set DATABASE_URL in your .env file to a valid Postgres connection string');
    return createMockSql();
  }

  try {
    const pool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'development' 
        ? false 
        : { rejectUnauthorized: false },
    });

    // Test the connection on startup
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
    return createMockSql();
  }
}

function createMockSql() {
  const mock = async (strings, ...values) => {
    if (typeof strings === 'string' && values.length === 1 && Array.isArray(values[0])) {
      const query = strings;
      console.warn('Mock SQL (raw):', query.substring(0, 100), '- params:', values[0].slice(0, 5));
    } else {
      console.warn('Mock SQL (tagged):', strings[0]?.substring(0, 100) || '');
    }
    return [];
  };

  mock.query = async (query, params) => {
    console.warn('Mock query:', query.substring(0, 100), '- params:', params?.slice(0, 5));
    return { rows: [] };
  };

  mock.transaction = async (fn) => {
    try {
      return await fn(mock);
    } catch (err) {
      console.error('Mock transaction error:', err);
      throw err;
    }
  };

  return mock;
}

const sql = process.env.DATABASE_URL ? createSqlClient(process.env.DATABASE_URL) : createMockSql();

export default sql;