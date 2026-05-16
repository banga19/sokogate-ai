/**
 * Database Schema Initialization
 * Ensures all required tables exist on application startup
 */

import sql from './sql.js';

const SCHEMA_SQL = `
-- Enable UUID extension if needed later
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. BUSINESS SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_settings (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(200) NOT NULL DEFAULT 'Sokogate',
  business_description TEXT DEFAULT 'Africa''s premier B2B wholesale marketplace connecting African wholesalers to global buyers.',
  ai_goal TEXT DEFAULT 'Capture leads by answering sourcing questions and collecting contact info.',
  primary_color VARCHAR(7) DEFAULT '#1E3A8A',
  secondary_color VARCHAR(7) DEFAULT '#EF4444',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  company VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  message TEXT,
  score VARCHAR(10) NOT NULL DEFAULT 'Medium' CHECK (score IN ('High', 'Medium', 'Low')),
  intent_summary TEXT,
  category VARCHAR(100),
  keyword_score VARCHAR(10) CHECK (keyword_score IN ('High', 'Medium', 'Low')),
  source VARCHAR(20) DEFAULT 'chat',
  conversation_stage VARCHAR(50) DEFAULT 'greeting' CHECK (conversation_stage IN ('greeting', 'needs_assessment', 'contact_capture', 'qualified', 'handoff_requested')),
  handoff_requested BOOLEAN DEFAULT FALSE,
  visitor_id VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_status VARCHAR(20) DEFAULT 'pending' CHECK (shipping_status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  shipping_tracking_number VARCHAR(100),
  status VARCHAR(20) DEFAULT 'New' CHECK (status IN ('New', 'Qualified', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. VISITORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200),
  company VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  conversation_stage VARCHAR(50) DEFAULT 'greeting' CHECK (conversation_stage IN ('greeting', 'needs_assessment', 'contact_capture', 'qualified', 'handoff_requested')),
  visit_count INTEGER DEFAULT 1,
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_visitor_id ON visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitors_lead_id ON visitors(lead_id);
CREATE INDEX IF NOT EXISTS idx_visitors_stage ON visitors(conversation_stage);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen DESC);

-- ============================================
-- 4. PRODUCTS TABLE
-- ============================================
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
);

-- ============================================
-- 5.1 SCHEMA UPGRADE: ADD MISSING COLUMNS TO LEADS (if needed)
-- ============================================
-- These ALTER statements ensure that if the leads table already exists from a previous
-- version, it will be brought up to date with all required columns before indexes are created.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(20) DEFAULT 'pending' CHECK (shipping_status IN ('pending', 'in_transit', 'delivered', 'cancelled'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS shipping_tracking_number VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS keyword_score VARCHAR(10) CHECK (keyword_score IN ('High', 'Medium', 'Low'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'chat';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversation_stage VARCHAR(50) DEFAULT 'greeting' CHECK (conversation_stage IN ('greeting', 'needs_assessment', 'contact_capture', 'qualified', 'handoff_requested'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company VARCHAR(200);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS intent_summary TEXT;

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(payment_status);
CREATE INDEX IF NOT EXISTS idx_leads_shipping_status ON leads(shipping_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp) WHERE whatsapp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON leads(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_conversation_stage ON leads(conversation_stage);
CREATE INDEX IF NOT EXISTS idx_leads_handoff_requested ON leads(handoff_requested) WHERE handoff_requested = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- ============================================
-- 6. KNOWLEDGE BASE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  question TEXT,
  answer TEXT NOT NULL,
  tags VARCHAR(50)[],
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_active ON knowledge_base(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_kb_priority ON knowledge_base(priority DESC);

-- ============================================
-- 7. AI INTERACTIONS LOG
-- ============================================
CREATE TABLE IF NOT EXISTS ai_interactions (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(100),
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_visitor ON ai_interactions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_lead ON ai_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created ON ai_interactions(created_at DESC);

-- ============================================
-- 8.5 ANALYTICS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  visitor_id VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if an old version of the table existed
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(100);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS event_data JSONB DEFAULT '{}';
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_composite ON analytics_events(visitor_id, event_type, created_at DESC);
-- Partial index for frequent lead_captured queries
CREATE INDEX IF NOT EXISTS idx_analytics_lead_captured ON analytics_events(visitor_id, created_at DESC) WHERE event_type = 'lead_captured';

-- ============================================
-- 8. HANDOFF REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS handoff_requests (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  visitor_id VARCHAR(100),
  reason TEXT,
  urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('high', 'normal', 'low')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
  assigned_to VARCHAR(200),
  notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoff_status ON handoff_requests(status);
CREATE INDEX IF NOT EXISTS idx_handoff_lead ON handoff_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_handoff_visitor ON handoff_requests(visitor_id);
CREATE INDEX IF NOT EXISTS idx_handoff_urgency ON handoff_requests(urgency);

-- ============================================
-- 9. WEEKLY METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_metrics (
  id SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,
  metric_date DATE,
  date_range VARCHAR(50),
  metric_name VARCHAR(200) NOT NULL,
  target_value INTEGER DEFAULT 0,
  actual_value INTEGER DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'count',
  status VARCHAR(50) DEFAULT 'Not Started',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_week ON weekly_metrics(week_number);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON weekly_metrics(metric_date);

-- ============================================
-- 10. SALES PROSPECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sales_prospects (
  id SERIAL PRIMARY KEY,
  company VARCHAR(200),
  contact_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  tier VARCHAR(10) DEFAULT 'T2',
  location VARCHAR(200),
  annual_spend_kes INTEGER,
  pain_point TEXT,
  engagement_angle TEXT,
  decision_maker_title VARCHAR(200),
  status VARCHAR(50) DEFAULT 'Not Started',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_company ON sales_prospects(company);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON sales_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_tier ON sales_prospects(tier);

-- ============================================
-- 11. INVESTORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investors (
  id SERIAL PRIMARY KEY,
  investor_name VARCHAR(200),
  fund_name VARCHAR(200),
  tier VARCHAR(10) DEFAULT 'T2',
  ticket_size_usd_min INTEGER,
  ticket_size_usd_max INTEGER,
  geographic_focus VARCHAR(200),
  investment_thesis TEXT,
  contact_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  decision_timeline_weeks INTEGER,
  first_contact_date DATE,
  status VARCHAR(50) DEFAULT 'Not Started',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investors_fund ON investors(fund_name);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);

-- ============================================
-- 12. PARTNERSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS partnerships (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200),
  country VARCHAR(100),
  tier VARCHAR(10) DEFAULT 'T2',
  contact_name VARCHAR(200),
  title VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  capability TEXT,
  interest_level VARCHAR(50) DEFAULT 'Prospecting',
  status VARCHAR(50) DEFAULT 'Prospecting',
  revenue_model VARCHAR(200),
  monthly_revenue_potential_usd DECIMAL(12,2),
  actual_monthly_revenue_usd DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partnerships_company ON partnerships(company_name);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);

-- ============================================
-- 13. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_handoff_requests_updated_at ON handoff_requests;
CREATE TRIGGER update_handoff_requests_updated_at
  BEFORE UPDATE ON handoff_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
CREATE TRIGGER update_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weekly_metrics_updated_at ON weekly_metrics;
CREATE TRIGGER update_weekly_metrics_updated_at
  BEFORE UPDATE ON weekly_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 14. DEFAULT DATA
-- ============================================
INSERT INTO business_settings (business_name, business_description, ai_goal, primary_color, secondary_color)
VALUES (
  'Sokogate AI',
  'Africa''s #1 B2B Sourcing AI — Turn B2B Inquiries Into Qualified Leads 24/7 Automatically',
  'Qualify buyers, capture WhatsApp contacts, score intent, and grow your Africa-to-world trade pipeline without lifting a finger',
  '#1E3A8A',
  '#EF4444'
) ON CONFLICT DO NOTHING;
`;

/**
 * Initialize database schema
 * Call this on server startup
 */
export async function ensureSchema() {
  try {
    await sql.transaction(async (client) => {
      await client.query(SCHEMA_SQL);
    });
    console.log('✅ Database schema initialized/verified');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error.message);
    throw error;
  }
}

/**
 * Check database connectivity
 * @returns {Promise<boolean>} true if connected
 */
export async function checkDatabase() {
  try {
    const result = await sql`SELECT 1 as ok`;
    return result[0]?.ok === 1;
  } catch (error) {
    console.error('❌ Database connectivity check failed:', error.message);
    return false;
  }
}
