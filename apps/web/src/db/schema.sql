-- ============================================
-- SOKOGATE AI - COMPLETE DATABASE SCHEMA
-- ============================================

-- Enable UUID extension if needed later
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. BUSINESS SETTINGS TABLE
-- Stores brand configuration for the AI agent
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
-- Core table storing all captured leads from AI chat
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
-- Tracks anonymous visitors and their conversation progress
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
-- Stores product catalog for real-time AI retrieval
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
-- 4. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(payment_status);
CREATE INDEX IF NOT EXISTS idx_leads_shipping_status ON leads(shipping_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp) WHERE whatsapp IS NOT NULL;

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Lead indexes for new fields
CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON leads(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_conversation_stage ON leads(conversation_stage);
CREATE INDEX IF NOT EXISTS idx_leads_handoff_requested ON leads(handoff_requested) WHERE handoff_requested = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);

-- ============================================
-- 4. SAMPLE DATA
-- ============================================

-- Insert default business settings (if none exist)
INSERT INTO business_settings (business_name, business_description, ai_goal, primary_color, secondary_color)
VALUES (
  'Sokogate AI',
  'Africa''s #1 B2B Sourcing AI — Turn B2B Inquiries Into Qualified Leads 24/7 Automatically',
  'Qualify buyers, capture WhatsApp contacts, score intent, and grow your Africa-to-world trade pipeline without lifting a finger',
  '#1E3A8A',
  '#EF4444'
) ON CONFLICT DO NOTHING;

-- Sample leads across all categories and scores
INSERT INTO leads (name, email, phone, whatsapp, message, score, intent_summary, category, keyword_score, status, payment_status, shipping_status, created_at) VALUES
  ('Ahmed K.', 'ahmed@example.com', '+254712000001', '+254712000001', 'I need 500 units of smartphones for bulk order, urgent delivery needed.', 'High', 'Looking for 500 smartphone units with urgent delivery timeline. Ready to purchase immediately.', 'Electronics', 'High', 'Qualified', 'paid', 'in_transit', NOW() - INTERVAL '2 days'),
  ('Aisha M.', 'aisha@example.com', '+254733000002', '+254733000002', 'Interested in wholesale fabric samples for our clothing line.', 'Medium', 'Exploring fabric options for clothing manufacturing. Wants samples before bulk order.', 'Apparel & Fabrics', 'Medium', 'New', 'pending', 'pending', NOW() - INTERVAL '1 day'),
  ('John D.', 'john@company.com', '+254712000003', NULL, 'Looking for agricultural equipment for large scale farming', 'High', 'Bulk agricultural machinery order for commercial farming operation. Serious buyer.', 'Machinery & Parts', 'High', 'Qualified', 'pending', 'pending', NOW() - INTERVAL '3 days'),
  ('Maria S.', 'maria@business.co', '+254722000004', '+254722000004', 'Can you send me your health & beauty product catalog?', 'Low', 'Browsing health and beauty products. Requesting catalog for future reference.', 'Health & Beauty', 'Low', 'New', 'pending', 'pending', NOW() - INTERVAL '5 hours'),
  ('David O.', 'david@imports.c', '+254712000005', '+254712000005', 'We need 1000 pieces of auto parts ASAP. What''s your MOQ?', 'High', 'Urgent order for 1000 auto parts. Asking about MOQ and shipping timeframe.', 'Auto Parts', 'High', 'Qualified', 'paid', 'pending', NOW() - INTERVAL '1 hour'),
  ('Fatima A.', 'fatima@export.com', '+254733000006', NULL, 'We are suppliers of fresh produce from Kenya', 'Medium', 'Supplier looking to connect with buyers for fresh produce exports.', 'Agriculture & Food', 'Medium', 'New', 'pending', 'pending', NOW() - INTERVAL '12 hours'),
  ('Samuel K.', 'samuel@build.co', '+254712000007', '+254712000007', 'Need construction materials for a housing project - 2000 bricks', 'High', 'Large quantity construction materials needed for housing development project.', 'Home & Construction', 'High', 'New', 'pending', 'pending', NOW() - INTERVAL '6 hours'),
  ('Lisa M.', 'lisa@retail.shop', '+254722000008', NULL, 'What payment methods do you accept for international orders?', 'Low', 'Inquiring about payment options. Not yet specified product interest.', 'Other', 'Low', 'New', 'pending', 'pending', NOW() - INTERVAL '18 hours')
ON CONFLICT DO NOTHING;

-- Sample products for AI agent product lookup feature
INSERT INTO products (name, description, category, price, currency, stock_quantity, sku, specifications, is_active) VALUES
  ('iPhone 15 Pro 256GB', 'Latest Apple smartphone with A17 Pro chip, titanium design, 48MP camera system', 'Electronics', 1299.00, 'USD', 50, 'IPH15P-256-BLK', '{"color":"Black","storage":"256GB","warranty":"1 year"}', true),
  ('Samsung Galaxy S24 Ultra', 'Flagship Android phone with S Pen, 200MP camera, Snapdragon 8 Gen 3', 'Electronics', 1199.00, 'USD', 35, 'SAMS24U-512-BLK', '{"color":"Black","storage":"512GB","warranty":"1 year"}', true),
  ('Cotton Polo Shirts (Bulk)', 'Premium cotton polo shirts, ideal for corporate uniforms and wholesale orders', 'Apparel & Fabrics', 12.50, 'USD', 1000, 'POLO-COT-001', '{"sizes":"S-XXL","material":"100% Cotton","moq":"100 units"}', true),
  ('Denim Jeans - Straight Cut', 'High-quality denim jeans for men and women, available in bulk wholesale', 'Apparel & Fabrics', 18.00, 'USD', 500, 'JEANS-DEN-002', '{"sizes":"28-42","material":"Denim","moq":"50 units"}', true),
  ('Organic Green Coffee Beans', 'Premium Arabica coffee beans from Kenya, organic certified, fair trade', 'Agriculture & Food', 4.50, 'USD', 2000, 'COFF-ORG-001', '{"origin":"Kenya","type":"Arabica","certification":"Organic/Fair Trade"}', true),
  ('Diesel Generator 50kVA', 'Industrial-grade diesel generator for backup power, 50kVA capacity', 'Machinery & Parts', 8500.00, 'USD', 5, 'GEN-50KVA', '{"power":"50kVA","fuel":"Diesel","coverage":"Warranty included"}', true),
  ('Toyota Corolla Spare Parts Kit', 'Complete maintenance kit for Toyota Corolla 2018-2023 models', 'Auto Parts', 289.99, 'USD', 25, 'TOY-COR-KIT', '{"compatibility":"Toyota Corolla 2018-2023","contents":"Full kit"}', true),
  ('Organic Shea Butter Cream', 'Natural skincare cream with 100% organic shea butter, moisturizing', 'Health & Beauty', 15.99, 'USD', 200, 'SHEA-CREAM-01', '{"size":"500ml","ingredients":"100% Shea Butter","organic":true}', true),
  ('Cement (50kg Bags)', 'Portland cement grade 42.5N, 50kg bags, suitable for construction', 'Home & Construction', 8.50, 'USD', 5000, 'CEM-50KG', '{"grade":"42.5N","weight":"50kg","type":"Portland"}', true),
  ('Solar Street Lights 100W', 'Solar-powered LED street lights, 100W, with remote control and motion sensor', 'Home & Construction', 120.00, 'USD', 30, 'SOLAR-100W', '{"power":"100W","features":"Motion sensor, remote","battery":"12V"}', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. KNOWLEDGE BASE TABLE
-- Stores FAQs and product information updates for AI training
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

-- Sample knowledge base entries
INSERT INTO knowledge_base (category, question, answer, tags, priority, updated_by) VALUES
  ('general', 'What payment methods do you accept?', 'We accept M-Pesa, Wave, Airtel Money, MTN MoMo, Visa, and other major African & international payment options.', ARRAY['payment','methods','mpesa','wave','visa'], 10, 'system'),
  ('general', 'How long does shipping take?', 'Air freight: 7-15 days, Sea freight: 45-75 days. Full tracking available for all shipments.', ARRAY['shipping','delivery','time','tracking'], 9, 'system'),
  ('electronics', 'What electronics do you supply?', 'We supply smartphones, laptops, computers, TVs, cameras, electronic components, circuits, and various gadgets. Contact us with your specific needs.', ARRAY['electronics','phones','laptops','gadgets'], 8, 'system'),
  ('apparel', 'What apparel products are available?', 'We offer wholesale clothing including T-shirts, jeans, uniforms, fabrics, textiles, and garments. MOQ as low as 50 units.', ARRAY['clothing','apparel','fabric','uniform'], 8, 'system'),
  ('agriculture', 'What agricultural products do you handle?', 'We source fresh produce, grains, fruits, vegetables, meat, dairy, seafood, and packaged foods. Both fresh and frozen options available.', ARRAY['agriculture','food','farm','produce'], 8, 'system')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. AI INTERACTIONS LOG
-- Tracks conversations for continuous improvement
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
-- 10. TRIGGERS FOR UPDATED_AT
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

-- ============================================
-- 11. VIEW FOR ANALYTICS (optional convenience)
-- ============================================
CREATE OR REPLACE VIEW lead_analytics_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(CASE WHEN score = 'High' THEN 1 END) as high,
  COUNT(CASE WHEN score = 'Medium' THEN 1 END) as medium,
  COUNT(CASE WHEN score = 'Low' THEN 1 END) as low,
  COUNT(CASE WHEN status = 'Qualified' THEN 1 END) as qualified,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count
FROM leads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- 10. HANDOFF REQUESTS TABLE
-- Tracks requests to speak with a human agent
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
-- 12. GRANT PERMISSIONS (if using role-based access)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sokogate_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sokogate_user;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, verify:
-- \dt -- should show business_settings, leads, products, knowledge_base, ai_interactions, visitors, handoff_requests
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM products;
-- SELECT COUNT(*) FROM knowledge_base;
-- SELECT COUNT(*) FROM visitors;
-- SELECT * FROM business_settings;

-- ============================================
-- 14. UPGRADE INSTRUCTIONS (for existing installations)
-- ============================================
-- If you already have the old schema, run these ALTER statements to add new columns/tables:

-- Add new columns to leads table (if not exist)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company VARCHAR(200);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversation_stage VARCHAR(50) DEFAULT 'greeting' CHECK (conversation_stage IN ('greeting', 'needs_assessment', 'contact_capture', 'qualified', 'handoff_requested'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS handoff_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_conversation_stage ON leads(conversation_stage);
CREATE INDEX IF NOT EXISTS idx_leads_handoff_requested ON leads(handoff_requested) WHERE handoff_requested = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);

-- Create visitors table if not exists
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200),
  company VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  conversation_stage VARCHAR(50) DEFAULT 'greeting',
  visit_count INTEGER DEFAULT 1,
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_id ON visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitors_lead_id ON visitors(lead_id);

-- Create knowledge_base table if not exists
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

-- Insert default knowledge if empty
INSERT INTO knowledge_base (category, question, answer, tags, priority, updated_by)
SELECT 'general', 'What payment methods do you accept?', 'We accept M-Pesa, Wave, Airtel Money, MTN MoMo, Visa, and other major African & international payment options.', ARRAY['payment','methods'], 10, 'system'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_base WHERE question LIKE '%payment methods%');

-- Create ai_interactions table if not exists
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

-- Create handoff_requests table if not exists
CREATE TABLE IF NOT EXISTS handoff_requests (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  visitor_id VARCHAR(100),
  reason TEXT,
  urgency VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to VARCHAR(200),
  notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handoff_status ON handoff_requests(status);
CREATE INDEX IF NOT EXISTS idx_handoff_lead ON handoff_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_handoff_visitor ON handoff_requests(visitor_id);

