import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Ensure Neon uses WebSocket constructor for serverless connections
neonConfig.webSocketConstructor = ws;

function createSqlClient(url) {
  if (!url || url.includes('<') || url.includes('>')) {
    console.warn('Invalid DATABASE_URL provided — database features will be disabled');
    return createMockSql();
  }

  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Tagged template function: sql`SELECT * FROM table WHERE id = ${value}`
  const sql = async (strings, ...values) => {
    // Handle legacy call style: sql(queryString, paramsArray)
    if (typeof strings === 'string' && (!Array.isArray(strings) || strings.length === 0 || typeof strings[0] !== 'string')?.[0] !== undefined) {
      // Actually if first argument is a plain string, treat as raw query with params
      // But careful: tagged template passes strings array as first argument.
      // We can distinguish by checking if first argument is a string AND the second argument is an array
      // Standard tagged template: strings is an array of strings, values are rest
      // Raw call: first argument is the full query string, second is params array (optional)
    }
    // Let's detect: if arguments.length === 2 && typeof strings === 'string' && Array.isArray(values[0])
    // That indicates raw invocation.
    if (arguments.length === 2 && typeof strings === 'string' && Array.isArray(values[0])) {
      const query = strings;
      const params = values[0];
      try {
        const result = await pool.query(query, params);
        return result.rows;
      } catch (err) {
        console.error('SQL error:', err);
        throw err;
      }
    }

    // Tagged template usage
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
      console.error('SQL error:', err);
      throw err;
    }
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
       try {
         await client.query('ROLLBACK');
       } catch (rollbackErr) {
         console.error('Rollback failed:', rollbackErr);
       }
       console.error('Transaction error:', err);
       throw err;
     } finally {
       client.release();
     }
   };
  
  return sql;
}

function createMockSql() {
  const mock = async (strings, ...values) => {
    // Detect if this is a raw call (first arg is string, second is array)
    if (typeof strings === 'string' && values.length === 1 && Array.isArray(values[0])) {
      const query = strings;
      // const params = values[0]; // ignore
      console.warn('Mock SQL (raw):', query.substring(0, 100), '- params:', values[0].slice(0, 5));
    } else {
      // Tagged template
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
  };
  return mock;
}

const sql = process.env.DATABASE_URL ? createSqlClient(process.env.DATABASE_URL) : createMockSql();

export default sql;