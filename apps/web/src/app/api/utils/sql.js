import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Ensure Neon uses WebSocket constructor for serverless connections
neonConfig.webSocketConstructor = ws;

function createSqlClient(url) {
  if (!url || url.includes('<') || url.includes('>')) {
    console.warn('Invalid DATABASE_URL provided — database features will be disabled');
    return createMockSql();
  }

  const pool = new Pool({ connectionString: url });
  
  // Create a function that handles tagged template queries
  const sql = async (strings, ...values) => {
    // Build query with $1, $2 placeholders
    let query = strings[0];
    const params = [];
    for (let i = 0; i < values.length; i++) {
      params.push(values[i]);
      query += '$' + (i + 1) + strings[i + 1];
    }
    const result = await pool.query(query, params);
    return result.rows;
  };
  
  // Attach transaction helper (basic implementation)
  sql.transaction = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };
  
  return sql;
}

function createMockSql() {
  const mock = async () => {
    console.warn('Database query skipped (no DATABASE_URL)');
    return [];
  };
  mock.transaction = async (fn) => await fn(mock);
  return mock;
}

const sql = process.env.DATABASE_URL ? createSqlClient(process.env.DATABASE_URL) : createMockSql();

export default sql;