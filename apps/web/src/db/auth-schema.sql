-- ============================================
-- AUTH.JS (AUTH.CORE) TABLES
-- Required for @auth/core adapter (NeonAdapter)
-- ============================================

-- Users table (auth_users)
CREATE TABLE IF NOT EXISTS auth_users (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  "emailVerified" TIMESTAMP WITH TIME ZONE,
  image VARCHAR(255)
);

-- Accounts table (auth_accounts)
CREATE TABLE IF NOT EXISTS auth_accounts (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(255) NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255),
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  "password" TEXT
);

-- Sessions table (auth_sessions)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" VARCHAR(255) NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Verification tokens table (auth_verification_token)
CREATE TABLE IF NOT EXISTS auth_verification_token (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_auth_accounts_user_id ON auth_accounts("userId");
CREATE INDEX IF NOT EXISTS idx_auth_accounts_provider ON auth_accounts(provider, "providerAccountId");
CREATE INDEX IF NOT EXISTS idx_auth_verification_token_identifier ON auth_verification_token(identifier);

-- Sample user for testing (optional)
-- INSERT INTO auth_users (id, name, email) VALUES ('default', 'Test User', 'test@example.com') ON CONFLICT DO NOTHING;
