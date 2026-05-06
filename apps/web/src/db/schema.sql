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
  email VARCHAR(200),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  message TEXT,
  score VARCHAR(10) NOT NULL DEFAULT 'Medium' CHECK (score IN ('High', 'Medium', 'Low')),
  intent_summary TEXT,
  category VARCHAR(100),
  keyword_score VARCHAR(10) CHECK (keyword_score IN ('High', 'Medium', 'Low')),
  source VARCHAR(20) DEFAULT 'chat',
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_status VARCHAR(20) DEFAULT 'pending' CHECK (shipping_status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  shipping_tracking_number VARCHAR(100),
  status VARCHAR(20) DEFAULT 'New' CHECK (status IN ('New', 'Qualified', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(payment_status);
CREATE INDEX IF NOT EXISTS idx_leads_shipping_status ON leads(shipping_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp) WHERE whatsapp IS NOT NULL;

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

-- ============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. VIEW FOR ANALYTICS (optional convenience)
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
-- 7. GRANT PERMISSIONS (if using role-based access)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sokogate_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sokogate_user;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, verify:
-- \dt -- should show business_settings, leads
-- SELECT COUNT(*) FROM leads; -- should show 8
-- SELECT * FROM business_settings;
