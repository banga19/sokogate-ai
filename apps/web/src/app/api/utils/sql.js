import { neon } from '@neondatabase/serverless';

function createSqlClient(url) {
  if (!url || url.includes('<') || url.includes('>')) {
    console.warn('Invalid DATABASE_URL provided — database features will be disabled');
    return createMockSql();
  }
  return neon(url);
}

function createMockSql() {
  const mock = async (query) => {
    console.warn('Database query skipped (no DATABASE_URL):', query);
    return [];
  };
  mock.transaction = async (fn) => await fn(mock);
  return mock;
}

const NullishQueryFunction = () => {
  throw new Error(
    'No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set'
  );
};
NullishQueryFunction.transaction = () => {
  throw new Error(
    'No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set'
  );
};

const sql = process.env.DATABASE_URL ? createSqlClient(process.env.DATABASE_URL) : createMockSql();

export default sql;